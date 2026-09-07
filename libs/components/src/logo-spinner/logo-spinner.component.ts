import { Component, computed, input, signal } from '@angular/core';
import { ResizeEvent, SentinelResizeDirective } from '@sentinel/common/resize';

/** Named square the spinner renders within, from an inline icon up to the unscaled animation. */
export type LogoSpinnerSize = 'sm' | 'md' | 'lg' | 'xlg';

/** Side of the square the animation is authored against, rendering unscaled at this size. */
const SPINNER_BASE_SIZE = 150;

const SIZE_PIXELS: Record<LogoSpinnerSize, number> = {
    sm: 16,
    md: 32,
    lg: 64,
    xlg: SPINNER_BASE_SIZE,
};

@Component({
    selector: 'crczp-logo-spinner',
    standalone: true,
    templateUrl: './logo-spinner.component.html',
    styleUrl: './logo-spinner.component.scss',
    imports: [SentinelResizeDirective],
    host: {
        '[class.spinner--icon]': 'sizePixels() !== null',
        '[style.width.px]': 'sizePixels()',
        '[style.height.px]': 'sizePixels()',
    },
})
export class LogoSpinnerComponent {
    /**
     * Square the spinner renders within. Left unset, the spinner instead fills the space its
     * parent gives it.
     */
    size = input<LogoSpinnerSize | null>(null);

    /** Side of the rendered square in pixels, absent while the spinner follows its parent. */
    readonly sizePixels = computed(() => {
        const requestedSize = this.size();

        return requestedSize === null ? null : SIZE_PIXELS[requestedSize];
    });

    readonly spinnerScale = computed(() => {
        const requestedPixels = this.sizePixels();

        return requestedPixels === null
            ? this.measuredScale()
            : requestedPixels / SPINNER_BASE_SIZE;
    });

    private readonly measuredScale = signal(1);

    onSpinnerResize($event: ResizeEvent) {
        const newSize = Math.min($event.width, $event.height);
        this.measuredScale.set(newSize / SPINNER_BASE_SIZE);
    }
}
