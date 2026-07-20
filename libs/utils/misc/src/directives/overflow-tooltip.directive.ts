import { afterNextRender, DestroyRef, Directive, ElementRef, inject, input } from '@angular/core';
import { MatTooltip } from '@angular/material/tooltip';

/**
 * Reveals the full text of a truncating element through a Material tooltip, but only
 * while the element is actually clipped. The host must carry its own truncation styling
 * (single-line `text-overflow: ellipsis` or a multi-line line clamp); this directive
 * adds no layout of its own. Overflow is re-evaluated whenever the host resizes and on
 * every pointer or keyboard entry, so the tooltip appears exactly when content is hidden
 * and stays suppressed when it fits.
 *
 * Intended strictly for user-supplied strings that can exceed their container. The
 * tooltip text defaults to the host's own text content and may be overridden through the
 * directive's value binding for cases where the visible text differs from the full text.
 */
@Directive({
    selector: '[crczpOverflowTooltip]',
    hostDirectives: [MatTooltip],
    host: {
        '(mouseenter)': 'refresh()',
        '(focusin)': 'refresh()',
    },
})
export class OverflowTooltipDirective {
    /** Full text shown when truncated; falls back to the host's text content when unset. */
    readonly text = input<string | null>(null, { alias: 'crczpOverflowTooltip' });

    private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
    private readonly tooltip = inject(MatTooltip);
    private readonly destroyRef = inject(DestroyRef);

    constructor() {
        this.tooltip.disabled = true;
        afterNextRender(() => {
            const element = this.host.nativeElement;
            const observer = new ResizeObserver(() => this.refresh());
            observer.observe(element);
            this.destroyRef.onDestroy(() => observer.disconnect());
            this.refresh();
        });
    }

    /**
     * Enables the tooltip with the resolved full text only while the host is truncated
     * along either axis, and disables it otherwise.
     */
    protected refresh(): void {
        const element = this.host.nativeElement;
        const truncated = element.scrollWidth > element.clientWidth || element.scrollHeight > element.clientHeight;
        this.tooltip.disabled = !truncated;
        this.tooltip.message = truncated ? (this.text() ?? element.textContent ?? '').trim() : '';
    }
}
