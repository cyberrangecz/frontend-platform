import { ChartSourceStatus } from './chart-source.types';

/**
 * Merges the statuses of several chart data sources into one worst-case status, so a
 * multi-source chart can reflect a single state. Precedence, highest first:
 * error, then loading (a not-yet-started or first-loading source), then refreshing,
 * then empty, then ready. A component may still override the result to `empty` based
 * on its combined view-model.
 *
 * @param statuses  The statuses of the contributing sources, in any order.
 * @returns The single status that should drive the panel shell.
 */
export function mergeSourceStatuses(...statuses: readonly ChartSourceStatus[]): ChartSourceStatus {
    if (statuses.includes('error')) return 'error';
    if (statuses.includes('idle') || statuses.includes('loading')) return 'loading';
    if (statuses.includes('refreshing')) return 'refreshing';
    if (statuses.includes('empty')) return 'empty';
    return 'ready';
}
