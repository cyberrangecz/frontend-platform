import {
    afterNextRender,
    ComponentRef,
    DestroyRef,
    Directive,
    effect,
    ElementRef,
    inject,
    input,
    Renderer2,
    ViewContainerRef,
} from '@angular/core';
import { NgControl } from '@angular/forms';
import { NumberStepperControlsComponent } from '../components/number-stepper-controls/number-stepper-controls.component';

/** Row a form field lays its own prefixes, infix and suffixes out in. */
const FIELD_ROW_SELECTOR = '.mat-mdc-form-field-flex';

/**
 * Marks an input whose steps are drawn for it, which the theme reads to leave out the
 * browser's own spinner. Stated as a class rather than read off the directive's own
 * attribute, an attribute being absent from the document wherever the unit is bound
 * rather than written out.
 */
const STEPPED_INPUT_CLASS = 'crczp-number-stepper';

/**
 * Draws a number input's own chevrons in place of the browser's, and the unit the
 * amount is counted in beside them.
 *
 * The chevrons step by the input's `step`, stop at its `min` and `max`, and write
 * through the form control where the input is bound to one, so a step reads as an edit
 * the reader made. A chevron held down repeats, and the wheel turned over the chevrons
 * steps as well without scrolling what lies behind them.
 *
 * Draws inside a Material form field, joining the row the field lays its suffixes out
 * in, and states the unit itself rather than leaving a `matTextSuffix` to state it. An
 * input standing outside such a field keeps the browser's own spinner.
 */
@Directive({
    selector: 'input[type=number][crczpNumberStepper]',
    host: { class: STEPPED_INPUT_CLASS },
})
export class NumberStepperDirective {
    /** Unit the amount is counted in, drawn after the chevrons; none while unset. */
    readonly crczpNumberStepper = input<string | null>(null);

    private readonly host = inject<ElementRef<HTMLInputElement>>(ElementRef);
    private readonly viewContainer = inject(ViewContainerRef);
    private readonly renderer = inject(Renderer2);
    private readonly destroyRef = inject(DestroyRef);
    private readonly ngControl = inject(NgControl, { optional: true });

    private controls: ComponentRef<NumberStepperControlsComponent> | null = null;

    constructor() {
        // Drawn once the field around the input stands, there being no suffix row to
        // join before it, and so never painted anywhere it does not belong.
        afterNextRender(() => {
            const row = this.host.nativeElement.closest(FIELD_ROW_SELECTOR);
            if (row === null) {
                return;
            }
            const controls = this.viewContainer.createComponent(
                NumberStepperControlsComponent,
            );
            controls.setInput('unit', this.crczpNumberStepper());
            this.renderer.appendChild(row, controls.location.nativeElement);
            const steps = controls.instance.step.subscribe((direction) =>
                this.stepBy(direction),
            );
            this.destroyRef.onDestroy(() => steps.unsubscribe());
            this.controls = controls;
        });
        effect(() => this.controls?.setInput('unit', this.crczpNumberStepper()));
    }

    /**
     * Moves the amount one step the way asked, as far as the input's own bounds allow,
     * and leaves the input holding the reader's attention.
     *
     * @param direction Way the amount moves, upwards as 1 and downwards as -1.
     */
    private stepBy(direction: 1 | -1): void {
        const element = this.host.nativeElement;
        if (element.disabled || element.readOnly) {
            return;
        }
        const stated = element.valueAsNumber;
        const from = Number.isNaN(stated) ? 0 : stated;
        this.write(this.bounded(from + direction * this.stepOf(element)));
        element.focus();
    }

    /** How far one step moves the amount, one where the input states nothing. */
    private stepOf(element: HTMLInputElement): number {
        const stated = Number.parseFloat(element.step);
        return Number.isNaN(stated) || stated <= 0 ? 1 : stated;
    }

    /** The amount held within whichever bounds the input states. */
    private bounded(amount: number): number {
        const element = this.host.nativeElement;
        const floor = Number.parseFloat(element.min);
        const ceiling = Number.parseFloat(element.max);
        if (!Number.isNaN(floor) && amount < floor) {
            return floor;
        }
        if (!Number.isNaN(ceiling) && amount > ceiling) {
            return ceiling;
        }
        return amount;
    }

    /**
     * States the amount where whatever reads the input takes it from: its form control
     * where it is bound to one, marked as edited so the field answers as it does to
     * typing, and the element itself otherwise.
     */
    private write(amount: number): void {
        const control = this.ngControl?.control;
        if (control !== null && control !== undefined) {
            control.markAsDirty();
            control.setValue(amount);
            return;
        }
        const element = this.host.nativeElement;
        element.value = String(amount);
        element.dispatchEvent(new Event('input', { bubbles: true }));
    }
}
