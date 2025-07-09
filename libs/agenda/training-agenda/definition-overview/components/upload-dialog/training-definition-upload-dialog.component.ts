import {Component, EventEmitter, inject} from '@angular/core';
import {MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {Observable} from 'rxjs';
import {FileUploadProgressService} from '../../services/file-upload/file-upload-progress.service';
import {AsyncPipe} from "@angular/common";
import {MatProgressBar} from "@angular/material/progress-bar";
import {MatButton} from "@angular/material/button";

/**
 * Component of training definition upload dialog window
 */
@Component({
    selector: 'crczp-training-upload-dialog',
    templateUrl: './training-definition-upload-dialog.component.html',
    styleUrls: ['./training-definition-upload-dialog.component.css'],
    imports: [
        AsyncPipe,
        MatProgressBar,
        MatDialogTitle,
        MatDialogContent,
        MatDialogActions,
        MatButton
    ]
})
export class TrainingDefinitionUploadDialogComponent {
    dialogRef = inject<MatDialogRef<TrainingDefinitionUploadDialogComponent>>(MatDialogRef);
    selectedFile: File;
    uploadInProgress$: Observable<boolean>;
    onUpload$ = new EventEmitter<File>();
    private uploadProgressService = inject(FileUploadProgressService);

    constructor() {
        this.uploadInProgress$ = this.uploadProgressService.isInProgress$;
    }

    /**
     * Cancels the upload and closes the dialog window with no result
     */
    cancel(): void {
        this.dialogRef.close();
    }

    /**
     * Emits upload event with selected file
     */
    upload(): void {
        this.onUpload$.emit(this.selectedFile);
    }

    /**
     * Removes selected file
     */
    clearFile(): void {
        this.selectedFile = null;
    }
}
