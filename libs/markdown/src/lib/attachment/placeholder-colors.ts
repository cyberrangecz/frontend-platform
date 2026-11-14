/** The two gradient stops of a placeholder poster. */
export interface PlaceholderColors {
    readonly from: string;
    readonly to: string;
}

const HUE_SPAN = 360;
const COMPANION_HUE_OFFSET = 60;

/** Derives the same two colours from a given hash every time, so a file keeps its look across sessions. */
export function placeholderColorsOf(hash: string): PlaceholderColors {
    let seed = 2166136261;
    for (let index = 0; index < hash.length; index++) {
        seed = Math.imul(seed ^ hash.charCodeAt(index), 16777619) >>> 0;
    }
    const hue = seed % HUE_SPAN;
    return {
        from: `hsl(${hue} 55% 45%)`,
        to: `hsl(${(hue + COMPANION_HUE_OFFSET) % HUE_SPAN} 55% 30%)`,
    };
}
