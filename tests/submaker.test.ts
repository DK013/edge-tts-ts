import { describe, it, expect } from "vitest";
import { SubMaker } from "../src/edge-tts/submaker";

describe("SubMaker", () => {
    it("should generate SRT from chunks", () => {
        const subMaker = new SubMaker();
        subMaker.feed({
            type: "WordBoundary",
            offset: 10000000, // 1s
            duration: 10000000, // 1s
            text: "Hello",
        });
        subMaker.feed({
            type: "WordBoundary",
            offset: 25000000, // 2.5s
            duration: 5000000, // 0.5s
            text: "World",
        });

        const srt = subMaker.getSrt();
        expect(srt).toContain("00:00:01,000 --> 00:00:02,000");
        expect(srt).toContain("Hello");
        expect(srt).toContain("00:00:02,500 --> 00:00:03,000");
        expect(srt).toContain("World");
    });
});
