type Pagination = Record<string, number>;

import { Injectable } from '@angular/core';

const REGISTRY_KEY = 'pagination';

@Injectable({ providedIn: 'root' })
export class PaginationRegistryService {
    constructor() {
    }

    private activeKeys = new Set<string>();

    registerKey(key: string): void {
        this.activeKeys.add(key);
    }

    cleanupUnusedKeys(): void {
        const storedKeys: string[] = JSON.parse(localStorage.getItem(REGISTRY_KEY) || '[]');
        const unused = storedKeys.filter(k => !this.activeKeys.has(k));

        unused.forEach(k => localStorage.removeItem(k));
        localStorage.setItem(REGISTRY_KEY, JSON.stringify([...this.activeKeys]));
    }

    loadPreviousKeys(): string[] {
        return JSON.parse(localStorage.getItem(REGISTRY_KEY) || '[]');
    }
}
