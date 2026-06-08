import {
    afterRenderEffect,
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    computed,
    DestroyRef,
    ElementRef,
    inject,
    input,
    output,
    signal,
    viewChild,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { Utils } from '@crczp/utils';
import { StepperItemVm } from '../types/view-model.types';

/**
 * Resolved representation of a single stepper step.
 *
 * Computed once per `items` / `selectedOrder` / `highlightedOrder` change
 * and consumed directly by the template, so the template contains no logic —
 * only property reads.
 */
interface ResolvedStepVm {
    readonly item: StepperItemVm;
    readonly icon: string;
    readonly accessible: boolean;
    readonly selected: boolean;
    readonly highlighted: boolean;
    /** True when the connecting line to the *next* step should appear locked. */
    readonly nextLineLocked: boolean;
    /** True when this step is selected and the next is accessible (forward gradient). */
    readonly nextLineFade: boolean;
    /** True when this step is accessible and the next is selected (reverse gradient). */
    readonly nextLineFadeReverse: boolean;
    /** True when either this step or the next is selected. */
    readonly nextLineSelected: boolean;
}

/**
 * Horizontal stepper navigation bar for the progress visualization.
 *
 * Renders one circular node per `StepperItemVm` and connects consecutive
 * nodes with animated gradient lines. The component is a pure presentation
 * layer: it holds no async state and derives every visual flag inside a
 * single `resolvedItems` computed signal, keeping the template free of logic.
 *
 * Selection and hover are surfaces for bi-directional highlight sync:
 * - `stepClicked` lets the parent mark a persistent level filter.
 * - `stepHovered` lets the parent propagate a transient highlight to the
 *   chart Y-axis (and vice-versa — the `highlightedOrder` input receives
 *   chart-driven highlights so the stepper can light up without a pointer
 *   event landing on it).
 *
 * Accessibility per step is sourced directly from `StepperItemVm.locked`:
 * a step is accessible when `!item.locked`, meaning at least one training run
 * has a bar for that level in the unfiltered instance population.
 */
@Component({
    selector: 'crczp-progress-stepper',
    standalone: true,
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatIcon],
    templateUrl: './progress-stepper.component.html',
    styleUrl: './progress-stepper.component.scss',
})
export class ProgressStepperComponent implements AfterViewInit {
    /**
     * Ordered list of training levels to render as stepper nodes.
     * The array order defines left-to-right display order.
     */
    readonly items = input.required<readonly StepperItemVm[]>();

    /**
     * Order value of the currently selected level.
     *
     * A selected step is highlighted in amber and causes the connecting
     * lines on either side to render as gradient transitions.
     * `null` means no level is currently selected.
     *
     * Corresponds to `HighlightVm.selectedLevelOrder`.
     */
    readonly selectedOrder = input<number | null>(null);

    /**
     * Order value of the level that is transiently highlighted.
     *
     * Unlike selection, highlight is ephemeral and driven by hover events
     * originating from either this component or the chart Y-axis. When
     * set externally (e.g. from a chart row hover), the matching step node
     * receives the same visual treatment as a CSS `:hover` without requiring
     * an actual pointer event on the stepper.
     * `null` means no level is highlighted.
     *
     * Corresponds to `HighlightVm.highlightedLevelOrder`.
     */
    readonly highlightedOrder = input<number | null>(null);

    /**
     * Emits the `order` of the step the user clicked.
     * Only fires when the clicked step is accessible (not locked).
     */
    readonly stepClicked = output<number>();

    /**
     * Emits the `order` of the step the pointer entered,
     * or `null` when the pointer left a step without entering another.
     */
    readonly stepHovered = output<number | null>();

    // Recomputed on each input change; carries every flag the template needs so the template has no logic.
    protected readonly resolvedItems = computed<readonly ResolvedStepVm[]>(() => {
        const items = this.items();
        const selectedOrder = this.selectedOrder();
        const highlightedOrder = this.highlightedOrder();

        return items.map((item, index): ResolvedStepVm => {
            const accessible = !item.locked;
            const selected = accessible && item.order === selectedOrder;
            const nextItem = items[index + 1];
            const hasNext = nextItem !== undefined;
            const nextAccessible = hasNext && !nextItem.locked;
            const nextSelected =
                hasNext && nextAccessible && nextItem.order === selectedOrder;

            return {
                item,
                icon: Utils.LevelType.levelTypeToIcon(item.type),
                accessible,
                selected,
                highlighted: item.order === highlightedOrder,
                nextLineLocked: hasNext && !nextAccessible,
                nextLineFade: selected && nextAccessible && !nextSelected,
                nextLineFadeReverse: accessible && !selected && nextSelected,
                nextLineSelected: selected || nextSelected,
            };
        });
    });

    /** Whether the stepper track overflows its host width horizontally. */
    protected readonly isOverflowing = signal<boolean>(false);

    // Returns -1 when no step matches selectedOrder.
    private readonly selectedArrayIndex = computed<number>(() => {
        const order = this.selectedOrder();
        if (order === null) {
            return -1;
        }
        return this.items().findIndex((item) => item.order === order);
    });

    private readonly containerElementRef =
        viewChild<ElementRef<HTMLElement>>('stepperContainer');

    private readonly destroyRef = inject(DestroyRef);

    constructor() {
        // Scroll the selected node into view after each render where the selection changes.
        afterRenderEffect(() => {
            this.scrollSelectedIntoView(this.selectedArrayIndex());
        });
    }

    ngAfterViewInit(): void {
        this.attachResizeObserver();
    }

    /** Handles a click on a step node, emitting only when the step is accessible. */
    protected onStepClick(resolved: ResolvedStepVm): void {
        if (resolved.accessible) {
            this.stepClicked.emit(resolved.item.order);
        }
    }

    // Keeps isOverflowing in sync with container size; disconnected on destroy.
    private attachResizeObserver(): void {
        const container = this.containerElementRef()?.nativeElement;
        if (!container) {
            return;
        }

        const updateOverflow = (): void => {
            this.isOverflowing.set(container.scrollWidth > container.clientWidth);
        };

        const observer = new ResizeObserver(updateOverflow);
        observer.observe(container);
        // Seed the initial value immediately without waiting for a resize event.
        updateOverflow();

        this.destroyRef.onDestroy(() => observer.disconnect());
    }

    private scrollSelectedIntoView(arrayIndex: number): void {
        if (arrayIndex < 0) {
            return;
        }
        const container = this.containerElementRef()?.nativeElement;
        if (!container) {
            return;
        }
        const child = container.children[arrayIndex];
        child?.scrollIntoView({ behavior: 'smooth', inline: 'nearest', block: 'nearest' });
    }
}
