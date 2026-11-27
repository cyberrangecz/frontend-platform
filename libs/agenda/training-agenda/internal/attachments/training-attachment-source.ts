import { inject, Injectable } from '@angular/core';
import {
    AttachmentContent,
    AttachmentDownloadEvent,
    AttachmentMetadata,
    AttachmentSource,
    PendingMaterials,
} from '@crczp/markdown';
import { AttachmentUrlCache, TrainingAttachmentApi } from '@crczp/training-api';
import { map, Observable, of, switchMap, tap } from 'rxjs';

/**
 * Reads the attachments of one training definition from the training service. Downloaded files
 * and posters are handed out as object URLs of the definition's cache scope, taken from the bytes
 * every tab shares when they are stored there and downloaded otherwise. A hash held by the given
 * pending materials is answered from the local file and its captured facts instead. A file found
 * to have no poster, locally or on the server, is not asked for one again while the definition is held.
 */
export class TrainingAttachmentSource extends AttachmentSource {
    constructor(
        private readonly api: TrainingAttachmentApi,
        private readonly urls: AttachmentUrlCache,
        private readonly definitionId: number,
        private readonly pending?: PendingMaterials,
    ) {
        super();
    }

    override metadata(hash: string): Observable<AttachmentMetadata | undefined> {
        const pending = this.pending?.find(hash);
        if (pending) {
            return of(pending.metadata);
        }
        return this.api.facts(this.definitionId, hash).pipe(
            map(
                (facts) =>
                    facts && {
                        hash,
                        fileName: facts.fileName,
                        mediaType: facts.mediaType,
                        size: facts.sizeBytes,
                        ...(facts.durationSeconds !== undefined && { durationSeconds: facts.durationSeconds }),
                        ...(facts.width !== undefined && { width: facts.width }),
                        ...(facts.height !== undefined && { height: facts.height }),
                    },
            ),
        );
    }

    override download(hash: string): Observable<AttachmentDownloadEvent> {
        const pending = this.pending?.find(hash);
        if (pending) {
            return of({ type: 'done', blob: pending.file });
        }
        return this.urls.storedUrl(this.definitionId, 'file', hash).pipe(
            switchMap((stored) =>
                stored
                    ? of<AttachmentDownloadEvent>({ type: 'done', url: stored })
                    : this.api.download(this.definitionId, hash).pipe(
                          map(
                              (event): AttachmentDownloadEvent =>
                                  event.type === 'progress'
                                      ? event
                                      : { type: 'done', url: this.urls.keep(this.definitionId, 'file', hash, event.blob) },
                          ),
                      ),
            ),
        );
    }

    override poster(hash: string): Observable<AttachmentContent | undefined> {
        const pending = this.pending?.find(hash);
        if (pending) {
            if (!pending.poster) {
                this.urls.notePosterAbsent(this.definitionId, hash);
            }
            return of(pending.poster && { blob: pending.poster });
        }
        if (this.urls.lacksPoster(this.definitionId, hash)) {
            return of(undefined);
        }
        return this.urls
            .resolve(this.definitionId, 'poster', hash, () => this.api.poster(this.definitionId, hash))
            .pipe(
                tap((url) => !url && this.urls.notePosterAbsent(this.definitionId, hash)),
                map((url) => url && { url }),
            );
    }

    override isPending(hash: string): boolean {
        return this.pending?.find(hash) !== undefined;
    }

    override isDownloaded(hash: string): boolean {
        return this.isPending(hash) || this.urls.has(this.definitionId, 'file', hash);
    }
}

/** Creates the attachment source of a training definition. */
@Injectable({ providedIn: 'root' })
export class TrainingAttachmentSourceFactory {
    private readonly api = inject(TrainingAttachmentApi);
    private readonly urls = inject(AttachmentUrlCache);

    create(definitionId: number, pending?: PendingMaterials): AttachmentSource {
        return new TrainingAttachmentSource(this.api, this.urls, definitionId, pending);
    }
}
