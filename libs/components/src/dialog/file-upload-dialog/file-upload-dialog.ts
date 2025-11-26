import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgxFileDragDropComponent } from 'ngx-file-drag-drop';

export type FileType = 'json' | 'text' | 'image';

export interface FileUploadDialogConfig {
    title: string;
    subtitle?: string;
    fileTypeFilters?: FileType[];
    mode?: 'single' | 'multiple';
}

@Component({
    selector: 'crczp-file-upload-dialog',
    standalone: true,
    imports: [
        CommonModule,
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        ReactiveFormsModule,
        NgxFileDragDropComponent,
    ],
    templateUrl: './file-upload-dialog.html',
    styleUrl: './file-upload-dialog.scss',
})
export class FileUploadDialog {
    protected fileFormControl = new FormControl<File[]>([]);
    protected dialogRef =
        inject<MatDialogRef<FileUploadDialog, File | File[] | null>>(
            MatDialogRef,
        );
    protected data = inject(MAT_DIALOG_DATA);
    protected readonly filesUploaded = signal(false);

    public static open(matDialog: MatDialog, config: FileUploadDialogConfig) {
        return matDialog.open(FileUploadDialog, {
            data: config,
        });
    }

    onValueChange(files: File[]) {
        this.filesUploaded.set(files.length > 0);
    }

    clear() {
        this.fileFormControl.setValue(null);
    }

    isMultipleFileMode(): boolean {
        return this.data.mode === 'multiple';
    }

    confirm(): void {
        this.dialogRef.close(
            this.isMultipleFileMode()
                ? this.fileFormControl.value
                : this.fileFormControl.value[0],
        );
    }

    cancel(): void {
        this.dialogRef.close(null);
    }
}
