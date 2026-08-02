import { Component, input } from '@angular/core';
import { AbstractControl } from '@angular/forms';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

/**
 * Suffix button that empties the form control it is bound to, shown only while the control
 * holds a value. Place it inside a `mat-form-field` alongside `matSuffix`.
 */
@Component({
    selector: 'crczp-clear-input-suffix',
    templateUrl: './clear-input-suffix.component.html',
    styleUrl: './clear-input-suffix.component.css',
    imports: [MatIconButton, MatIcon],
})
export class ClearInputSuffixComponent {
    /** Control emptied when the button is activated. */
    readonly control = input.required<AbstractControl>();

    /** Value written to the control when cleared, for controls that distinguish empty from absent. */
    readonly clearedValue = input<unknown>('');

    /** Accessible name of the button, naming the field it empties. */
    readonly label = input('Clear');

    protected clear(): void {
        const control = this.control();
        control.setValue(this.clearedValue());
        control.markAsDirty();
    }
}
