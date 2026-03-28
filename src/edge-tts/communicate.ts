import WebSocket from "isomorphic-ws";
import { DEFAULT_VOICE, SEC_MS_GEC_VERSION, TICKS_PER_SECOND, MP3_BITRATE_BPS, WSS_HEADERS, WSS_URL } from "./constants";
import { DRM } from "./drm";
import { TTSChunk, TTSConfig, CommunicateState } from "./types";
import { connectId, dateToString, escapeXml, removeIncompatibleCharacters, splitTextByByteLength, unescapeXml } from "./utils";

export class Communicate {
    private tts_config: TTSConfig;
    private texts: string[];
    private state: CommunicateState;

    constructor(
        text: string,
        options: {
            voice?: string;
            rate?: string;
            volume?: string;
            pitch?: string;
            boundary?: "WordBoundary" | "SentenceBoundary";
        } = {}
    ) {
        this.tts_config = {
            voice: options.voice || DEFAULT_VOICE,
            rate: options.rate || "+0%",
            volume: options.volume || "+0%",
            pitch: options.pitch || "+0Hz",
            boundary: options.boundary || "SentenceBoundary",
        };

        const cleanedText = removeIncompatibleCharacters(text);
        const escapedText = escapeXml(cleanedText);
        this.texts = Array.from(splitTextByByteLength(escapedText, 4096));

        this.state = {
            partial_text: new Uint8Array(), // Not really used this way in TS
            offset_compensation: 0,
            last_duration_offset: 0,
            stream_was_called: false,
            chunk_audio_bytes: 0,
            cumulative_audio_bytes: 0,
        };
    }

    private mkssml(escaped_text: string): string {
        return (
            `<speak version='1.0' xmlns='http://www.w3.org/2001/10/synthesis' xml:lang='en-US'>` +
            `<voice name='${this.tts_config.voice}'>` +
            `<prosody pitch='${this.tts_config.pitch}' rate='${this.tts_config.rate}' volume='${this.tts_config.volume}'>` +
            `${escaped_text}` +
            `</prosody>` +
            `</voice>` +
            `</speak>`
        );
    }

    private ssml_headers_plus_data(request_id: string, timestamp: string, ssml: string): string {
        return (
            `X-RequestId:${request_id}\r\n` +
            `Content-Type:application/ssml+xml\r\n` +
            `X-Timestamp:${timestamp}Z\r\n` +
            `Path:ssml\r\n\r\n` +
            `${ssml}`
        );
    }

    private parseMetadata(data: string): TTSChunk {
        const metadata = JSON.parse(data);
        for (const meta_obj of metadata.Metadata) {
            const meta_type = meta_obj.Type;
            if (meta_type === "WordBoundary" || meta_type === "SentenceBoundary") {
                const current_offset = meta_obj.Data.Offset + this.state.offset_compensation;
                const current_duration = meta_obj.Data.Duration;
                return {
                    type: meta_type,
                    offset: current_offset,
                    duration: current_duration,
                    text: unescapeXml(meta_obj.Data.text.Text),
                };
            }
        }
        throw new Error("No valid metadata found");
    }

    private compensateOffset(): void {
        this.state.cumulative_audio_bytes += this.state.chunk_audio_bytes;
        this.state.offset_compensation = Math.floor(
            (this.state.cumulative_audio_bytes * 8 * TICKS_PER_SECOND) / MP3_BITRATE_BPS
        );
        this.state.chunk_audio_bytes = 0;
    }

    async *stream(): AsyncGenerator<TTSChunk, void, unknown> {
        if (this.state.stream_was_called) {
            throw new Error("stream can only be called once.");
        }
        this.state.stream_was_called = true;

        for (const textChunk of this.texts) {
            this.state.chunk_audio_bytes = 0;
            yield* this._stream(textChunk);
        }
    }

