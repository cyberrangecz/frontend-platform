import {Component, Inject} from '@angular/core';
import {MAT_DIALOG_DATA, MatDialogContent, MatDialogRef, MatDialogTitle,} from '@angular/material/dialog';
import {LoadingDialogConfig} from './loading-dialog-config';
import {TitleCaseExceptPipe} from '../../pipes/title-case-except.pipe';
import {LogoSpinnerComponent} from "../logo-spinner/logo-spinner.component";

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
    constructor(
        public dialogRef: MatDialogRef<LoadingDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: LoadingDialogConfig
    ) {
        dialogRef.disableClose = true;
    }
}
