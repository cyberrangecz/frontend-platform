/**
 * Lag classification vocabulary for the progress visualization.
 *
 * Literal union for zero-runtime typing, paired with a sibling `LAG_STATES`
 * array typed `readonly LagState[]` for iteration sites (legend builder,
 * default filter set construction).
 *
 * Classification logic lives in `selectors/with-lag-state.ts`; thresholds and
 * colors in `config/lag.config.ts`.
 *
 * `COMPLETED` is not a bar classification — it exists solely for the legend
 * chip and filter vocabulary representing trainees whose runs have finished
 * (no currently running level). Bars with no estimate classify as `OK`.
 */
export type LagState =
    | 'COMPLETED'
    | 'OK'
    | 'WARNING'
    | 'LATE'
    | 'ABANDONED'
    | 'INACTIVE'
    | 'INACTIVE_HIGHLIGHTED';

export const LAG_STATES: readonly LagState[] = [
    'OK',
    'WARNING',
    'LATE',
    'ABANDONED',
    'INACTIVE',
    'INACTIVE_HIGHLIGHTED',
    'COMPLETED',
] as const;

/**
 * Subset of lag states that participate in the legend filter. The two
 * INACTIVE variants are visual-only and never appear in the legend.
 * `COMPLETED` counts finished trainees (rows with no running bar).
 */
export const LAG_STATES_FILTERABLE: readonly LagState[] = [
    'OK',
    'WARNING',
    'LATE',
    'ABANDONED',
    'COMPLETED',
] as const;
