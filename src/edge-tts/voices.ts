import { VOICE_HEADERS, VOICE_LIST, SEC_MS_GEC_VERSION } from "./constants";
import { DRM } from "./drm";
import { Voice, VoicesManagerVoice, VoicesManagerFind } from "./types";

export async function listVoices(options: { proxy?: string } = {}): Promise<Voice[]> {
    const url = new URL(VOICE_LIST);
    url.searchParams.set("Sec-MS-GEC", await DRM.generate_sec_ms_gec());
    url.searchParams.set("Sec-MS-GEC-Version", SEC_MS_GEC_VERSION);

    const headers = DRM.headers_with_muid(VOICE_HEADERS);
    
    // Use native fetch (available in modern Node and Browser)
    const response = await fetch(url.toString(), {
        headers,
    });

    if (!response.ok) {
        if (response.status === 403) {
            // Clock skew handling
            const dateHeader = response.headers.get("Date");
            if (dateHeader) {
                const serverTime = DRM.parse_rfc2616_date(dateHeader);
                if (serverTime) {
                    DRM.adj_clock_skew_seconds(serverTime - DRM.get_unix_timestamp());
                    // Retry once
                    return listVoices(options);
                }
            }
        }
        throw new Error(`Failed to list voices: ${response.statusText}`);
    }

    const data: Voice[] = await response.json();

    for (const voice of data) {
        if (!voice.VoiceTag) {
            voice.VoiceTag = { ContentCategories: [], VoicePersonalities: [] };
        }
    }

    return data;
}

export class VoicesManager {
    voices: VoicesManagerVoice[] = [];
    private calledCreate: boolean = false;

    static async create(customVoices?: Voice[]): Promise<VoicesManager> {
        const manager = new VoicesManager();
        const voices = customVoices || (await listVoices());
        manager.voices = voices.map((voice) => ({
            ...voice,
            Language: voice.Locale.split("-")[0],
        }));
        manager.calledCreate = true;
        return manager;
    }

    find(criteria: VoicesManagerFind): VoicesManagerVoice[] {
        if (!this.calledCreate) {
            throw new Error("VoicesManager.find() called before VoicesManager.create()");
        }

        return this.voices.filter((voice) => {
            for (const [key, value] of Object.entries(criteria)) {
                if (voice[key as keyof VoicesManagerVoice] !== value) {
                    return false;
                }
            }
            return true;
        });
    }
}
