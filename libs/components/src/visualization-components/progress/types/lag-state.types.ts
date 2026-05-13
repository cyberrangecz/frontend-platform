/**
 * Lag classification vocabulary for the progress visualization.
 *
 * Literal union for zero-runtime typing, paired with a sibling `LAG_STATES`
 * array typed `readonly LagState[]` for iteration sites (legend builder,
 * default filter set construction).
 *
 * Classification logic lives in `selectors/with-lag-state.ts`; thresholds and
 * colors in `config/lag.config.ts`.
 */
export type LagState =
    | 'UNKNOWN'
    | 'OK'
    | 'WARNING'
    | 'LATE'
    | 'ABANDONED'
    | 'INACTIVE'
    | 'INACTIVE_HIGHLIGHTED';

export const LAG_STATES: readonly LagState[] = [
    'UNKNOWN',
    'OK',
    'WARNING',
    'LATE',
    'ABANDONED',
    'INACTIVE',
    'INACTIVE_HIGHLIGHTED',
] as const;

/**
 * Subset of lag states that participate in the legend filter. The two
 * INACTIVE variants are visual-only and never appear in the legend.
 */
export const LAG_STATES_FILTERABLE: readonly LagState[] = [
    'UNKNOWN',
    'OK',
    'WARNING',
    'LATE',
    'ABANDONED',
] as const;
