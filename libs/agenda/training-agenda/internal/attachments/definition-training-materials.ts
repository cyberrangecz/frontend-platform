import { HttpErrorResponse } from '@angular/common/http';
import { computed, Signal, signal } from '@angular/core';
import {
    AttachmentMetadata,
    countReferencesTo,
    MaterialTransfer,
    PendingMaterial,
    PendingMaterials,
    TrainingMaterials,
    withoutReferencesTo,
} from '@crczp/markdown';
import { TrainingAttachmentApi } from '@crczp/training-api';
import { AttachmentSummary, AttachmentUploadEvent, PendingAttachmentUpload, TrainingMaterial } from '@crczp/training-model';
import { EMPTY, finalize, map, Observable, of, Subscription, switchMap, tap } from 'rxjs';

/** The markdown texts of every level of a definition, readable and rewritable as a whole. */
export abstract class DefinitionLevelTexts {
    /** Every markdown text of every level. */
    abstract readonly texts: Signal<readonly string[]>;

    /** Replaces each markdown text of every level with the result of the transform. */
    abstract rewrite(transform: (markdown: string) => string): void;
}

/**
 * The materials of one training definition: the files stored on the server, minus those removed
 * in the editor, plus the files picked and not stored yet. Once the definition has an id, a picked
 * file is linked by its hash, or uploaded when the server does not hold it, right away, and
 * becomes a stored material when that finishes. While the definition has no id, as before the
 * first save, nothing is stored and the budget is unbounded; the server enforces it on save.
 */
export class DefinitionTrainingMaterials extends TrainingMaterials {
    /** The files picked and not stored yet: the ones being sent, the ones that failed, and, before the first save, all. */
    readonly pending = new PendingMaterials();
    private readonly stored = signal<readonly AttachmentSummary[]>([]);
    private readonly storedBudgetBytes = signal(Number.POSITIVE_INFINITY);
    private readonly storedChanged = signal(false);
    private readonly transferStates = signal<ReadonlyMap<string, MaterialTransfer>>(new Map());
    private readonly runningTransfers = new Map<string, Subscription>();

    override readonly transfers = this.transferStates.asReadonly();

    /** Whether every picked file is stored: none is being sent and none failed. */
    readonly transfersSettled = computed(() => this.transferStates().size === 0);

    /** Whether the materials differ from the last load: files are pending, or a file was stored or removed since. */
    readonly hasUnsavedChanges = computed(() => this.pending.list().length > 0 || this.storedChanged());

    override readonly materials = computed<readonly AttachmentMetadata[]>(() => [
        ...this.stored().map(metadataOf),
        ...this.pending.metadata(),
    ]);
    override readonly budgetBytes = this.storedBudgetBytes.asReadonly();
    private readonly storedBytes = computed(() => this.stored().reduce((total, { sizeBytes }) => total + sizeBytes, 0));
    override readonly usedBytes = computed(() => this.storedBytes() + this.pending.usedBytes());

    /** The materials a save sends: stored and pending ones with the names the content refers to. */
    readonly materialsToSave = computed(() =>
        this.materials().map(({ hash, fileName }) => new TrainingMaterial(hash, fileName)),
    );

    constructor(
        private readonly api: TrainingAttachmentApi,
        private readonly levelTexts: DefinitionLevelTexts,
        private readonly definitionId: () => number | undefined,
    ) {
        super();
    }

    /** The pending files with the facts captured at pick time, ready to send with a save. */
    pendingUploads(): PendingAttachmentUpload[] {
        return this.pending.list().map(uploadOf);
    }

    /** Reads the stored materials and the budget from the server and drops the pending files that are neither being sent nor failed. */
    reload(): Observable<void> {
        const definitionId = this.definitionId();
        if (definitionId === undefined) {
            return EMPTY;
        }
        return this.api.list(definitionId).pipe(
            tap(({ materials, budgetBytes }) => {
                this.stored.set(materials);
                this.storedBudgetBytes.set(budgetBytes);
                this.storedChanged.set(false);
                this.pending
                    .list()
                    .filter(({ metadata }) => !this.transferStates().has(metadata.hash))
                    .forEach(({ metadata }) => this.pending.remove(metadata.hash));
            }),
            map(() => undefined),
        );
    }

