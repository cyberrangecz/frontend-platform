import { inject, Injectable, Provider, Type } from '@angular/core';
import { duration, Duration } from 'moment-mini';
import { PortalConfig } from '../../types/config';

const PAGINATION_TTL = 30; //days

export interface PaginationState {
    pageSize: number;
    lastUpdate: number;
}

type PaginationRegistry = Record<string, PaginationState>;

@Injectable({ providedIn: 'root' })
export class PaginationRegistryService {
    private readonly storageKey = 'pagination';
    private readonly ttl: Duration = duration(PAGINATION_TTL, 'days');

    read(): PaginationRegistry {
        const raw = localStorage.getItem(this.storageKey);
        return raw ? (JSON.parse(raw) as PaginationRegistry) : {};
    }

    write(registry: PaginationRegistry): void {
        localStorage.setItem(this.storageKey, JSON.stringify(registry));
    }

    cleanup(): void {
        const now = Date.now();
        const registry = this.read();
        let modified = false;

        Object.keys(registry).forEach((key) => {
            if (now - registry[key].lastUpdate > this.ttl.asMilliseconds()) {
                delete registry[key];
                modified = true;
            }
        });

        if (modified) {
            this.write(registry);
        }
    }
}

export function providePaginationStorageService<T>(
    storageKey: Type<T> | string
): Provider {
    return {
        provide: PaginationStorageService,
        useFactory: () =>
            new PaginationStorageService(
                storageKey instanceof Type ? storageKey.name : storageKey,
                inject(PaginationRegistryService),
                inject(PortalConfig).defaultPageSize
            ),
    };
}

export class PaginationStorageService {
    constructor(
        private readonly storageKey: string,
        private readonly registryService: PaginationRegistryService,
        private readonly defaultPageSize: number
    ) {}

    loadPageSize(): number {
        this.registryService.cleanup();
        const registry = this.registryService.read();
        const entry = registry[this.storageKey];
        return entry ? entry.pageSize : this.defaultPageSize;
    }

    savePageSize(pageSize: number): void {
        const registry = this.registryService.read();
        registry[this.storageKey] = {
            pageSize,
            lastUpdate: Date.now(),
        };
        this.registryService.write(registry);
    }
}
