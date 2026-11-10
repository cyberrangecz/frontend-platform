import { effect, inject, Injectable } from '@angular/core';
import { OpenWindow, OpenWindowsService } from '@crczp/utils';
import { SentinelAuthService } from '@sentinel/auth';
import { filter, pairwise } from 'rxjs';
import { AttachmentByteStore, STORED_ATTACHMENT_DEFINITIONS_KEY } from './attachment-byte-store.service';

/** How long a stored definition stays listed by no open window before its bytes are evicted. */
export const ATTACHMENT_EVICTION_GRACE_MS = 30_000;

/**
 * Evicts the stored attachment bytes of the signed-in user's definitions that no open window lists.
 * Only the oldest open window evicts, re-checking whenever the open windows change, and only a
 * definition it has seen listed by no window for the grace period, so a reloading window or a
 * newcomer still announcing itself keeps its bytes. Caches named without a user are deleted once
 * at creation, and every user's caches are deleted when the active user signs out.
 */
@Injectable({ providedIn: 'root' })
export class AttachmentStoreEviction {
    private readonly openWindows = inject(OpenWindowsService);
    private readonly store = inject(AttachmentByteStore);
    private readonly unlistedSince = new Map<number, number>();

    constructor() {
        this.store.clearUnscoped().subscribe();
        inject(SentinelAuthService)
            .activeUser$.pipe(
                pairwise(),
                filter(([previous, current]) => previous !== undefined && current === undefined),
            )
            .subscribe(() => this.store.clear().subscribe());
        effect(() => {
            const windows = this.openWindows.windows();
            if (windows[0]?.id === this.openWindows.self().id) {
                this.sweep(listedDefinitionsOf(windows));
            }
        });
    }

    private sweep(listed: ReadonlySet<number>): void {
        this.store.definitions().subscribe((stored) => {
            const now = Date.now();
            [...this.unlistedSince.keys()]
                .filter((definitionId) => listed.has(definitionId) || !stored.includes(definitionId))
                .forEach((definitionId) => this.unlistedSince.delete(definitionId));
            stored
                .filter((definitionId) => !listed.has(definitionId))
                .forEach((definitionId) => {
                    const since = this.unlistedSince.get(definitionId) ?? now;
                    if (now - since < ATTACHMENT_EVICTION_GRACE_MS) {
                        this.unlistedSince.set(definitionId, since);
                        return;
                    }
                    this.unlistedSince.delete(definitionId);
                    this.store.evict(definitionId).subscribe();
                });
        });
    }
}

function listedDefinitionsOf(windows: readonly OpenWindow[]): ReadonlySet<number> {
    return new Set(
        windows.flatMap((window) => {
            const listed = window.values[STORED_ATTACHMENT_DEFINITIONS_KEY];
            return Array.isArray(listed) ? listed.filter((definitionId): definitionId is number => typeof definitionId === 'number') : [];
        }),
    );
}
