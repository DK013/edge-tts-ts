import { TRUSTED_CLIENT_TOKEN } from "./constants";

export const WIN_EPOCH = 11644473600;
export const S_TO_NS = 1e9;

export class DRM {
    static clock_skew_seconds: number = 0.0;

    static adj_clock_skew_seconds(skew_seconds: number): void {
        DRM.clock_skew_seconds += skew_seconds;
    }

    static get_unix_timestamp(): number {
        return Date.now() / 1000 + DRM.clock_skew_seconds;
    }

    static parse_rfc2616_date(dateStr: string): number | null {
        const timestamp = Date.parse(dateStr);
        return isNaN(timestamp) ? null : timestamp / 1000;
    }

    static async generate_sec_ms_gec(): Promise<string> {
        let ticks = DRM.get_unix_timestamp();
        ticks += WIN_EPOCH;
        ticks -= ticks % 300;
        ticks *= S_TO_NS / 100;

        const strToHash = `${ticks.toFixed(0)}${TRUSTED_CLIENT_TOKEN}`;
        return await DRM.sha256(strToHash);
    }

    private static async sha256(message: string): Promise<string> {
        const msgUint8 = new TextEncoder().encode(message);
        let hashBuffer: ArrayBuffer;

        if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
            hashBuffer = await window.crypto.subtle.digest('SHA-256', msgUint8);
        } else {
            // Node.js environment
            const crypto = await import('node:crypto');
            const hash = crypto.createHash('sha256');
            hash.update(message);
            return hash.digest('hex').toUpperCase();
        }

        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        return hashHex.toUpperCase();
    }

    static generate_muid(): string {
        const bytes = new Uint8Array(16);
        if (typeof window !== 'undefined' && window.crypto) {
            window.crypto.getRandomValues(bytes);
        } else {
            // Node.js
            try {
                // In Node, we can use crypto.randomBytes but it's not available in all versions
                // without import. Let's just use Math.random for fallback if needed, 
                // but usually we can use crypto.
                const crypto = require('node:crypto');
                return crypto.randomBytes(16).toString('hex').toUpperCase();
            } catch (e) {
                // fallback
                return Array.from(bytes).map(() => Math.floor(Math.random() * 256).toString(16).padStart(2, '0')).join('').toUpperCase();
            }
        }
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
    }

    static headers_with_muid(headers: Record<string, string>): Record<string, string> {
        const combined_headers = { ...headers };
        combined_headers["Cookie"] = `muid=${DRM.generate_muid()};`;
        return combined_headers;
    }
}
