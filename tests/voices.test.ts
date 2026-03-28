import { describe, it, expect } from "vitest";
import { VoicesManager } from "../src/edge-tts/voices";

describe("VoicesManager", () => {
    it("should list and find voices", async () => {
        const manager = await VoicesManager.create();
        expect(manager.voices.length).toBeGreaterThan(0);
        
        const englishVoices = manager.find({ Language: "en" });
        expect(englishVoices.length).toBeGreaterThan(0);
        expect(englishVoices[0].Locale).toContain("en-");
    });
});
