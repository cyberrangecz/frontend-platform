import { Component, signal } from '@angular/core';
import { ResizeEvent, SentinelResizeDirective } from '@sentinel/common/resize';

@Component({
    selector: 'crczp-logo-spinner',
    standalone: true,
    templateUrl: './logo-spinner.component.html',
    styleUrl: './logo-spinner.component.scss',
    imports: [SentinelResizeDirective],
})
export class LogoSpinnerComponent {
    spinnerScale = signal(1);
    private readonly SPINNER_BASE_SIZE = 150;

    onSpinnerResize($event: ResizeEvent) {
        const newSize = Math.min($event.width, $event.height);
        this.spinnerScale.set(newSize / this.SPINNER_BASE_SIZE);
    }
}
