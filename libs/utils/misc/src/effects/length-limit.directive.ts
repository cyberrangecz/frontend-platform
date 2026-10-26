import {
    afterEveryRender,
    afterNextRender,
    booleanAttribute,
    DestroyRef,
    Directive,
    effect,
    ElementRef,
    inject,
    input,
    Renderer2,
    signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NgControl } from '@angular/forms';
import { LengthCounter } from './length-counter';
import { LengthFlash } from './length-flash';

/** Text controls a length can be held on, whether the host itself or one within it. */
const TEXT_CONTROL_SELECTOR = 'input, textarea';

/** Whether an element takes typed text and can therefore be held to a length. */
function isTextControl(
    candidate: EventTarget | null,
): candidate is HTMLInputElement | HTMLTextAreaElement {
    return (
        candidate instanceof HTMLInputElement ||
        candidate instanceof HTMLTextAreaElement
    );
}

/** Text an insertion carries, which a paste states apart from the way typing does. */
function insertedText(event: InputEvent): string {
    return event.data ?? event.dataTransfer?.getData('text') ?? '';
}

/**
 * Holds what is typed into a field to a stated length, says how much of it is written,
 * and shows the moment a keystroke is turned away.
 *
 * The length is written onto the text control as its own, so the refusal is the
 * browser's: a keystroke past the length never lands, and a paste running past it is
 * cut to fit rather than dropped whole. Nothing is reported as invalid, a length being
 * a bound on what can be written rather than a rule about what has been.
 *
 * The count and the flash are each shown unless the field says otherwise, and each is
 * put where the surface around the control already keeps such a thing, so a field
 * states a length and nothing else.
 *
 * Applies to a text control directly, and to any element holding one, the control
 * inside being none of the caller's business.
 */
@Directive({
    selector: '[crczpLengthLimit]',
    host: {
        '(beforeinput)': 'onBeforeInput($event)',
        '(input)': 'readWritten()',
    },
})
export class LengthLimitDirective {
    /** Longest the text may run to. */
    readonly crczpLengthLimit = input.required<number>();

    /** Whether how much is written stands under the field. */
    readonly crczpLengthLimitCounter = input(true, {
        transform: booleanAttribute,
    });

    /** Whether a refused keystroke is answered by red. */
    readonly crczpLengthLimitFlash = input(true, {
        transform: booleanAttribute,
    });

    private readonly host =
        inject<ElementRef<HTMLElement>>(ElementRef).nativeElement;
    private readonly renderer = inject(Renderer2);
    private readonly flash = new LengthFlash(this.host, this.renderer);
    private readonly counter = new LengthCounter(this.host, this.renderer);

    private readonly textControl = signal<
        HTMLInputElement | HTMLTextAreaElement | null
    >(null);

    private readonly written = signal(0);

    constructor() {
        // The control is found once the view around it exists, which for a wrapped
        // editor is after the editor has drawn its own.
        afterNextRender(() => {
            this.textControl.set(this.findTextControl());
            this.readWritten();
        });

        // A value set from the form reaches the control without a keystroke to report
        // it. A control bound to the form says so itself; one wrapped in an editor of
        // its own says nothing, and is read back after each render instead.
        const bound = inject(NgControl, { optional: true })?.valueChanges ?? null;
        if (bound !== null) {
            bound.pipe(takeUntilDestroyed()).subscribe(() => this.readWritten());
        } else {
            afterEveryRender(() => this.readWritten());
        }

        effect(() => {
            const control = this.textControl();
            if (control === null) {
                return;
            }

            this.renderer.setAttribute(
                control,
                'maxlength',
                String(this.crczpLengthLimit()),
            );

            if (this.crczpLengthLimitCounter()) {
                this.counter.show(this.written(), this.crczpLengthLimit());
            } else {
                this.counter.hide();
            }
        });

        inject(DestroyRef).onDestroy(() => {
            this.flash.stop();
            this.counter.hide();
        });
    }

    protected onBeforeInput(event: InputEvent): void {
        const control = event.target;
        if (!isTextControl(control) || !event.inputType.startsWith('insert')) {
            return;
        }

        const replaced =
            (control.selectionEnd ?? 0) - (control.selectionStart ?? 0);
        const resulting =
            control.value.length - replaced + insertedText(event).length;

        if (resulting > this.crczpLengthLimit() && this.crczpLengthLimitFlash()) {
            this.flash.show(this.counter.flashed);
        }
    }

    /** Takes how much is written from the control, whatever wrote it there. */
    protected readWritten(): void {
        const control = this.textControl();
        if (control !== null) {
            this.written.set(control.value.length);
        }
    }

    private findTextControl(): HTMLInputElement | HTMLTextAreaElement | null {
        return isTextControl(this.host)
            ? this.host
            : this.host.querySelector<HTMLInputElement | HTMLTextAreaElement>(
                  TEXT_CONTROL_SELECTOR,
              );
    }
}
