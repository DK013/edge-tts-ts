#!/usr/bin/env node
import { Command } from "commander";
import * as fs from "fs";
import { Communicate } from "../edge-tts/communicate";
import { playAudio } from "../edge-playback/play";

export function createPlaybackCommand() {
    const program = new Command();

    program
        .name("edge-playback")
        .description("Microsoft Edge TTS Playback CLI")
        .option("-t, --text <text>", "Text to synthesize")
        .option("-f, --file <file>", "File to read text from")
        .option("-v, --voice <voice>", "Voice to use", "en-US-EmmaMultilingualNeural")
        .option("--rate <rate>", "Rate of speech", "+0%")
        .option("--volume <volume>", "Volume of speech", "+0%")
        .option("--pitch <pitch>", "Pitch of speech", "+0Hz")
        .action(async (options) => {
            let text = options.text;
            if (options.file) {
                text = fs.readFileSync(options.file, "utf-8");
            }

            if (!text) {
                console.error("Text or file is required");
                process.exit(1);
            }

            const comm = new Communicate(text, {
                voice: options.voice,
                rate: options.rate,
                volume: options.volume,
                pitch: options.pitch,
            });

            const audioChunks: Uint8Array[] = [];
            for await (const chunk of comm.stream()) {
                if (chunk.type === "audio") {
                    audioChunks.push(chunk.data);
                }
            }

            const totalLength = audioChunks.reduce((acc, c) => acc + c.length, 0);
            const audioData = new Uint8Array(totalLength);
            let offset = 0;
            for (const chunk of audioChunks) {
                audioData.set(chunk, offset);
                offset += chunk.length;
            }

            try {
                console.log("Playing audio...");
                await playAudio(audioData);
            } catch (err) {
                // error already logged in playAudio
            }
        });

    return program;
}

if (require.main === module) {
    createPlaybackCommand().parse(process.argv);
}
