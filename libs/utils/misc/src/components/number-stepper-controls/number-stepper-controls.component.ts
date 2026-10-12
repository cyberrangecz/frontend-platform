import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
    input,
    output,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';

/** How long a chevron is held before it begins repeating. */
const HOLD_DELAY_MILLISECONDS = 400;

/** How often a held chevron repeats once it has begun. */
const REPEAT_INTERVAL_MILLISECONDS = 60;

/**
 * The chevrons a number is stepped by, and the unit it is counted in.
 *
 * Reports each activation as a direction and holds no value of its own, the amount and
 * the rules it is held to belonging to the input this is drawn for. A chevron held down
 * repeats, and the wheel turned over the controls steps as well, the page behind staying
 * where it is.
 */
@Component({
    selector: 'crczp-number-stepper-controls',
    templateUrl: './number-stepper-controls.component.html',
    styleUrl: './number-stepper-controls.component.css',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatIcon],
    host: { '(wheel)': 'turn($event)' },
})
export class NumberStepperControlsComponent {
    /** Unit the amount is counted in, drawn after the chevrons; none while null. */
    readonly unit = input<string | null>(null);

    /** Each step asked for, upwards as 1 and downwards as -1. */
    readonly step = output<1 | -1>();

    private readonly destroyRef = inject(DestroyRef);

    private holdTimer: ReturnType<typeof setTimeout> | null = null;
    private repeatTimer: ReturnType<typeof setInterval> | null = null;

    constructor() {
        this.destroyRef.onDestroy(() => this.release());
    }

    /**
     * Steps once, then keeps stepping at a steady pace until the chevron is released.
     *
     * @param direction Way the chevron pressed steps the amount.
     * @param event Press being answered, whose default selection is refused.
     */
    protected hold(direction: 1 | -1, event: PointerEvent): void {
        event.preventDefault();
        this.release();
        this.step.emit(direction);
        this.holdTimer = setTimeout(() => {
            this.repeatTimer = setInterval(
                () => this.step.emit(direction),
                REPEAT_INTERVAL_MILLISECONDS,
            );
        }, HOLD_DELAY_MILLISECONDS);
    }

    /** Stops a chevron that is repeating, and one that is waiting to begin. */
    protected release(): void {
        if (this.holdTimer !== null) {
            clearTimeout(this.holdTimer);
            this.holdTimer = null;
        }
        if (this.repeatTimer !== null) {
            clearInterval(this.repeatTimer);
            this.repeatTimer = null;
        }
    }

    /**
     * Steps by the way the wheel turned, keeping the turn to the controls so what lies
     * behind them does not scroll under it.
     *
     * @param event Turn being answered.
     */
    protected turn(event: WheelEvent): void {
        if (event.deltaY === 0) {
            return;
        }
        event.preventDefault();
        this.step.emit(event.deltaY < 0 ? 1 : -1);
    }
}
