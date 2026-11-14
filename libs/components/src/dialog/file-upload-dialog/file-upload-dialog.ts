import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { NgComponentOutlet } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MAT_DIALOG_DATA, MatDialog, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { NgxFileDragDropComponent } from 'ngx-file-drag-drop';
import { catchError, forkJoin, map, Observable, of, Subject, switchMap, take } from 'rxjs';
import { FileImportPreview } from './file-import-preview';

export interface FileUploadDialogConfig {
    title: string;
    subtitle?: string;
    accept?: string;
    mode?: 'single' | 'multiple';
    /** Reads each picked file and renders a card per entity; files are not previewed when absent. */
    preview?: FileImportPreview;
}

interface FileInspection {
    file: File;
    rejection: string | null;
    shownEntities: readonly unknown[];
    hiddenEntityCount: number;
}

const SHOWN_ENTITY_LIMIT = 50;
const UNREADABLE_FILE_REJECTION = 'The file could not be read';

@Component({
    selector: 'crczp-file-upload-dialog',
    standalone: true,
    imports: [
        MatDialogModule,
        MatButtonModule,
        MatIconModule,
        MatProgressBarModule,
        NgComponentOutlet,
        ReactiveFormsModule,
        NgxFileDragDropComponent,
    ],
    templateUrl: './file-upload-dialog.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrl: './file-upload-dialog.scss',
})
export class FileUploadDialog {
    protected fileFormControl = new FormControl<File[]>([]);
    protected dialogRef = inject<MatDialogRef<FileUploadDialog, File | File[] | null>>(MatDialogRef);
    protected data = inject<FileUploadDialogConfig>(MAT_DIALOG_DATA);
    protected readonly inspections = signal<readonly FileInspection[]>([]);
    protected readonly isReading = signal(false);
    protected readonly canUpload = computed(
        () =>
            !this.isReading() &&
            this.inspections().length > 0 &&
            this.inspections().every((inspection) => inspection.rejection === null),
    );

    private readonly pickedFiles = new Subject<File[]>();

    constructor() {
        this.pickedFiles
            .pipe(
                switchMap((files) =>
                    files.length > 0 ? forkJoin(files.map((file) => this.inspect(file))) : of([]),
                ),
                takeUntilDestroyed(inject(DestroyRef)),
            )
            .subscribe((inspections) => {
                this.inspections.set(inspections);
                this.isReading.set(false);
            });
    }

    public static open(matDialog: MatDialog, config: FileUploadDialogConfig) {
        return matDialog.open(FileUploadDialog, {
            data: config,
        });
    }

    onValueChange(files: File[]) {
        this.isReading.set(files.length > 0);
        this.pickedFiles.next(files);
    }

    clear() {
        this.fileFormControl.setValue(null);
    }

    isMultipleFileMode(): boolean {
        return this.data.mode === 'multiple';
    }

    confirm(): void {
        this.dialogRef.close(
            this.isMultipleFileMode() ? this.fileFormControl.value : this.fileFormControl.value[0],
        );
    }

    cancel(): void {
        this.dialogRef.close(null);
    }

    private inspect(file: File): Observable<FileInspection> {
        const preview = this.data.preview;
        if (!preview) {
            return of(this.toInspection(file, { entities: [] }));
        }
        return preview.readFile(file).pipe(
            take(1),
            catchError(() => of({ rejection: UNREADABLE_FILE_REJECTION })),
            map((result) => this.toInspection(file, result)),
        );
    }

    private toInspection(file: File, result: { entities: readonly unknown[] } | { rejection: string }): FileInspection {
        if ('rejection' in result) {
            return { file, rejection: result.rejection, shownEntities: [], hiddenEntityCount: 0 };
        }
        return {
            file,
            rejection: null,
            shownEntities: result.entities.slice(0, SHOWN_ENTITY_LIMIT),
            hiddenEntityCount: Math.max(0, result.entities.length - SHOWN_ENTITY_LIMIT),
        };
    }
}
