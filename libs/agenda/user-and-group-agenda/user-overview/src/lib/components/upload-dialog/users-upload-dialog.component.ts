import { Component, EventEmitter, inject } from '@angular/core';
import {MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {async, Observable} from 'rxjs';
import {FileUploadProgressService} from '../../services/file-upload/file-upload-progress.service';

/**
 * Component of users upload dialog window
 */
@Component({
    selector: 'crczp-users-upload-dialog',
    templateUrl: './users-upload-dialog.component.html',
    styleUrls: ['./users-upload-dialog.component.css'],
    imports: [
        MatDialogTitle,

    ]
})
export class UsersUploadDialogComponent {
    dialogRef = inject<MatDialogRef<UsersUploadDialogComponent>>(MatDialogRef);
    private uploadProgressService = inject(FileUploadProgressService);

    constructor() {
        this.uploadInProgress$ = this.uploadProgressService.isInProgress$;
    }

    selectedFile: File;
    uploadInProgress$: Observable<boolean>;
    onUpload$ = new EventEmitter<File>();
    protected readonly async = async;

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
