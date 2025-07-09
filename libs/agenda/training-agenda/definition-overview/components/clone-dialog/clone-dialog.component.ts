import {ChangeDetectionStrategy, Component, inject} from '@angular/core';
import {
    MAT_DIALOG_DATA,
    MatDialogActions,
    MatDialogContent,
    MatDialogRef,
    MatDialogTitle
} from '@angular/material/dialog';
import {TrainingDefinition} from '@crczp/training-model';
import {CloneDialogFormGroup} from './clone-dialog-form-group';
import {AbstractControl, ReactiveFormsModule} from '@angular/forms';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {TitleCasePipe} from "@angular/common";
import {SentinelShortStringPipe} from "@sentinel/common/pipes";
import {MatError, MatFormField, MatInput, MatLabel, MatSuffix} from "@angular/material/input";
import {MatButton, MatIconButton} from "@angular/material/button";
import {MatIcon} from "@angular/material/icon";

/**
 * Displays dialog with a form to select name of cloned training definition
 */
@Component({
    selector: 'crczp-clone-dialog',
    templateUrl: './clone-dialog.component.html',
    styleUrls: ['./clone-dialog.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        TitleCasePipe,
        SentinelShortStringPipe,
        MatDialogContent,
        MatDialogTitle,
        ReactiveFormsModule,
        MatFormField,
        MatLabel,
        MatInput,
        MatSuffix,
        MatIconButton,
        MatIcon,
        MatError,
        MatDialogActions,
        MatButton
    ]
})
export class CloneDialogComponent {
    dialogRef = inject<MatDialogRef<CloneDialogComponent>>(MatDialogRef);
    data = inject<TrainingDefinition>(MAT_DIALOG_DATA);

    cloneDialogFormGroup: CloneDialogFormGroup;
    valid = true;

    constructor() {
        this.cloneDialogFormGroup = new CloneDialogFormGroup();
        this.clonedDefinitionTitle.setValue('Clone of ' + this.data.title);
        this.cloneDialogFormGroup.formGroup.valueChanges
            .pipe(takeUntilDestroyed())
            .subscribe(() => (this.valid = this.cloneDialogFormGroup.formGroup.valid));
    }

    get clonedDefinitionTitle(): AbstractControl {
        return this.cloneDialogFormGroup.formGroup.get('clonedDefinitionTitle');
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
