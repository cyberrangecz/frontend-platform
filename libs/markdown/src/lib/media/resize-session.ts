import { clampWidth, MediaSizeLimits } from './media-size-limits';

/** Width change of one arrow key press, in CSS px. */
const KEY_STEP_PIXELS = 16;
/** Width change of one arrow key press while Shift is held, in CSS px. */
const KEY_STEP_LARGE_PIXELS = 64;

/** The width a resize started from, the limits it keeps to and the width it has reached. */
export interface ResizeSession {
    readonly start: number;
    readonly limits: MediaSizeLimits;
    readonly current: number;
}

/** A resize starting at a width, rounded and brought into the limits. */
export function startSession(width: number, limits: MediaSizeLimits): ResizeSession {
    const start = clampWidth(width, limits);
    return { start, limits, current: start };
}

/** The session having reached a width, brought into its limits. */
export function moveSessionTo(session: ResizeSession, width: number): ResizeSession {
    return { ...session, current: clampWidth(width, session.limits) };
}

/**
 * The width a pointer drag reaches: the corner follows the pointer along the card's locked
 * aspect ratio, so the width changes by the pointer's movement projected onto the diagonal of
 * the card. With no known height per width only the horizontal movement counts.
 */
export function widthAfterPointer(session: ResizeSession, deltaX: number, deltaY: number, heightPerWidth: number): number {
    return session.start + (deltaX + deltaY * heightPerWidth) / (1 + heightPerWidth ** 2);
}

/**
 * The width a key takes a session to: the arrow keys step it, Shift making the step larger, and
 * Home and End go to the limits. Null when the key moves nothing, which includes End while the
 * maximum is open.
 */
export function widthAfterKey(session: ResizeSession, key: string, large: boolean): number | null {
    const step = large ? KEY_STEP_LARGE_PIXELS : KEY_STEP_PIXELS;
    switch (key) {
        case 'ArrowRight':
        case 'ArrowUp':
            return session.current + step;
        case 'ArrowLeft':
        case 'ArrowDown':
            return session.current - step;
        case 'Home':
            return session.limits.minimum;
        case 'End':
            return Number.isFinite(session.limits.maximum) ? session.limits.maximum : null;
        default:
            return null;
    }
}
