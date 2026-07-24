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
 * Event kinds whose roundels the user can toggle through the event legend.
 * The three `TRAINING_RUN_*` kinds are excluded: started/ended are consumed
 * by the run-caps builder and resumed is an unconditional roundel.
 */
export const EVENT_KINDS_FILTERABLE: readonly EventKind[] = [
    'CORRECT_ANSWER',
    'WRONG_ANSWER',
    'HINT_TAKEN',
    'SOLUTION_DISPLAYED',
    'ASSESSMENT_ANSWERS',
] as const;

/** Human-readable legend label per event kind. */
export const EVENT_KIND_LABELS: Record<EventKind, string> = {
    CORRECT_ANSWER: 'Correct answer',
    WRONG_ANSWER: 'Wrong answer',
    HINT_TAKEN: 'Hint',
    SOLUTION_DISPLAYED: 'Solution',
    ASSESSMENT_ANSWERS: 'Assessment answer',
    TRAINING_RUN_STARTED: 'Run started',
    TRAINING_RUN_RESUMED: 'Run resumed',
    TRAINING_RUN_ENDED: 'Run ended',
};

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
 *    content for the shift-hold tooltip expansion requires a separate path.
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
    /**
     * Event-specific detail shown under the kind header in the tooltip:
     * the answer text for answer events, the hint title for hints. Empty
     * for kinds that carry no detail beyond their label.
     */
    readonly detail: string;
}
