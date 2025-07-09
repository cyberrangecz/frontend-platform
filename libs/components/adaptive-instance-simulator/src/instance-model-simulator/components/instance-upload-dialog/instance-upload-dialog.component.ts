import {Component, EventEmitter, inject} from '@angular/core';
import {MatDialogActions, MatDialogContent, MatDialogRef, MatDialogTitle} from '@angular/material/dialog';
import {Observable} from 'rxjs';
import {FileUploadProgressService} from '../../service/instance/file-upload-progress.service';
import {AsyncPipe} from "@angular/common";
import {MatButton} from "@angular/material/button";
import {MatProgressBar} from "@angular/material/progress-bar";

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
        MatDialogActions,
        MatProgressBar,
        MatDialogContent,
        MatDialogTitle
    ]
})
export class InstanceUploadDialogComponent {
    dialogRef = inject<MatDialogRef<InstanceUploadDialogComponent>>(MatDialogRef);
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
