import { Component, EventEmitter, inject } from '@angular/core';
import {MatDialogRef} from '@angular/material/dialog';
import {async, Observable} from 'rxjs';
import {FileUploadProgressService} from '../../services/file-upload/file-upload-progress.service';

/**
 * Component of training definition upload dialog window
 */
@Component({
    selector: 'crczp-training-upload-dialog',
    templateUrl: './training-definition-upload-dialog.component.html',
    styleUrls: ['./training-definition-upload-dialog.component.css'],
})
export class TrainingDefinitionUploadDialogComponent {
    dialogRef = inject<MatDialogRef<TrainingDefinitionUploadDialogComponent>>(MatDialogRef);
    private uploadProgressService = inject(FileUploadProgressService);

    selectedFile: File;
    uploadInProgress$: Observable<boolean>;
    onUpload$ = new EventEmitter<File>();

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

    protected readonly async = async;
}