    override add(file: File): Observable<AttachmentMetadata> {
        return this.pending
            .add(file, {
                hashes: new Set(this.stored().map(({ hash }) => hash)),
                bytes: this.storedBytes(),
                budgetBytes: this.budgetBytes(),
            })
            .pipe(tap(({ hash }) => this.startTransfer(hash)));
    }

    override retry(hash: string): void {
        this.startTransfer(hash);
    }

    override referenceCount(hash: string): number {
        return this.levelTexts.texts().reduce((total, markdown) => total + countReferencesTo(markdown, hash), 0);
    }

    override remove(hash: string): void {
        this.levelTexts.rewrite((markdown) => withoutReferencesTo(markdown, hash));
        this.pending.remove(hash);
        const transferring = this.transferStates().has(hash);
        this.endTransfer(hash);
        if (transferring || this.stored().some((summary) => summary.hash === hash)) {
            this.storedChanged.set(true);
        }
        this.stored.update((summaries) => summaries.filter((summary) => summary.hash !== hash));
    }

    /**
     * Links the pending file by its hash and uploads its bytes only when the server holds no file
     * with that hash. Does nothing without a definition id, for a file not pending, or while the
     * file is being sent.
     */
    private startTransfer(hash: string): void {
        const definitionId = this.definitionId();
        const material = this.pending.find(hash);
        if (definitionId === undefined || !material || this.runningTransfers.has(hash)) {
            return;
        }
        this.setTransfer(hash, { status: 'uploading', progress: null });
        const subscription = this.api
            .link(definitionId, hash, material.metadata.fileName)
            .pipe(
                switchMap((summary) =>
                    summary
                        ? of<AttachmentUploadEvent>({ type: 'done', summary })
                        : this.api.upload(definitionId, uploadOf(material)),
                ),
                finalize(() => this.runningTransfers.delete(hash)),
            )
            .subscribe({
                next: (event) =>
                    event.type === 'progress'
                        ? this.setTransfer(hash, {
                              status: 'uploading',
                              progress: event.total ? event.loaded / event.total : null,
                          })
                        : this.completeTransfer(event.summary),
                error: (error: unknown) => this.setTransfer(hash, { status: 'failed', message: failureMessageOf(error) }),
            });
        if (!subscription.closed) {
            this.runningTransfers.set(hash, subscription);
        }
    }

    private completeTransfer(summary: AttachmentSummary): void {
        this.stored.update((summaries) => [...summaries.filter(({ hash }) => hash !== summary.hash), summary]);
        this.pending.remove(summary.hash);
        this.storedChanged.set(true);
        this.endTransfer(summary.hash);
    }

    private setTransfer(hash: string, transfer: MaterialTransfer): void {
        this.transferStates.update((transfers) => new Map(transfers).set(hash, transfer));
    }

    private endTransfer(hash: string): void {
        this.runningTransfers.get(hash)?.unsubscribe();
        this.runningTransfers.delete(hash);
        this.transferStates.update((transfers) => {
            const remaining = new Map(transfers);
            remaining.delete(hash);
            return remaining;
        });
    }
}

function uploadOf({ file, metadata, poster }: PendingMaterial): PendingAttachmentUpload {
    return {
        file,
        hash: metadata.hash,
        ...(metadata.durationSeconds !== undefined && { durationSeconds: metadata.durationSeconds }),
        ...(metadata.width !== undefined && { width: metadata.width }),
        ...(metadata.height !== undefined && { height: metadata.height }),
        ...(poster && { poster }),
    };
}

function failureMessageOf(error: unknown): string {
    switch (error instanceof HttpErrorResponse ? error.status : undefined) {
        case 413:
            return 'Over the materials budget.';
        case 409:
            return 'The definition is released or used by an instance.';
        case 400:
            return 'The server rejected the file.';
        case 404:
            return 'The definition no longer exists.';
        default:
            return 'The upload failed.';
    }
}

function metadataOf(summary: AttachmentSummary): AttachmentMetadata {
    return {
        hash: summary.hash,
        fileName: summary.fileName,
        mediaType: summary.mediaType,
        size: summary.sizeBytes,
        ...(summary.durationSeconds !== undefined && { durationSeconds: summary.durationSeconds }),
        ...(summary.width !== undefined && { width: summary.width }),
        ...(summary.height !== undefined && { height: summary.height }),
    };
}
