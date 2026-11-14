import { DestroyRef, inject, Injectable, Provider, signal } from '@angular/core';
import { toObservable } from '@angular/core/rxjs-interop';
import { AttachmentContent, AttachmentDownloadEvent, AttachmentMetadata, AttachmentSource } from '@crczp/markdown';
import { AttachmentUrlCache } from '@crczp/training-api';
import { filter, map, Observable, switchMap } from 'rxjs';
import { TrainingAttachmentSourceFactory } from './training-attachment-source';

/**
 * The attachment source of the definition a view shows, for views that learn the definition id
 * after they are created. Every read waits for the id and follows the definition named last.
 */
@Injectable()
export class ShownDefinitionAttachmentSource extends AttachmentSource {
    private readonly factory = inject(TrainingAttachmentSourceFactory);
    private readonly urls = inject(AttachmentUrlCache);
    private readonly definitionId = signal<number | undefined>(undefined);
    private endHold: (() => void) | undefined;
    private readonly source$ = toObservable(this.definitionId).pipe(
        filter((id) => id !== undefined),
        map((id) => this.factory.create(id)),
    );

    constructor() {
        super();
        inject(DestroyRef).onDestroy(() => this.endHold?.());
    }

    /** Names the shown definition; the view holds its cache scope until it names another or is destroyed; reads that waited for it start, and later reads use it. */
    show(definitionId: number | undefined): void {
        this.endHold?.();
        this.endHold = definitionId === undefined ? undefined : this.urls.hold(definitionId);
        this.definitionId.set(definitionId);
    }

    override metadata(hash: string): Observable<AttachmentMetadata | undefined> {
        return this.source$.pipe(switchMap((source) => source.metadata(hash)));
    }

    override download(hash: string): Observable<AttachmentDownloadEvent> {
        return this.source$.pipe(switchMap((source) => source.download(hash)));
    }

    override poster(hash: string): Observable<AttachmentContent | undefined> {
        return this.source$.pipe(switchMap((source) => source.poster(hash)));
    }

    override isPending(): boolean {
        return false;
    }

    override isDownloaded(hash: string): boolean {
        const id = this.definitionId();
        return id !== undefined && this.urls.has(id, 'file', hash);
    }
}

/** Provides the shown-definition source as the attachment source of a view and its children. */
export const SHOWN_DEFINITION_ATTACHMENTS: Provider[] = [
    ShownDefinitionAttachmentSource,
    { provide: AttachmentSource, useExisting: ShownDefinitionAttachmentSource },
];
