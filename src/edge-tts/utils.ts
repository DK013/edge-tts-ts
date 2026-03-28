export function removeIncompatibleCharacters(str: string): string {
    const chars = Array.from(str);
    for (let i = 0; i < chars.length; i++) {
        const code = chars[i].charCodeAt(0);
        if ((code >= 0 && code <= 8) || (code >= 11 && code <= 12) || (code >= 14 && code <= 31)) {
            chars[i] = " ";
        }
    }
    return chars.join("");
}

export function connectId(): string {
    // Generate a random hex string of length 32
    const bytes = new Uint8Array(16);
    if (typeof crypto !== 'undefined') {
        crypto.getRandomValues(bytes);
    } else {
        // Fallback for Node if crypto is not globally available
        for (let i = 0; i < 16; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join("");
}

export function dateToString(): string {
    // Mon Mar 28 2026 08:24:00 GMT+0000 (Coordinated Universal Time)
    const date = new Date();
    const parts = date.toUTCString().split(" ");
    // Sun, 28 Mar 2026 08:24:00 GMT -> Fri Feb 14 2025 10:14:14 GMT+0000 (Coordinated Universal Time)
    // Actually, JS Date.toString() is usually enough, but let's try to match exactly.
    // Python version: time.strftime("%a %b %d %Y %H:%M:%S GMT+0000 (Coordinated Universal Time)", time.gmtime())
    
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    
    const d = days[date.getUTCDay()];
    const m = months[date.getUTCMonth()];
    const day = date.getUTCDate().toString().padStart(2, '0');
    const year = date.getUTCFullYear();
    const time = date.getUTCHours().toString().padStart(2, '0') + ":" + 
                 date.getUTCMinutes().toString().padStart(2, '0') + ":" + 
                 date.getUTCSeconds().toString().padStart(2, '0');
                 
    return `${d} ${m} ${day} ${year} ${time} GMT+0000 (Coordinated Universal Time)`;
}

export function escapeXml(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case '\'': return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

export function unescapeXml(safe: string): string {
    return safe.replace(/&lt;|&gt;|&amp;|&apos;|&quot;/g, (c) => {
        switch (c) {
            case '&lt;': return '<';
            case '&gt;': return '>';
            case '&amp;': return '&';
            case '&apos;': return '\'';
            case '&quot;': return '"';
            default: return c;
        }
    });
}

export function* splitTextByByteLength(text: string, byteLength: number): Generator<string> {
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    let data = encoder.encode(text);

    while (data.length > byteLength) {
        let splitAt = findLastNewlineOrSpaceWithinLimit(data, byteLength);
        if (splitAt < 0) {
            splitAt = findSafeUtf8SplitPoint(data, byteLength);
        }
        splitAt = adjustSplitPointForXmlEntity(data, splitAt);

        if (splitAt <= 0) {
            // fallback to prevent infinite loop
            splitAt = 1;
        }

        const chunk = data.slice(0, splitAt);
        const chunkStr = decoder.decode(chunk).trim();
        if (chunkStr) {
            yield chunkStr;
        }
        data = data.slice(splitAt);
    }

    const remaining = decoder.decode(data).trim();
    if (remaining) {
        yield remaining;
    }
}

function findLastNewlineOrSpaceWithinLimit(data: Uint8Array, limit: number): number {
    const space = 32; // ' '
    const newline = 10; // '\n'
    let last = -1;
    for (let i = 0; i < limit; i++) {
        if (data[i] === newline) last = i;
        else if (data[i] === space && last === -1) {
            // only use space if no newline found yet? 
            // actually Python uses rfind, so it finds the LAST newline or space.
        }
    }
    // Re-implementing rfind logic
    for (let i = limit - 1; i >= 0; i--) {
        if (data[i] === newline) return i;
    }
    for (let i = limit - 1; i >= 0; i--) {
        if (data[i] === space) return i;
    }
    return -1;
}

function findSafeUtf8SplitPoint(data: Uint8Array, limit: number): number {
    let splitAt = limit;
    const decoder = new TextDecoder("utf-8", { fatal: true });
    while (splitAt > 0) {
        try {
            decoder.decode(data.slice(0, splitAt));
            return splitAt;
        } catch (e) {
            splitAt--;
        }
    }
    return splitAt;
}

function adjustSplitPointForXmlEntity(data: Uint8Array, splitAt: number): number {
    const amp = 38; // '&'
    const semi = 59; // ';'
    let current = splitAt;
    
    // check if there is an '&' before splitAt that is not closed by ';' before splitAt
    const sub = data.slice(0, current);
    const lastAmp = sub.lastIndexOf(amp);
    if (lastAmp !== -1) {
        const lastSemi = sub.lastIndexOf(semi);
        if (lastSemi < lastAmp) {
            // Unterminated entity
            return lastAmp;
        }
    }
    return current;
}
