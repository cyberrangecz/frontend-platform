import {inject, Injectable, Provider, Type} from '@angular/core';
import {Duration} from 'moment-mini';
import {PAGE_SIZE_SETTING_TOKEN, PAGINATION_TTL_TOKEN} from '../../settings/settings-tokens';


export interface PaginationState {
    pageSize: number;
    lastUpdate: number;
}

type PaginationRegistry = Record<string, PaginationState>;

@Injectable({ providedIn: 'root' })
export class PaginationRegistryService {
    private readonly storageKey = 'pagination';
    private readonly ttl: Duration = inject(PAGINATION_TTL_TOKEN);

    read(): PaginationRegistry {
        const raw = localStorage.getItem(this.storageKey);
        return raw ? JSON.parse(raw) as PaginationRegistry : {};
    }

    write(registry: PaginationRegistry): void {
        localStorage.setItem(this.storageKey, JSON.stringify(registry));
    }

    cleanup(): void {
        const now = Date.now();
        const registry = this.read();
        let modified = false;

        Object.keys(registry).forEach(key => {
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
        useFactory: () => new PaginationStorageService(
            storageKey instanceof Type ? storageKey.name : storageKey,
            inject(PaginationRegistryService),
            inject(PAGE_SIZE_SETTING_TOKEN)
        )
    };
}

export class PaginationStorageService {
    constructor(
        private readonly storageKey: string,
        private readonly registryService: PaginationRegistryService,
        private readonly defaultPageSize: number
    ) {
        this.DEFAULT_PAGE_SIZE = defaultPageSize || 10;
    }

    public readonly DEFAULT_PAGE_SIZE: number;

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
            lastUpdate: Date.now()
        };
        this.registryService.write(registry);
    }
}
