import { Signal } from '@angular/core';
import { ViewModel } from '../types/view-model.types';

/**
 * Owns the ECharts instance, the drag-suppression queue, the resize hook,
 * and the single subscription that translates the view-model signal into
 * `setOption` calls.
 *
 * Composition rules:
 *  - reads view-model in one effect; one `setOption` dispatch per
 *    microtask burst
 *  - composes option-builder fragments by `key`; omitted fragments leave
 *    the corresponding ECharts state untouched via the engine's merge
 *    semantics
 *  - drag queue gates dispatch — while a user gesture is in flight,
 *    the latest option is held back and applied on gesture release
 *    (50 ms timeout differentiates drag-end from click)
 *
 * Translates ECharts callbacks back into UI state via the
 * `ProgressUiStateService` (legend click → lag filter, Y-axis label
 * click → favourite, dataZoom event → `isZoomedIn`).
 *
 * Boundaries:
 *  - no business logic; classification/ordering done before VM arrives
 *  - no DOM manipulation beyond the ECharts container
 *  - no retained per-trainee or per-event state
 */
export abstract class ChartRendererService {
    /**
     * Binds the renderer to the host element and the view-model signal.
     * Called once by the chart child component in its view-init phase.
     * Initialises ECharts, wires the drag queue, the resize hook, and
     * the view-model effect. Disposal hooks the host component's
     * `DestroyRef`.
     */
    abstract bind(host: HTMLElement, viewModel: Signal<ViewModel>): void;

    /** Imperative zoom reset for the reset-zoom UI control. */
    abstract resetZoom(): void;

    /** `true` while the chart's current zoom is anything other than 0–100%. */
    abstract readonly isZoomedIn: Signal<boolean>;
}
