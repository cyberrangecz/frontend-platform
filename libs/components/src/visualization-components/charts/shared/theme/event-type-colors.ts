import { PlatformEventType } from '@crczp/visualization-model';

/** Foreground and background colour pair for an audit event type. */
export interface EventColor {
    /** Foreground colour: icon glyph, header text, legend or feed dot. */
    readonly color: string;
    /** Paired badge or background fill. */
    readonly bgColor: string;
}

/**
 * Named semantic colour pairs shared across dashboard visualizations.
 * Each entry is a foreground/background pair intended for inline binding
 * (chips, badges, icons) — consumers pick by semantic name rather than
 * duplicating hex values.
 */
export const PALETTE = {
    green: { color: '#109345', bgColor: '#e8f5e9' },
    emerald: { color: '#27ae60', bgColor: '#e8f5e9' },
    red: { color: '#c0392b', bgColor: '#ffebee' },
    yellow: { color: '#f1c40f', bgColor: '#fffde7' },
    orange: { color: '#f39c12', bgColor: '#fff3e0' },
    deepOrange: { color: '#f38406', bgColor: '#eceff1' },
    blue: { color: '#2980b9', bgColor: '#e3f2fd' },
    navy: { color: '#2c3e50', bgColor: '#eceff1' },
    gray: { color: '#7f8c8d', bgColor: '#eceff1' },
    gold: { color: '#d4af37', bgColor: '#fcf3d6' },
    darkGray: { color: '#5c4444', bgColor: '#efebe9' },
} as const satisfies Record<string, EventColor>;

/**
 * Canonical audit event-type colour palette, shared by every dashboard visualization
 * (progress timeline, live event feed, legends). The single source of truth for event
 * colours: consumers resolve foreground and background fills from here rather than
 * defining their own.
 */
export const EVENT_TYPE_PALETTE: Partial<
    Record<PlatformEventType, EventColor>
> = {
    [PlatformEventType.CORRECT_ANSWER_SUBMITTED]: PALETTE.green,
    [PlatformEventType.WRONG_ANSWER_SUBMITTED]: PALETTE.red,
    [PlatformEventType.HINT_TAKEN]: PALETTE.yellow,
    [PlatformEventType.SOLUTION_DISPLAYED]: PALETTE.deepOrange,
    [PlatformEventType.ASSESSMENT_ANSWERS]: PALETTE.orange,
    [PlatformEventType.TRAINING_RUN_STARTED]: PALETTE.emerald,
    [PlatformEventType.TRAINING_RUN_RESUMED]: PALETTE.emerald,
    [PlatformEventType.TRAINING_RUN_ENDED]: PALETTE.navy,
    [PlatformEventType.LEVEL_STARTED]: PALETTE.blue,
    [PlatformEventType.LEVEL_COMPLETED]: PALETTE.blue,
};

/** Neutral fallback for event types without an explicit palette entry. */
export const FALLBACK_EVENT_COLOR: EventColor = PALETTE.gray;

/** Foreground and background colour pair for an event type, or a neutral fallback. */
export function eventTypeColors(type: PlatformEventType): EventColor {
    return EVENT_TYPE_PALETTE[type] ?? FALLBACK_EVENT_COLOR;
}

/** Foreground colour for an event type. */
export function eventTypeColor(type: PlatformEventType): string {
    return eventTypeColors(type).color;
}

/** Background fill for an event type. */
export function eventTypeBgColor(type: PlatformEventType): string {
    return eventTypeColors(type).bgColor;
}
