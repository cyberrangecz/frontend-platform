import { inject, Injectable } from '@angular/core';
import { SentinelAuthService } from '@sentinel/auth';
import { catchError, defer, EMPTY, from, map, Observable, of, switchMap } from 'rxjs';

/** The open-windows value key under which each window lists the definitions whose stored bytes it uses. */
export const STORED_ATTACHMENT_DEFINITIONS_KEY = 'training.attachmentDefinitions';

const STORE_NAME_PREFIX = 'crczp-attachments-';
const LEGACY_STORE_NAME = /^crczp-attachments-\d+$/;
const ENTRY_PATH_PREFIX = '/crczp-attachments/';

/**
 * Attachment bytes kept in the browser's Cache Storage, which every tab of the origin shares, in one
 * cache per signed-in user and definition. Entries are named by a key unique within their
 * definition. Without a signed-in user, and with a storage that fails or is unavailable, reads come
 * back empty and writes are left undone.
 */
@Injectable({ providedIn: 'root' })
export class AttachmentByteStore {
    private readonly authentication = inject(SentinelAuthService);

    /** The stored bytes under the key; undefined when none are stored. */
    read(definitionId: number, key: string): Observable<Blob | undefined> {
        return defer(() => from(caches.match(entryPathOf(key), { cacheName: this.storeNameOf(definitionId) }))).pipe(
            switchMap((response) => (response ? from(response.blob()) : of(undefined))),
            catchError(() => of(undefined)),
        );
    }

    /** Stores the bytes under the key; completes without a value once written or failed. */
    write(definitionId: number, key: string, blob: Blob): Observable<never> {
        return defer(() => from(caches.open(this.storeNameOf(definitionId)))).pipe(
            switchMap((cache) =>
                from(cache.put(entryPathOf(key), new Response(blob, { headers: { 'Content-Type': blob.type } }))),
            ),
            switchMap(() => EMPTY),
            catchError(() => EMPTY),
        );
    }

    /** The keys stored for the definition. */
    keys(definitionId: number): Observable<string[]> {
        return defer(() => {
            const name = this.storeNameOf(definitionId);
            return from(caches.has(name)).pipe(switchMap((exists) => (exists ? from(caches.open(name)) : of(undefined))));
        }).pipe(
            switchMap((cache) => (cache ? from(cache.keys()) : of([]))),
            map((requests) => requests.map((request) => new URL(request.url).pathname.slice(ENTRY_PATH_PREFIX.length))),
            catchError(() => of([])),
        );
    }

    /** The definitions with bytes stored for the signed-in user. */
    definitions(): Observable<number[]> {
        return defer(() => from(caches.keys())).pipe(
            map((names) => {
                const prefix = this.userPrefix();
                return prefix
                    ? names
                          .filter((name) => name.startsWith(prefix) && /^\d+$/.test(name.slice(prefix.length)))
                          .map((name) => Number(name.slice(prefix.length)))
                    : [];
            }),
            catchError(() => of([])),
        );
    }

    /** Deletes every entry of the definition; completes without a value once done or failed. */
    evict(definitionId: number): Observable<never> {
        return defer(() => from(caches.delete(this.storeNameOf(definitionId)))).pipe(
            switchMap(() => EMPTY),
            catchError(() => EMPTY),
        );
    }

    /** Deletes the bytes of every user; completes without a value once done or failed. */
    clear(): Observable<never> {
        return this.deleteCachesWhere((name) => name.startsWith(STORE_NAME_PREFIX));
    }

    /** Deletes the caches named without a user; completes without a value once done or failed. */
    clearUnscoped(): Observable<never> {
        return this.deleteCachesWhere((name) => LEGACY_STORE_NAME.test(name));
    }

    private deleteCachesWhere(matches: (name: string) => boolean): Observable<never> {
        return defer(() => from(caches.keys())).pipe(
            switchMap((names) => Promise.all(names.filter(matches).map((name) => caches.delete(name)))),
            switchMap(() => EMPTY),
            catchError(() => EMPTY),
        );
    }

    private userPrefix(): string | undefined {
        const userId = this.authentication.getActiveUser()?.id;
        return userId === undefined ? undefined : `${STORE_NAME_PREFIX}${encodeURIComponent(userId)}.`;
    }

    private storeNameOf(definitionId: number): string {
        const prefix = this.userPrefix();
        if (!prefix) {
            throw new Error('No signed-in user');
        }
        return `${prefix}${definitionId}`;
    }
}

function entryPathOf(key: string): string {
    return `${ENTRY_PATH_PREFIX}${key}`;
}
