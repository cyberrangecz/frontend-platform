import { Component, EventEmitter, inject } from '@angular/core';
import {MatDialogActions, MatDialogRef} from '@angular/material/dialog';
import {async, Observable} from 'rxjs';
import {FileUploadProgressService} from '../../service/instance/file-upload-progress.service';
import {AsyncPipe} from "@angular/common";
import {MatIcon} from "@angular/material/icon";
import {MatButton} from "@angular/material/button";

/**
 * Dialog window component of training instance data upload
 */
@Component({
    selector: 'crczp-training-upload-dialog',
    templateUrl: './instance-upload-dialog.component.html',
    styleUrls: ['./instance-upload-dialog.component.css'],
    providers: [FileUploadProgressService],
    imports: [
        AsyncPipe,
        MatButton,
        MatIcon,
        MatDialogActions
    ]
})
export class InstanceUploadDialogComponent {
    dialogRef = inject<MatDialogRef<InstanceUploadDialogComponent>>(MatDialogRef);
    private uploadProgressService = inject(FileUploadProgressService);

    selectedFile: File;
    uploadInProgress$: Observable<boolean>;
    onUpload$ = new EventEmitter<File>();
    protected readonly async = async;

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
