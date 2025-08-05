import { Component, inject } from '@angular/core';
import {
    MAT_DIALOG_DATA,
    MatDialogContent,
    MatDialogRef,
    MatDialogTitle,
} from '@angular/material/dialog';
import { LoadingDialogOptions } from './loading-dialog-options';
import { LogoSpinnerComponent } from '../../logo-spinner/logo-spinner.component';
import { TitleCaseExceptPipe } from '@crczp/utils';

@Component({
    selector: 'crczp-next-phase-dialog',
    templateUrl: './loading-dialog.component.html',
    styleUrls: ['./loading-dialog.component.css'],
    imports: [
        LogoSpinnerComponent,
        TitleCaseExceptPipe,
        MatDialogTitle,
        MatDialogContent,
    ],
})
export class LoadingDialogComponent {
    dialogRef = inject<MatDialogRef<LoadingDialogComponent>>(MatDialogRef);
    data = inject<LoadingDialogOptions>(MAT_DIALOG_DATA);

    constructor() {
        const dialogRef = this.dialogRef;

        dialogRef.disableClose = true;
    }
}
