import { Renderer2 } from '@angular/core';

/** Material field the host is drawn in, which keeps text of its own beneath it. */
const FIELD_SELECTOR = 'mat-form-field';

/** Where a Material field keeps that text: leading hints, a spacer, then trailing. */
const HINT_WRAPPER_SELECTOR = '.mat-mdc-form-field-hint-wrapper';

/**
 * Classes a trailing hint carries. Wearing them, the count is set and placed by the
 * field itself and takes the same flash every other hint does.
 */
const HINT_CLASSES = [
    'mat-mdc-form-field-hint',
    'mat-mdc-form-field-bottom-align',
    'mat-mdc-form-field-hint-end',
];

/**
 * How the count is set where it stands outside a field's subscript, read from the same
 * tokens the subscript is set from so the two are one style stated once.
 */
const LOOSE_STYLES: Readonly<Record<string, string>> = {
    display: 'block',
    'align-self': 'flex-end',
    padding: 'var(--space-3xs, 4px) var(--space-xl, 16px) 0',
    'font-family': 'var(--mat-form-field-subscript-text-font)',
    'font-size': 'var(--mat-form-field-subscript-text-size)',
    'font-weight': 'var(--mat-form-field-subscript-text-weight)',
    'line-height': 'var(--mat-form-field-subscript-text-line-height)',
    'letter-spacing': 'var(--mat-form-field-subscript-text-tracking)',
    'text-align': 'right',
    color: 'var(--mat-sys-on-surface)',
};

/** Room kept either side of the slash, so each number reads apart from it. */
const SLASH_STYLES: Readonly<Record<string, string>> = {
    padding: '0 1px',
};

/**
 * Shows how much of a length is written, as `12/128`, in the place the surface around
 * an element keeps such text: a Material field's own subscript where there is one, and
 * directly beneath the element where there is not.
 *
 * The count is put there by hand rather than by a template, so it is taken back and put
 * again whenever the field rebuilds what it keeps beneath itself — which Material does
 * every time an error takes the subscript over and gives it back.
 */
export class LengthCounter {
    private count: HTMLElement | null = null;
    private writtenText: Text | null = null;
    private limitText: Text | null = null;
    private loose = false;

    constructor(
        private readonly host: HTMLElement,
        private readonly renderer: Renderer2,
    ) {}

    /**
     * The count, where it stands somewhere the surface does not flash of its own
     * accord and must therefore be flashed alongside it.
     */
    get flashed(): readonly HTMLElement[] {
        return this.count !== null && this.loose ? [this.count] : [];
    }

    /**
     * States what is written of what may be, putting the count where it belongs and
     * keeping it there.
     *
     * @param written How much is written.
     * @param limit Longest the text may run to.
     */
    show(written: number, limit: number): void {
        this.mount(this.count ?? this.create());
        if (this.writtenText !== null) {
            this.writtenText.data = String(written);
        }
        if (this.limitText !== null) {
            this.limitText.data = String(limit);
        }
    }

    /** Takes the count away, for a field stating it wants none. */
    hide(): void {
        this.count?.remove();
        this.count = null;
        this.writtenText = null;
        this.limitText = null;
        this.loose = false;
    }

    /** Builds the count, three parts so the slash can be spaced apart from both. */
    private create(): HTMLElement {
        const count: HTMLElement = this.renderer.createElement('span');
        const slash: HTMLElement = this.renderer.createElement('span');
        this.writtenText = this.renderer.createText('0');
        this.limitText = this.renderer.createText('0');

        for (const [property, value] of Object.entries(SLASH_STYLES)) {
            this.renderer.setStyle(slash, property, value);
        }
        this.renderer.appendChild(slash, this.renderer.createText('/'));
        this.renderer.appendChild(count, this.writtenText);
        this.renderer.appendChild(count, slash);
        this.renderer.appendChild(count, this.limitText);

        this.count = count;
        return count;
    }

    /**
     * Puts the count in the field's own subscript where it has one, else directly
     * after the element it counts for. Standing where it belongs already, nothing is
     * moved.
     */
    private mount(count: HTMLElement): void {
        const slot =
            this.host
                .closest(FIELD_SELECTOR)
                ?.querySelector(HINT_WRAPPER_SELECTOR) ?? null;

        if (slot !== null) {
            this.loose = false;
            if (count.parentElement !== slot) {
                HINT_CLASSES.forEach((className) =>
                    this.renderer.addClass(count, className),
                );
                this.renderer.appendChild(slot, count);
            }
            return;
        }

        if (!this.loose) {
            this.loose = true;
            for (const [property, value] of Object.entries(LOOSE_STYLES)) {
                this.renderer.setStyle(count, property, value);
            }
        }
        if (!count.isConnected && this.host.parentElement !== null) {
            this.renderer.insertBefore(
                this.host.parentElement,
                count,
                this.host.nextSibling,
            );
        }
    }
}
