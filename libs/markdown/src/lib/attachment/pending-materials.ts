import { computed, signal } from '@angular/core';
import { Observable, of, switchMap, throwError } from 'rxjs';
import { formatBytes } from './attachment-kind';
import { AttachmentMetadata } from './attachment-source';
import { captureMaterial, PendingMaterial } from './material-capture';
import { MaterialRefusedError } from './training-materials';

/** What a definition already stores, against which a new file is weighed. */
export interface StoredMaterialsQuota {
    readonly hashes: ReadonlySet<string>;
    readonly bytes: number;
    readonly budgetBytes: number;
}

/**
 * The files picked or dropped and not stored yet, keyed by hash. A concrete training materials
 * store composes it to hold pending files and to answer the source for their bytes, metadata and
 * posters until the definition is saved.
 */
export class PendingMaterials {
    private readonly entries = signal<ReadonlyMap<string, PendingMaterial>>(new Map());

    readonly list = computed(() => [...this.entries().values()]);
    readonly metadata = computed<readonly AttachmentMetadata[]>(() => this.list().map(({ metadata }) => metadata));
    readonly usedBytes = computed(() => this.metadata().reduce((total, { size }) => total + size, 0));

    find(hash: string): PendingMaterial | undefined {
        return this.entries().get(hash);
    }

    /**
     * Hashes and measures a file, then holds it as pending. A file already stored or pending
     * emits its existing metadata; a new one the quota cannot hold errors with a MaterialRefusedError.
     */
    add(file: File, stored: StoredMaterialsQuota): Observable<AttachmentMetadata> {
        return captureMaterial(file).pipe(
            switchMap((captured) => {
                const known = this.find(captured.metadata.hash)?.metadata;
                if (known) {
                    return of(known);
                }
                if (stored.hashes.has(captured.metadata.hash)) {
                    return of(captured.metadata);
                }
                const spare = stored.budgetBytes - stored.bytes - this.usedBytes();
                if (captured.metadata.size > spare) {
                    return throwError(() => new MaterialRefusedError(refusalText(file, spare)));
                }
                this.entries.update((entries) => new Map(entries).set(captured.metadata.hash, captured));
                return of(captured.metadata);
            }),
        );
    }

    remove(hash: string): void {
        this.entries.update((entries) => {
            const remaining = new Map(entries);
            remaining.delete(hash);
            return remaining;
        });
    }
}

function refusalText(file: File, spareBytes: number): string {
    return `${file.name} is ${formatBytes(file.size)} but only ${formatBytes(Math.max(0, spareBytes))} of the materials budget is left. Remove a material first.`;
}
