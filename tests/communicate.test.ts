import { describe, it, expect } from "vitest";
import { Communicate } from "../src/edge-tts/communicate";

describe("Communicate", () => {
    it("should stream audio chunks", async () => {
        const comm = new Communicate("Hello world", { voice: "en-US-EmmaMultilingualNeural" });
        let audioReceived = false;
        let wordBoundaries = 0;

        for await (const chunk of comm.stream()) {
            if (chunk.type === "audio") {
                audioReceived = true;
                expect(chunk.data.length).toBeGreaterThan(0);
            } else if (chunk.type === "SentenceBoundary" || chunk.type === "WordBoundary") {
                wordBoundaries++;
            }
        }

        expect(audioReceived).toBe(true);
        expect(wordBoundaries).toBeGreaterThan(0);
    }, 20000); // 20s timeout
});
