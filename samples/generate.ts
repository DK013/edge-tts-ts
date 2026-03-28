import fs from "fs/promises";
import path from "path";
import { VoicesManager } from "../src/edge-tts/voices";
import { Communicate } from "../src/edge-tts/communicate";

async function main() {
    const dataPath = path.join(process.cwd(), "samples", "data.json");
    const audioRootDir = path.join(process.cwd(), "samples", "audio");

    // Load sample text data
    const data = JSON.parse(await fs.readFile(dataPath, "utf-8"));

    // Initialize VoicesManager to get all available voices
    console.log("Fetching voices...");
    const manager = await VoicesManager.create();
    
    // Group voices by language code (e.g., 'en', 'zh')
    const languageToVoices: Record<string, any[]> = {};
    for (const voice of manager.voices) {
        const langCode = voice.Locale.split("-")[0];
        if (!languageToVoices[langCode]) {
            languageToVoices[langCode] = [];
        }
        languageToVoices[langCode].push(voice);
    }

    // Iterate through each language in our data
    for (const [langCode, langInfo] of Object.entries(data) as [string, any][]) {
        const voices = languageToVoices[langCode] || [];
        if (voices.length === 0) {
            console.warn(`No voices found for language code: ${langCode}`);
            continue;
        }

        const langDir = path.join(audioRootDir, langInfo.language);
        await fs.mkdir(langDir, { recursive: true });

        console.log(`Processing ${langInfo.language} (${voices.length} voices)...`);

        for (const voice of voices) {
            const fileName = `${voice.ShortName}.mp3`;
            const filePath = path.join(langDir, fileName);

            // Skip if file already exists
            try {
                await fs.access(filePath);
                // console.log(`Skipping ${fileName} (already exists)`);
                continue;
            } catch {
                // File doesn't exist, proceed
            }

            try {
                process.stdout.write(`  Generating ${voice.ShortName}... `);
                const communicate = new Communicate(langInfo.text, { voice: voice.ShortName });
                
                const chunks: Uint8Array[] = [];
                for await (const chunk of communicate.stream()) {
                    if (chunk.type === "audio" && chunk.data) {
                        chunks.push(chunk.data);
                    }
                }

                if (chunks.length > 0) {
                    const totalLength = chunks.reduce((acc, val) => acc + val.length, 0);
                    const combined = new Uint8Array(totalLength);
                    let pos = 0;
                    for (const chunk of chunks) {
                        combined.set(chunk, pos);
                        pos += chunk.length;
                    }

                    await fs.writeFile(filePath, combined);
                    process.stdout.write("Done\n");
                } else {
                    process.stdout.write("Failed (No audio chunks received)\n");
                }
            } catch (error) {
                console.error(`\nError generating sample for ${voice.ShortName}:`, error);
            }
        }
    }

    console.log("\nSample generation complete.");
}

main().catch((err) => {
    console.error("Fatal error during sample generation:", err);
    process.exit(1);
});
