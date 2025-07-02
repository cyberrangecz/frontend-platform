import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import {
    MAT_DIALOG_DATA,
    MatDialogActions,
    MatDialogContent,
    MatDialogRef,
    MatDialogTitle
} from '@angular/material/dialog';
import {SandboxAllocationFormGroup} from './sandbox-allocation-form-group';
import {AbstractControl, ReactiveFormsModule} from '@angular/forms';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {MatSlider, MatSliderThumb} from "@angular/material/slider";
import {MatButton} from "@angular/material/button";
import {MatIcon} from "@angular/material/icon";
import {MatError, MatFormField, MatInput} from "@angular/material/input";

/**
 * Popup dialog to choose number of sandboxes to allocate
 */
@Component({
    selector: 'crczp-allocate-variable-sandboxes-selector',
    templateUrl: './allocate-variable-sandboxes-dialog.component.html',
    styleUrls: ['./allocate-variable-sandboxes-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatDialogTitle,
        ReactiveFormsModule,
        MatDialogContent,
        MatFormField,
        MatSlider,
        MatSliderThumb,
        MatIcon,
        MatButton,
        MatDialogActions,
        MatError,
        MatInput
    ]
})
export class AllocateVariableSandboxesDialogComponent implements OnInit {
    data = inject(MAT_DIALOG_DATA, { optional: true });
    dialogRef = inject<MatDialogRef<AllocateVariableSandboxesDialogComponent>>(MatDialogRef);

    sandboxAllocationFormGroup: SandboxAllocationFormGroup;
    destroyRef = inject(DestroyRef);

    constructor() {
        const data = this.data;

        this.sandboxAllocationFormGroup = new SandboxAllocationFormGroup(this.data);
        this.allocationSize.setValue(data);
    }

    get allocationSize(): AbstractControl {
        return this.sandboxAllocationFormGroup.formGroup.get('allocationSize');
    }

    ngOnInit() {
        this.sandboxAllocationFormGroup.formGroup.valueChanges.pipe(takeUntilDestroyed(this.destroyRef));
    }

    getSliderValue(event) {
        this.allocationSize.setValue(event.value);
    }

    changeAllocationValue(value: number) {
        this.allocationSize.setValue(this.correctToBounds(this.allocationSize.value + value));
    }

    onChange(event: Event) {
        const currentValue = (event.target as HTMLInputElement).valueAsNumber;
        if (!currentValue) {
            return;
        }
        const valueWithinBounds = this.correctToBounds(currentValue);
        if (currentValue !== valueWithinBounds) {
            this.allocationSize.setValue(valueWithinBounds);
        }
    }

    /**
     * Closes the dialog window and passes the selected option to its parent component
     */
    confirm(): void {
        const result = {
            type: 'confirm',
            result: this.allocationSize.value,
        };
        this.dialogRef.close(result);
    }

    /**
     * Closes the dialog window without passing the selected option
     */
    cancel(): void {
        const result = {
            type: 'cancel',
            result: null,
        };
        this.dialogRef.close(result);
    }

    /**
     * Corrects the value to be within 1 and the maximum number of sandboxes that can be allocated
     * @param value the input value
     * @returns a value within the bounds closest to the input value
     */
    private correctToBounds(value: number): number {
        return Math.min(Math.max(value, 1), this.data);
    }
}
