import { prErr } from "./util";

/**
 * Play audio data (Uint8Array) in either Node.js or Browser environment.
 */
export async function playAudio(audioData: Uint8Array): Promise<void> {
    if (typeof window !== "undefined" && typeof Blob !== "undefined") {
        // Browser environment
        const blob = new Blob([audioData as any], { type: "audio/mpeg" });
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        
        return new Promise((resolve, reject) => {
            audio.onended = () => {
                URL.revokeObjectURL(url);
                resolve();
            };
            audio.onerror = (e) => {
                prErr("Audio playback error");
                reject(e);
            };
            audio.src = url;
            audio.play().then(resolve).catch(reject);
        });
    } else {
        // Node.js environment
        const fs = await import("fs");
        const path = await import("path");
        const os = await import("os");
        // @ts-ignore
        const soundPlay = await import("sound-play");

        const tempDir = os.tmpdir();
        const tempFile = path.join(tempDir, `edge_tts_${Date.now()}.mp3`);
        fs.writeFileSync(tempFile, Buffer.from(audioData));

        try {
            // @ts-ignore
            await soundPlay.default.play(tempFile);
        } catch (err) {
            prErr(`Failed to play audio: ${err}`);
            throw err;
        } finally {
            try {
                fs.unlinkSync(tempFile);
            } catch (e) {
                // Ignore unlink errors
            }
        }
    }
}
