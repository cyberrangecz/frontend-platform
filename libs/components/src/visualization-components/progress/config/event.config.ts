import { EventKind } from '../types/event.types';

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

export const EVENT_ICON_CATALOG: Readonly<Record<EventKind, EventIconDescriptor>> = {
    ASSESSMENT_ANSWERS: { icon: 'question_answer', color: '#f39c12', bgColor: '#fff3e0' },
    CORRECT_ANSWER: { icon: 'check_circle', color: '#27ae60', bgColor: '#e8f5e9' },
    WRONG_ANSWER: { icon: 'cancel', color: '#c0392b', bgColor: '#ffebee' },
    HINT_TAKEN: { icon: 'lightbulb', color: '#f1c40f', bgColor: '#fffde7' },
    SOLUTION_DISPLAYED: { icon: 'visibility', color: '#f38406', bgColor: '#eceff1' },
    TRAINING_RUN_STARTED: { icon: 'login', color: '#27ae60', bgColor: '#e8f5e9' },
    TRAINING_RUN_RESUMED: { icon: 'login', color: '#27ae60', bgColor: '#e8f5e9' },
    TRAINING_RUN_ENDED: { icon: 'logout', color: '#2c3e50', bgColor: '#eceff1' },
} as const;

/**
 * Per-event-kind Z-order index. Higher = drawn in front.
 *
 * Rationale: semantically informative icons (Solution, Hint) surface above
 * duplicates when clustered on the same timestamp.
 */
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
