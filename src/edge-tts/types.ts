export interface Voice {
    Name: string;
    ShortName: string;
    Gender: string;
    Locale: string;
    SuggestedCodec: string;
    FriendlyName: string;
    Status: string;
    VoiceTag: {
        ContentCategories: string[];
        VoicePersonalities: string[];
    };
}

export interface VoicesManagerVoice extends Voice {
    Language: string;
}

export interface VoicesManagerFind {
    Name?: string;
    ShortName?: string;
    Gender?: string;
    Locale?: string;
    Language?: string;
}

export interface TTSConfig {
    voice: string;
    rate: string;
    volume: string;
    pitch: string;
    boundary: "WordBoundary" | "SentenceBoundary";
}

export interface CommunicateState {
    partial_text: Uint8Array;
    offset_compensation: number;
    last_duration_offset: number;
    stream_was_called: boolean;
    chunk_audio_bytes: number;
    cumulative_audio_bytes: number;
}

// Re-using bool as boolean in types.ts for consistency if I want, but boolean is better TS.
export type TTSChunk = {
    type: "WordBoundary" | "SentenceBoundary";
    offset: number;
    duration: number;
    text: string;
} | {
    type: "audio";
    data: Uint8Array;
};

export interface Subtitle {
    index: number | null;
    start: number; // in seconds
    end: number;   // in seconds
    content: string;
}
