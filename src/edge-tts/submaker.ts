import { compose } from "./srt-composer";
import { Subtitle, TTSChunk } from "./types";

export class SubMaker {
    cues: Subtitle[] = [];
    type: string | null = null;

    feed(msg: TTSChunk): void {
        if (msg.type !== "WordBoundary" && msg.type !== "SentenceBoundary") {
            throw new Error("Invalid message type, expected 'WordBoundary' or 'SentenceBoundary'.");
        }

        if (this.type === null) {
            this.type = msg.type;
        } else if (this.type !== msg.type) {
            throw new Error(`Expected message type '${this.type}', but got '${msg.type}'.`);
        }

        // Python version: timedelta(microseconds=msg["offset"] / 10)
        // 1 tick = 100 ns = 0.1 microseconds
        // So offset in ticks / 10 = microseconds.
        // Microseconds / 1,000,000 = seconds.
        // So offset in ticks / 10,000,000 = seconds.
        this.cues.push({
            index: this.cues.length + 1,
            start: msg.offset / 10000000,
            end: (msg.offset + msg.duration) / 10000000,
            content: msg.text,
        });
    }

    getSrt(): string {
        return compose(this.cues);
    }

    toString(): string {
        return this.getSrt();
    }
}
