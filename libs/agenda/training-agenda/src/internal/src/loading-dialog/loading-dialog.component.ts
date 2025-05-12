import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { LoadingDialogConfig } from './loading-dialog-config';

@Component({
    selector: 'crczp-next-phase-dialog',
    templateUrl: './loading-dialog.component.html',
    styleUrls: ['./loading-dialog.component.css'],
})
export class LoadingDialogComponent {
    constructor(
        public dialogRef: MatDialogRef<LoadingDialogComponent>,
        @Inject(MAT_DIALOG_DATA) public data: LoadingDialogConfig,
    ) {
        dialogRef.disableClose = true;
    }
}
