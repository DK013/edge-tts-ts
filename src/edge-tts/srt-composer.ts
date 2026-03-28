import { Subtitle } from "./types";

export function timedeltaToSrtTimestamp(seconds: number): string {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const msecs = Math.floor((seconds % 1) * 1000);
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${msecs.toString().padStart(3, '0')}`;
}

export function makeLegalContent(content: string): string {
    if (content && content[0] !== "\n" && !content.includes("\n\n")) {
        return content;
    }
    return content.replace(/\n\n+/g, "\n").trim();
}

export function subtitleToSrt(sub: Subtitle, eol: string = "\n"): string {
    const content = makeLegalContent(sub.content).replace(/\n/g, eol);
    return `${sub.index || 0}${eol}${timedeltaToSrtTimestamp(sub.start)} --> ${timedeltaToSrtTimestamp(sub.end)}${eol}${content}${eol}${eol}`;
}

export function compose(
    subtitles: Subtitle[],
    options: { reindex?: boolean; startIndex?: number; eol?: string } = {}
): string {
    let subs = [...subtitles];
    if (options.reindex !== false) {
        subs.sort((a, b) => a.start - b.start || a.end - b.end);
        const startIndex = options.startIndex ?? 1;
        subs = subs.map((sub, i) => ({ ...sub, index: startIndex + i }));
    }
    const eol = options.eol || "\n";
    return subs.map(sub => subtitleToSrt(sub, eol)).join("");
}
