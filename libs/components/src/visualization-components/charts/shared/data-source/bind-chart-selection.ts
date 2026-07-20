import { WritableSignal } from '@angular/core';

/** A click/selection event emitted by an ECharts series via ngx-echarts `(chartClick)`. */
export interface ChartSelectionEvent {
    readonly componentType?: string;
    readonly seriesIndex?: number;
    readonly dataIndex?: number;
    readonly name?: string;
    readonly value?: unknown;
    readonly data?: unknown;
}

export interface ChartSelectionBinding<T> {
    /** Extracts the target value from a chart selection event. */
    readonly extract: (event: ChartSelectionEvent) => T;
    /** Signal updated with the extracted value on each accepted selection. */
    readonly into: WritableSignal<T>;
    /** Optional guard; the selection is ignored when it returns false. */
    readonly accept?: (event: ChartSelectionEvent) => boolean;
}

/**
 * Builds a typed handler for ngx-echarts `(chartClick)`, replacing the untyped
 * `ECElementEvent` cast at every call site with one named, reusable bridge from a
 * chart selection to a source parameter signal.
 */
export function bindChartSelection<T>(binding: ChartSelectionBinding<T>): (event: ChartSelectionEvent) => void {
    return (event: ChartSelectionEvent): void => {
        if (binding.accept && !binding.accept(event)) {
            return;
        }
        binding.into.set(binding.extract(event));
    };
}
