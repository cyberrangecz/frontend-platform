import { Signal } from '@angular/core';
import { Observable } from 'rxjs';
import { AttachmentMetadata } from './attachment-source';

/** A file turned away from the materials; the message is written for the author. */
export class MaterialRefusedError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MaterialRefusedError';
    }
}

/** The state of a file being sent to the server: its progress, or why it failed. */
export type MaterialTransfer =
    | { readonly status: 'uploading'; readonly progress: number | null }
    | { readonly status: 'failed'; readonly message: string };

/**
 * The files of one training definition: stored materials and files picked but not yet stored,
 * which any level of the definition may reference. Every editor of the definition injects the
 * same instance, so all of them see the same materials and quota. Callers provide a concrete
 * store; the editor reads and changes the materials through it only.
 */
export abstract class TrainingMaterials {
    /** The stored materials followed by the pending ones. */
    abstract readonly materials: Signal<readonly AttachmentMetadata[]>;

    /** The bytes the definition's materials may take in all. */
    abstract readonly budgetBytes: Signal<number>;

    /** The bytes stored and pending materials take. */
    abstract readonly usedBytes: Signal<number>;

    /**
     * Holds a file picked from the device as pending and emits its metadata. A file whose hash is
     * already a material emits that material. Errors with a MaterialRefusedError when the file
     * would take the materials over the budget.
     */
    abstract add(file: File): Observable<AttachmentMetadata>;

    /** The transfers not finished, by material hash; a material absent here is stored. */
    abstract readonly transfers: Signal<ReadonlyMap<string, MaterialTransfer>>;

    /** Starts a failed transfer again. */
    abstract retry(hash: string): void;

    /** How many places across all levels of the definition reference the material. */
    abstract referenceCount(hash: string): number;

    /** Removes the material and every reference to it from the content of all levels. */
    abstract remove(hash: string): void;
}
