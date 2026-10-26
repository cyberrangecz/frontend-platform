import {
    ComponentRef,
    DestroyRef,
    Directive,
    effect,
    ElementRef,
    inject,
    Injector,
    input,
    signal,
} from '@angular/core';
import { FocusMonitor } from '@angular/cdk/a11y';
import {
    ConnectedPosition,
    createFlexibleConnectedPositionStrategy,
    createOverlayRef,
    createRepositionScrollStrategy,
    OverlayRef,
} from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { filter } from 'rxjs/operators';
import { LogViewTooltip } from './log-view-tooltip.component';

export const LOG_VIEW_TOOLTIP_SHOW_DELAY = 400; // ms
const TOOLTIP_GAP = 4; // px

const BELOW: ConnectedPosition[] = [
    { originX: 'center', originY: 'bottom', overlayX: 'center', overlayY: 'top', offsetY: TOOLTIP_GAP },
];

let nextTooltipNumber = 0;

/**
 * Shows a log view tooltip below the host after a short delay on hover or keyboard focus, and
 * hides it when the pointer leaves, the host loses focus or Escape is pressed. While shown, the
 * host is described by the tooltip. Stays hidden while suppressed.
 */
@Directive({
    selector: '[crczpLogViewTooltip]',
    host: {
        '(mouseenter)': 'scheduleShow()',
        '(mouseleave)': 'hide()',
        '[attr.aria-describedby]': 'describedBy()',
    },
})
export class LogViewTooltipDirective {
    /** Action named in the first row. */
    readonly crczpLogViewTooltip = input.required<string>();
    /** Shortcut shown in the second row; no second row when absent. */
    readonly crczpLogViewTooltipShortcut = input<string>();

    /** Keeps the tooltip hidden while true. */
    readonly crczpLogViewTooltipSuppressed = input(false);

    protected readonly describedBy = signal<string | null>(null);

    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly injector = inject(Injector);
    private readonly tooltipId = `crczp-log-view-tooltip-${nextTooltipNumber++}`;
    private overlayRef?: OverlayRef;
    private tooltipRef?: ComponentRef<LogViewTooltip>;
    private showTimeout?: ReturnType<typeof setTimeout>;

    constructor() {
        const focusMonitor = inject(FocusMonitor);
        const focusSubscription = focusMonitor.monitor(this.host).subscribe((origin) => {
            if (origin === 'keyboard') {
                this.scheduleShow();
            } else if (origin === null) {
                this.hide();
            }
        });
        effect(() => {
            if (this.crczpLogViewTooltipSuppressed()) this.hide();
        });
        effect(() => {
            const label = this.crczpLogViewTooltip();
            const shortcut = this.crczpLogViewTooltipShortcut();
            this.tooltipRef?.setInput('label', label);
            this.tooltipRef?.setInput('shortcut', shortcut);
        });
        inject(DestroyRef).onDestroy(() => {
            clearTimeout(this.showTimeout);
            focusSubscription.unsubscribe();
            focusMonitor.stopMonitoring(this.host);
            this.overlayRef?.dispose();
        });
    }

    protected scheduleShow() {
        if (this.tooltipRef || this.crczpLogViewTooltipSuppressed()) return;
        clearTimeout(this.showTimeout);
        this.showTimeout = setTimeout(() => this.show(), LOG_VIEW_TOOLTIP_SHOW_DELAY);
    }

    protected hide() {
        clearTimeout(this.showTimeout);
        this.showTimeout = undefined;
        this.overlayRef?.detach();
        this.tooltipRef = undefined;
        this.describedBy.set(null);
    }

    private show() {
        const overlayRef = this.overlayRef ?? this.createOverlay();
        const tooltipRef = overlayRef.attach(new ComponentPortal(LogViewTooltip));
        tooltipRef.setInput('id', this.tooltipId);
        tooltipRef.setInput('label', this.crczpLogViewTooltip());
        tooltipRef.setInput('shortcut', this.crczpLogViewTooltipShortcut());
        this.tooltipRef = tooltipRef;
        this.describedBy.set(this.tooltipId);
    }

    private createOverlay(): OverlayRef {
        const overlayRef = createOverlayRef(this.injector, {
            positionStrategy: createFlexibleConnectedPositionStrategy(this.injector, this.host)
                .withPositions(BELOW)
                .withFlexibleDimensions(false),
            scrollStrategy: createRepositionScrollStrategy(this.injector),
        });
        overlayRef.overlayElement.style.pointerEvents = 'none';
        overlayRef
            .keydownEvents()
            .pipe(filter((event) => event.key === 'Escape'))
            .subscribe((event) => {
                event.preventDefault();
                event.stopPropagation();
                this.hide();
            });
        this.overlayRef = overlayRef;
        return overlayRef;
    }
}
