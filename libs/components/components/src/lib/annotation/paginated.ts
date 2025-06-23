import { inject, Type } from '@angular/core';
import { duration } from 'moment-mini';
import { PageSizeSettingToken } from '../settings/settings-tokens';

interface PaginationState {
    pageSize: number;
    lastUpdate: number;
}

type PaginationRegistry = Record<string, PaginationState>


const PAGINATION_REGISTRY_KEY = 'pagination';
const TIME_TO_LIVE = duration(1, 'month');

function readRegistry(): PaginationRegistry {
    const raw = localStorage.getItem(PAGINATION_REGISTRY_KEY);
    return raw ? JSON.parse(raw) as PaginationRegistry : {};
}

function writeRegistry(registry: PaginationRegistry): void {
    localStorage.setItem(PAGINATION_REGISTRY_KEY, JSON.stringify(registry));
}

export function Pageable(keyOverride?: string) {
    return function <Class>(target: Type<Class>) {

        const storageKey = keyOverride ? keyOverride : target.constructor.name;
        const defaultPagination = inject(PageSizeSettingToken);

        target.prototype.getPageSize = () => {
            const registry = readRegistry();
            const stored = storageKey in registry ? registry[storageKey] : null;
            return stored ? stored.pageSize : defaultPagination;
        };

        target.prototype.setPageSize = function(pageSize: number): void {
            const registry = readRegistry();
            registry[storageKey] = {
                pageSize: pageSize,
                lastUpdate: Date.now(),
            };
            writeRegistry(registry);
        };

        target.prototype.DEFAULT_PAGE_SIZE = defaultPagination;
    };
}

export function cleanupPageables() {
    const registry = readRegistry();
    const now = Date.now();
    Object.keys(registry).forEach(key => {
        const entry = registry[key];
    });


    writeRegistry(registry);
}
