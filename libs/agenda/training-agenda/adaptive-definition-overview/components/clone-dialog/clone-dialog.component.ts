import {ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit} from '@angular/core';
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
import {SentinelShortStringPipe} from "@sentinel/common/pipes";
import { TitleCasePipe } from "@angular/common";
import {MatError, MatFormField, MatInput, MatLabel} from "@angular/material/input";
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
    SentinelShortStringPipe,
    TitleCasePipe,
    ReactiveFormsModule,
    MatFormField,
    MatLabel,
    MatInput,
    MatIcon,
    MatIconButton,
    MatDialogContent,
    MatDialogTitle,
    MatButton,
    MatDialogActions,
    MatError
]
})
export class CloneDialogComponent implements OnInit {
    dialogRef = inject<MatDialogRef<CloneDialogComponent>>(MatDialogRef);
    data = inject<TrainingDefinition>(MAT_DIALOG_DATA);

    cloneDialogFormGroup: CloneDialogFormGroup;
    valid = true;
    destroyRef = inject(DestroyRef);

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
