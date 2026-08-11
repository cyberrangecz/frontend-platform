import { inject, Injectable } from '@angular/core';
import { addMilliseconds, isAfter } from 'date-fns';
import { PortalConfig } from '@crczp/utils';

const NAMESPACE = 'crczp.entity';

type CacheEnvelope = {
    expiresAt: number;
    data: unknown;
};

/**
 * Entity-granular `localStorage` cache backing batch-by-id queries.
 *
 * Entries are scoped to the portal version and validated on every read, so a stale,
 * expired, corrupted or shape-changed entry resolves to a miss instead of reaching a
 * caller. Reads and writes never throw: an unavailable or full store degrades the
 * cache to a no-op rather than failing the request that uses it.
 *
 * Entries left behind by other portal versions are dropped when the service is
 * created, and the whole namespace is dropped when the running version is unknown,
 * since entries cannot be attributed to a version in that case.
 */
@Injectable({ providedIn: 'root' })
export class SplitEntityCache {
    private readonly version = inject(PortalConfig).version;

    constructor() {
        this.dropUnattributableEntries();
    }

    /**
     * Reads one entity as stored, returning undefined when it is absent, expired, or
     * unreadable. An expired or unreadable entry is evicted.
     *
     * @param key Cache key of the entity, unscoped.
     * @returns The stored payload, or undefined on a miss.
     */
    read(key: string): unknown {
        const storageKey = this.storageKey(key);
        const serialized = this.readRaw(storageKey);
        if (serialized === undefined) {
            return undefined;
        }

        try {
            const envelope = JSON.parse(serialized) as CacheEnvelope;
            if (!isAfter(new Date(envelope.expiresAt), new Date())) {
                this.evict(storageKey);
                return undefined;
            }
            return envelope.data;
        } catch {
            this.evict(storageKey);
            return undefined;
        }
    }

    /**
     * Stores one entity under the running portal version for the given lifetime.
     * A store that is full or unavailable leaves the cache untouched.
     *
     * @param key Cache key of the entity, unscoped.
     * @param entity Payload to store; must survive a JSON round trip.
     * @param ttlMs Lifetime of the entry.
     */
    write(key: string, entity: unknown, ttlMs: number): void {
        const envelope: CacheEnvelope = {
            expiresAt: addMilliseconds(new Date(), ttlMs).getTime(),
            data: entity,
        };
        try {
            localStorage.setItem(this.storageKey(key), JSON.stringify(envelope));
        } catch {
            /* Quota exceeded or storage unavailable — caching is best-effort. */
        }
    }

    private storageKey(key: string): string {
        return `${NAMESPACE}::${this.version}::${key}`;
    }

    private readRaw(storageKey: string): string | undefined {
        try {
            return localStorage.getItem(storageKey) ?? undefined;
        } catch {
            return undefined;
        }
    }

    private evict(storageKey: string): void {
        try {
            localStorage.removeItem(storageKey);
        } catch {
            /* Storage unavailable — nothing to evict. */
        }
    }

    private dropUnattributableEntries(): void {
        const ownPrefix = `${NAMESPACE}::${this.version}::`;
        try {
            const staleKeys = Object.keys(localStorage).filter(
                (key) =>
                    key.startsWith(`${NAMESPACE}::`) &&
                    (!this.version || !key.startsWith(ownPrefix)),
            );
            staleKeys.forEach((key) => localStorage.removeItem(key));
        } catch {
            /* Storage unavailable — nothing to drop. */
        }
    }
}
