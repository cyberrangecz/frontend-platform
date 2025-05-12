import { ChangeDetectionStrategy, Component, DestroyRef, inject, Inject, OnInit } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { TrainingDefinition } from '@crczp/training-model';
import { CloneDialogFormGroup } from './clone-dialog-form-group';
import { AbstractControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Displays dialog with a form to select name of cloned training definition
 */
@Component({
    selector: 'crczp-clone-dialog',
    templateUrl: './clone-dialog.component.html',
    styleUrls: ['./clone-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CloneDialogComponent implements OnInit {
    cloneDialogFormGroup: CloneDialogFormGroup;
    valid = true;
    destroyRef = inject(DestroyRef);

    constructor(
        public dialogRef: MatDialogRef<CloneDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: TrainingDefinition,
    ) {}

    get clonedDefinitionTitle(): AbstractControl {
        return this.cloneDialogFormGroup.formGroup.get('clonedDefinitionTitle');
    }

    ngOnInit(): void {
        this.cloneDialogFormGroup = new CloneDialogFormGroup();
        this.clonedDefinitionTitle.setValue('Clone of ' + this.data.title);
        this.cloneDialogFormGroup.formGroup.valueChanges
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => (this.valid = this.cloneDialogFormGroup.formGroup.valid));
    }

    /**
     * Closes the dialog with 'confirm' result and inserted title of clened training definition
     */
    confirm(): void {
        if (this.cloneDialogFormGroup.formGroup.valid) {
            this.dialogRef.close({
                title: this.clonedDefinitionTitle.value,
            });
        }
    }

    /**
     * Closes the dialog with no result
     */
    cancel(): void {
        this.dialogRef.close();
    }
}
