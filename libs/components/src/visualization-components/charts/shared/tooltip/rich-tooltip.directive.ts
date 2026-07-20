import { ComponentRef, Directive, ElementRef, HostListener, inject, input, OnDestroy, TemplateRef } from '@angular/core';
import { ConnectedPosition, Overlay, OverlayRef } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { RichTooltipComponent, RichTooltipContent } from './rich-tooltip.component';

/** Delay before a hovered tooltip appears, in milliseconds. */
const SHOW_DELAY_MS = 150;

/** Gap between the cursor and the tooltip edge, in pixels. */
const CURSOR_OFFSET_PX = 12;

/** Placements relative to the cursor point, tried in order until one fits the viewport. */
const TOOLTIP_POSITIONS: ConnectedPosition[] = [
    { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top', offsetX: CURSOR_OFFSET_PX, offsetY: CURSOR_OFFSET_PX },
    { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom', offsetX: CURSOR_OFFSET_PX, offsetY: -CURSOR_OFFSET_PX },
    { originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top', offsetX: -CURSOR_OFFSET_PX, offsetY: CURSOR_OFFSET_PX },
    { originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom', offsetX: -CURSOR_OFFSET_PX, offsetY: -CURSOR_OFFSET_PX },
];

/** Monotonic source of unique element ids for the `aria-describedby` link. */
let nextTooltipId = 0;

/**
 * Attaches a themed, ECharts-styled tooltip to its host element, rendered in a CDK
 * overlay so it escapes scroll and overflow clipping. The tooltip is anchored to the
 * cursor and follows pointer movement, mirroring ECharts tooltip behaviour. Content
 * may be a plain string (multi-line via newlines) or a template for rich markup.
 * Shows on hover and keyboard focus, hides on leave and blur.
 */
@Directive({
    selector: '[crczpRichTooltip]',
    standalone: true,
})
export class RichTooltipDirective implements OnDestroy {
    /** Tooltip content: structured rows, a plain string, or a template for rich markup. */
    readonly content = input<RichTooltipContent | null>(null, { alias: 'crczpRichTooltip' });

    /** Suppresses the tooltip when true. */
    readonly disabled = input(false, { alias: 'richTooltipDisabled' });

    private readonly overlay = inject(Overlay);
    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

    private overlayRef: OverlayRef | null = null;
    private tooltipRef: ComponentRef<RichTooltipComponent> | null = null;
    private showTimer: ReturnType<typeof setTimeout> | null = null;
    private readonly describedById = `crczp-rich-tooltip-${(nextTooltipId += 1)}`;

    /** Live cursor coordinates the overlay is anchored to; mutated in place so the position strategy re-reads them. */
    private readonly cursorOrigin = { x: 0, y: 0 };

    /** Tracks the cursor and schedules the tooltip after the hover delay. */
    @HostListener('mouseenter', ['$event'])
    protected onPointerEnter(event: MouseEvent): void {
        this.cursorOrigin.x = event.clientX;
        this.cursorOrigin.y = event.clientY;
        this.scheduleShow();
    }

    /** Follows the cursor while hovering, repositioning an open tooltip. */
    @HostListener('mousemove', ['$event'])
    protected onPointerMove(event: MouseEvent): void {
        this.cursorOrigin.x = event.clientX;
        this.cursorOrigin.y = event.clientY;
        if (this.overlayRef?.hasAttached()) {
            this.overlayRef.updatePosition();
        }
    }

    /** Anchors the tooltip to the host centre for keyboard focus, then schedules it. */
    @HostListener('focus')
    protected onFocus(): void {
        const rect = this.host.nativeElement.getBoundingClientRect();
        this.cursorOrigin.x = rect.left + rect.width / 2;
        this.cursorOrigin.y = rect.bottom;
        this.scheduleShow();
    }

    /** Hides the tooltip and cancels any pending show. */
    @HostListener('mouseleave')
    @HostListener('blur')
    protected hide(): void {
        this.clearTimer();
        if (this.overlayRef?.hasAttached()) {
            this.overlayRef.detach();
        }
        this.host.nativeElement.removeAttribute('aria-describedby');
    }

    ngOnDestroy(): void {
        this.clearTimer();
        this.overlayRef?.dispose();
    }

    /** Schedules the tooltip to appear after the hover delay, unless empty or disabled. */
    private scheduleShow(): void {
        const content = this.content();
        if (this.disabled() || content === null) return;
        if (typeof content === 'string' && content.length === 0) return;
        if (typeof content !== 'string' && !(content instanceof TemplateRef) && !content.title && content.rows.length === 0) {
            return;
        }

        this.clearTimer();
        this.showTimer = setTimeout(() => this.show(content), SHOW_DELAY_MS);
    }

    /**
     * Creates the overlay on first use, then attaches the tooltip surface and links it
     * to the host for assistive technology.
     *
     * @param content  The resolved tooltip content to display.
     */
    private show(content: RichTooltipContent): void {
        this.overlayRef ??= this.overlay.create({
            positionStrategy: this.overlay
                .position()
                .flexibleConnectedTo(this.cursorOrigin)
                .withPositions(TOOLTIP_POSITIONS)
                .withPush(true),
            scrollStrategy: this.overlay.scrollStrategies.reposition({ autoClose: true }),
        });
        if (this.overlayRef.hasAttached()) return;

        this.tooltipRef = this.overlayRef.attach(new ComponentPortal(RichTooltipComponent));
        this.tooltipRef.setInput('content', content);
        this.tooltipRef.location.nativeElement.setAttribute('id', this.describedById);
        this.host.nativeElement.setAttribute('aria-describedby', this.describedById);
    }

    /** Cancels a pending show timer, if any. */
    private clearTimer(): void {
        if (this.showTimer !== null) {
            clearTimeout(this.showTimer);
            this.showTimer = null;
        }
    }
}
