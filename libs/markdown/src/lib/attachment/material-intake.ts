import { inject, signal } from '@angular/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, concatMap, defer, EMPTY, finalize, from, Observable, tap, toArray } from 'rxjs';
import { AttachmentMetadata } from './attachment-source';
import { MaterialRefusedError, TrainingMaterials } from './training-materials';

const NOTICE_DURATION_MS = 6000;

/**
 * Takes files picked or dropped by the author into the training materials, one after another.
 * A file the materials refuse, or the browser cannot read, is reported in one snackbar for the
 * whole batch and left out of the result. Created in an injection context.
 */
export class MaterialIntake {
    private readonly materials = inject(TrainingMaterials);
    private readonly snackBar = inject(MatSnackBar);

    /** Whether files are being hashed and measured. */
    readonly working = signal(false);

    /**
     * Adds the files and emits the metadata of every one that was taken in, new or already a
     * material. With announceAdded, the snackbar also names what was added.
     */
    take(files: readonly File[], announceAdded = false): Observable<readonly AttachmentMetadata[]> {
        return defer(() => {
            const knownHashes = new Set(this.materials.materials().map(({ hash }) => hash));
            const refusals: string[] = [];
            this.working.set(true);
            return from(files).pipe(
                concatMap((file) =>
                    this.materials.add(file).pipe(
                        catchError((error: unknown) => {
                            refusals.push(error instanceof MaterialRefusedError ? error.message : `${file.name} could not be read.`);
                            return EMPTY;
                        }),
                    ),
                ),
                toArray(),
                tap((taken) => {
                    const notice = [announceAdded && taken.length > 0 ? describeAdded(taken, knownHashes) : '', ...refusals].filter(Boolean).join(' ');
                    if (notice) {
                        this.snackBar.open(notice, 'Dismiss', { duration: NOTICE_DURATION_MS });
                    }
                }),
                finalize(() => this.working.set(false)),
            );
        });
    }
}

/** Short notice naming the files that were added and those that were already materials. */
function describeAdded(taken: readonly AttachmentMetadata[], knownHashes: ReadonlySet<string>): string {
    const added = taken.filter(({ hash }) => !knownHashes.has(hash));
    const known = taken.filter(({ hash }) => knownHashes.has(hash));
    const parts: string[] = [];
    if (added.length > 0) {
        parts.push(added.length === 1 ? `Added ${added[0]?.fileName}.` : `Added ${added.length} files.`);
    }
    if (known.length > 0) {
        parts.push(`${known.map(({ fileName }) => fileName).join(', ')} already stored.`);
    }
    return parts.join(' ');
}
