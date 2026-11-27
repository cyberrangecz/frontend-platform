import { inject, Injectable, signal, WritableSignal } from '@angular/core';
import { OpenWindowsService } from '@crczp/utils';
import { map, Observable, of, switchMap } from 'rxjs';
import { AttachmentByteStore, STORED_ATTACHMENT_DEFINITIONS_KEY } from './attachment-byte-store.service';
import { AttachmentStoreEviction } from './attachment-store-eviction.service';

export type AttachmentUrlKind = 'file' | 'poster';

interface DefinitionScope {
    holders: number;
    urls: Map<string, string>;
    available: WritableSignal<ReadonlySet<string>>;
    postersAbsent: Set<string>;
    releaseTimer?: ReturnType<typeof setTimeout>;
}

/**
 * Blob URLs of downloaded files and posters, grouped by definition, over bytes kept in a store every
 * tab shares. A definition's URLs live in this tab while at least one view of it holds the
 * definition and are revoked once the last holder lets go. The held definitions are published to
 * the other open windows, and their stored bytes outlive the URLs until no open window lists the
 * definition, so a reload or another tab reads them without downloading.
 */
@Injectable({ providedIn: 'root' })
export class AttachmentUrlCache {
    private readonly store = inject(AttachmentByteStore);
    private readonly openWindows = inject(OpenWindowsService);
    private readonly scopes = new Map<number, DefinitionScope>();

    constructor() {
        inject(AttachmentStoreEviction);
    }

    /**
     * Registers a view of the definition and returns the function that ends that hold. The URLs are
     * revoked on the macrotask after the last hold ends, unless the definition is held again by
     * then, so a page replacing another page of the same definition keeps them.
     */
    hold(definitionId: number): () => void {
        const scope = this.scopes.get(definitionId) ?? this.openScope(definitionId);
        clearTimeout(scope.releaseTimer);
        scope.releaseTimer = undefined;
        scope.holders++;

        let ended = false;
        return () => {
            if (ended) {
                return;
            }
            ended = true;
            if (--scope.holders === 0) {
                scope.releaseTimer = setTimeout(() => this.revokeScope(definitionId, scope));
            }
        };
    }

    /**
     * Whether the bytes are at hand without a transfer, in this tab or in the shared store. Reads a
     * signal, so a reactive caller follows the store's index as it loads.
     */
    has(definitionId: number, kind: AttachmentUrlKind, hash: string): boolean {
        return this.scopes.get(definitionId)?.available().has(keyOf(kind, hash)) ?? false;
    }

    /** Whether the file is known to have no poster, so asking the server for one is pointless. */
    lacksPoster(definitionId: number, hash: string): boolean {
        return this.scopes.get(definitionId)?.postersAbsent.has(hash) ?? false;
    }

    /** Remembers, while the definition is held, that the file has no poster. */
    notePosterAbsent(definitionId: number, hash: string): void {
        this.scopes.get(definitionId)?.postersAbsent.add(hash);
    }

    /** The URL of the bytes held in this tab or in the shared store; undefined when neither has them. */
    storedUrl(definitionId: number, kind: AttachmentUrlKind, hash: string): Observable<string | undefined> {
        const key = keyOf(kind, hash);
        const url = this.scopes.get(definitionId)?.urls.get(key);
        if (url) {
            return of(url);
        }
        return this.store.read(definitionId, key).pipe(map((blob) => blob && this.urlOf(definitionId, key, blob)));
    }

    /**
     * Keeps downloaded bytes in the shared store and returns their URL. Bytes arriving after their
     * definition was released are neither stored nor cached, and their URL is already revoked.
     */
    keep(definitionId: number, kind: AttachmentUrlKind, hash: string, blob: Blob): string {
        const key = keyOf(kind, hash);
        if (this.scopes.has(definitionId)) {
            this.store.write(definitionId, key, blob).subscribe();
        }
        return this.urlOf(definitionId, key, blob);
    }

    /** The URL of the stored bytes, or of the blob `load` emits, which is kept; undefined when `load` emits no blob. */
    resolve(
        definitionId: number,
        kind: AttachmentUrlKind,
        hash: string,
        load: () => Observable<Blob | undefined>,
    ): Observable<string | undefined> {
        return this.storedUrl(definitionId, kind, hash).pipe(
            switchMap((url) =>
                url ? of(url) : load().pipe(map((blob) => blob && this.keep(definitionId, kind, hash, blob))),
            ),
        );
    }

    private openScope(definitionId: number): DefinitionScope {
        const scope: DefinitionScope = { holders: 0, urls: new Map(), available: signal(new Set()), postersAbsent: new Set() };
        this.scopes.set(definitionId, scope);
        this.publishHeld();
        this.store
            .keys(definitionId)
            .subscribe((keys) => scope.available.update((available) => new Set([...available, ...keys])));
        return scope;
    }

    /** The one URL of the key in this tab, created for the blob when none exists yet. */
    private urlOf(definitionId: number, key: string, blob: Blob): string {
        const scope = this.scopes.get(definitionId);
        const existing = scope?.urls.get(key);
        if (existing) {
            return existing;
        }
        const url = URL.createObjectURL(blob);
        if (!scope) {
            URL.revokeObjectURL(url);
            return url;
        }
        scope.urls.set(key, url);
        scope.available.update((available) => new Set(available).add(key));
        return url;
    }

    private revokeScope(definitionId: number, scope: DefinitionScope): void {
        scope.urls.forEach((url) => URL.revokeObjectURL(url));
        this.scopes.delete(definitionId);
        this.publishHeld();
    }

    private publishHeld(): void {
        this.openWindows.setValue(STORED_ATTACHMENT_DEFINITIONS_KEY, [...this.scopes.keys()]);
    }
}

function keyOf(kind: AttachmentUrlKind, hash: string): string {
    return `${kind}/${hash}`;
}
