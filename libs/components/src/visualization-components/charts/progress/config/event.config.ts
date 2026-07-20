import { PlatformEventType } from '@crczp/visualization-model';
import { eventTypeColors, PALETTE } from '../../shared';
import { EventKind, EVENT_KINDS } from '../types/event.types';

/**
 * Per-event-kind icon descriptor used by the event-icons option-builder.
 *
 *  - `icon`    — Material Icons ligature
 *  - `color`   — foreground icon color
 *  - `bgColor` — circular badge background
 */
export interface EventIconDescriptor {
    readonly icon: string;
    readonly color: string;
    readonly bgColor: string;
}

/** Material Icons ligature per event kind. */
const EVENT_KIND_ICON: Record<EventKind, string> = {
    ASSESSMENT_ANSWERS: 'question_answer',
    CORRECT_ANSWER: 'check_circle',
    WRONG_ANSWER: 'cancel',
    HINT_TAKEN: 'lightbulb',
    SOLUTION_DISPLAYED: 'visibility',
    TRAINING_RUN_STARTED: 'login',
    TRAINING_RUN_RESUMED: 'login',
    TRAINING_RUN_ENDED: 'logout',
};

/** Maps the progress-local event kind to its canonical platform event type. */
const EVENT_KIND_TO_TYPE: Record<EventKind, PlatformEventType> = {
    ASSESSMENT_ANSWERS: PlatformEventType.ASSESSMENT_ANSWERS,
    CORRECT_ANSWER: PlatformEventType.CORRECT_ANSWER_SUBMITTED,
    WRONG_ANSWER: PlatformEventType.WRONG_ANSWER_SUBMITTED,
    HINT_TAKEN: PlatformEventType.HINT_TAKEN,
    SOLUTION_DISPLAYED: PlatformEventType.SOLUTION_DISPLAYED,
    TRAINING_RUN_STARTED: PlatformEventType.TRAINING_RUN_STARTED,
    TRAINING_RUN_RESUMED: PlatformEventType.TRAINING_RUN_RESUMED,
    TRAINING_RUN_ENDED: PlatformEventType.TRAINING_RUN_ENDED,
};

/**
 * Per-event-kind icon descriptor. Foreground and background colours are resolved from
 * the shared event-type palette; only the icon glyph and the kind-to-type mapping are
 * progress-specific.
 */
export const EVENT_ICON_CATALOG: Readonly<Record<EventKind, EventIconDescriptor>> = Object.fromEntries(
    EVENT_KINDS.map((kind): [EventKind, EventIconDescriptor] => {
        const colors = eventTypeColors(EVENT_KIND_TO_TYPE[kind]);
        return [kind, { icon: EVENT_KIND_ICON[kind], color: colors.color, bgColor: colors.bgColor }];
    }),
) as Record<EventKind, EventIconDescriptor>;

/**
 * Per-event-kind Z-order index. Higher = drawn in front.
 *
 * Rationale: semantically informative icons (Solution, Hint) surface above
 * duplicates when clustered on the same timestamp.
 */
/** Background fill for both run-boundary cap half-pills. */
export const RUN_CAP_FILL_COLOR = PALETTE.gray.bgColor;

/** Foreground colour of the glyph drawn inside the start cap. */
export const RUN_START_CAP_GLYPH_COLOR = PALETTE.emerald.color;

/** Foreground colour of the glyph drawn inside the end cap. */
export const RUN_END_CAP_GLYPH_COLOR = PALETTE.blue.color;

export const EVENT_Z_ORDER: Readonly<Record<EventKind, number>> = {
    TRAINING_RUN_ENDED: 70,
    SOLUTION_DISPLAYED: 60,
    HINT_TAKEN: 50,
    WRONG_ANSWER: 40,
    CORRECT_ANSWER: 30,
    ASSESSMENT_ANSWERS: 20,
    TRAINING_RUN_RESUMED: 10,
    TRAINING_RUN_STARTED: 10,
} as const;
