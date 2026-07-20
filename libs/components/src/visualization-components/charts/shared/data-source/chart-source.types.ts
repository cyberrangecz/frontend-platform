/**
 * Lifecycle status of a chart data source.
 *
 * `loading` and `refreshing` are distinguished so the shell can keep prior data
 * visible during a live refetch (stale-while-refetch) and only show a skeleton on
 * the very first load. `idle` means no query has been issued yet (scope not ready).
 */
export type ChartSourceStatus = 'idle' | 'loading' | 'refreshing' | 'ready' | 'empty' | 'error';
