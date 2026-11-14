import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { formatBytes } from '../attachment/attachment-kind';
import { ByteSizePipe } from '../attachment/byte-size.pipe';

const NEAR_LIMIT_SHARE = 0.9;

/** Meter of the bytes the materials take against the training definition's attachment budget. */
@Component({
    selector: 'crczp-budget-meter',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [ByteSizePipe],
    templateUrl: './budget-meter.component.html',
    styleUrl: './budget-meter.component.scss',
})
export class BudgetMeterComponent {
    readonly usedBytes = input.required<number>();
    readonly limitBytes = input.required<number>();

    protected readonly over = computed(() => this.usedBytes() > this.limitBytes());
    protected readonly nearLimit = computed(() => !this.over() && this.usedBytes() >= this.limitBytes() * NEAR_LIMIT_SHARE);
    protected readonly remainder = computed(() => Math.abs(this.limitBytes() - this.usedBytes()));
    protected readonly usedShare = computed(() => (this.limitBytes() > 0 ? Math.min(100, (this.usedBytes() / this.limitBytes()) * 100) : 0));
    protected readonly valueText = computed(() => `${formatBytes(this.usedBytes())} of ${formatBytes(this.limitBytes())} used`);
}
