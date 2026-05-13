import { HintBasic } from '@crczp/training-model';
import { BarKey, LevelId, TrainingRunId } from './ids.types';

/**
 * The event kinds that render as overlay icons on top of bars.
 *
 * The discriminator drives icon, background color, and Z-order
 * (see `config/event.config.ts`).
 */
export type EventKind =
    | 'WRONG_ANSWER'
    | 'CORRECT_ANSWER'
    | 'HINT_TAKEN'
    | 'SOLUTION_DISPLAYED'
    | 'ASSESSMENT_ANSWERS'
    | 'TRAINING_RUN_STARTED'
    | 'TRAINING_RUN_RESUMED'
    | 'TRAINING_RUN_ENDED';

export const EVENT_KINDS: readonly EventKind[] = [
    'WRONG_ANSWER',
    'CORRECT_ANSWER',
    'HINT_TAKEN',
    'SOLUTION_DISPLAYED',
    'ASSESSMENT_ANSWERS',
    'TRAINING_RUN_STARTED',
    'TRAINING_RUN_RESUMED',
    'TRAINING_RUN_ENDED',
] as const;

/**
 * Raw event row as produced by the events source (after entity resolution).
 *
 * Each row carries the discriminator, the natural composite key, the
 * timestamp, and per-kind detail.
 *
 *  - `answer`: the answer text on WRONG/CORRECT.
 *  - `hintTitle`: the short label on HINT_TAKEN (always present on hint rows).
 *  - `hint`: the resolved `HintBasic` entity — only set after resolution
 *    succeeds. Note that `HintBasic` does not include `content`; full hint
 *    content for the shift-hold tooltip expansion requires a separate path
 *    (see open item in `data-flow-decisions.md`).
 */
export interface EventRow {
    readonly kind: EventKind;
    readonly key: BarKey;
    readonly trainingRunId: TrainingRunId;
    readonly levelId: LevelId;
    readonly timestamp: number;
    readonly answer: string | null;
    readonly hintTitle: string | null;
    readonly hint: HintBasic | null;
}

/**
 * Per-event view-model slice. Bucketed under the bar it sits on
 * (`{ [barKey]: EventVm[] }` shape on the live view-model).
 */
export interface EventVm {
    readonly kind: EventKind;
    readonly rowIndex: number;
    readonly timestamp: number;
    /** Short tooltip label (always present). */
    readonly tooltipLabel: string;
    /** Long detail surfaced when the user holds shift. `null` when none. */
    readonly tooltipDetail: string | null;
}