    private async *_stream(textChunk: string): AsyncGenerator<TTSChunk, void, unknown> {
        const requestId = connectId();
        const url = `${WSS_URL}&ConnectionId=${requestId}&Sec-MS-GEC=${await DRM.generate_sec_ms_gec()}&Sec-MS-GEC-Version=${SEC_MS_GEC_VERSION}`;
        
        const headers = DRM.headers_with_muid(WSS_HEADERS);
        
        const ws = new WebSocket(url, {
            headers,
        });
        ws.binaryType = "arraybuffer";

        let resolveOpen: () => void;
        let rejectOpen: (reason: any) => void;
        const openPromise = new Promise<void>((res, rej) => {
            resolveOpen = res;
            rejectOpen = rej;
        });

        ws.onopen = () => resolveOpen();
        ws.onerror = (err) => rejectOpen(err);

        await openPromise;

        const sendCommand = () => {
            const word_boundary = this.tts_config.boundary === "WordBoundary";
            const wd = word_boundary ? "true" : "false";
            const sq = !word_boundary ? "true" : "false";
            ws.send(
                `X-Timestamp:${dateToString()}\r\n` +
                `Content-Type:application/json; charset=utf-8\r\n` +
                `Path:speech.config\r\n\r\n` +
                `{"context":{"synthesis":{"audio":{"metadataoptions":{` +
                `"sentenceBoundaryEnabled":"${sq}","wordBoundaryEnabled":"${wd}"` +
                `},"outputFormat":"audio-24khz-48kbitrate-mono-mp3"}}}}`
            );
        };

        const sendSSML = () => {
            ws.send(
                this.ssml_headers_plus_data(
                    connectId(),
                    dateToString(),
                    this.mkssml(textChunk)
                )
            );
        };

        sendCommand();
        sendSSML();

        const queue: (TTSChunk | "DONE" | "ERROR")[] = [];
        let resolveNext: (() => void) | null = null;
        let error: any = null;

        ws.onmessage = (event) => {
            if (typeof event.data === "string") {
                const headEnd = event.data.indexOf("\r\n\r\n");
                const headersStr = event.data.substring(0, headEnd);
                const body = event.data.substring(headEnd + 4);
                
                const headers: Record<string, string> = {};
                headersStr.split("\r\n").forEach(line => {
                    const [k, v] = line.split(":", 2);
                    if (k) headers[k.trim()] = v ? v.trim() : "";
                });

                const path = headers["Path"];
                if (path === "audio.metadata") {
                    queue.push(this.parseMetadata(body));
                } else if (path === "turn.end") {
                    this.compensateOffset();
                    queue.push("DONE");
                }
            } else if (event.data instanceof ArrayBuffer) {
                const view = new DataView(event.data);
                const headerLength = view.getUint16(0);
                const headersData = new TextDecoder().decode(event.data.slice(2, 2 + headerLength));
                const audioData = new Uint8Array(event.data.slice(2 + headerLength));


                const headers: Record<string, string> = {};
                headersData.split("\r\n").forEach(line => {
                    const [k, v] = line.split(":", 2);
                    if (k) headers[k.trim()] = v ? v.trim() : "";
                });

                if (headers["Path"] === "audio") {
                    if (audioData.length > 0) {
                        this.state.chunk_audio_bytes += audioData.length;
                        queue.push({ type: "audio", data: audioData });
                    }
                }
            }
            if (resolveNext) resolveNext();
        };

        ws.onerror = (err) => {
            error = err;
            queue.push("ERROR");
            if (resolveNext) resolveNext();
        };

        ws.onclose = () => {
            if (!queue.includes("DONE") && !queue.includes("ERROR")) {
                queue.push("DONE");
            }
            if (resolveNext) resolveNext();
        };

        while (true) {
            if (queue.length === 0) {
                await new Promise<void>(res => { resolveNext = res; });
                resolveNext = null;
            }

            const item = queue.shift();
            if (item === "DONE") break;
            if (item === "ERROR") throw error || new Error("WebSocket error");
            if (item) yield item as TTSChunk;
        }
        ws.close();
    }
}
