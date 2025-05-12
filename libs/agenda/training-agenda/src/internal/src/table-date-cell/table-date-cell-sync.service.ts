import { Injectable, WritableSignal } from '@angular/core';

@Injectable({
    providedIn: 'root',
})
export class TableDateCellSyncService {
    private listeners: Map<WritableSignal<number>, number> = new Map();

    register(isWideEnough: WritableSignal<number>): (state: number) => void {
        this.listeners.set(isWideEnough, 0);
        return (width: number) => this.update(width, isWideEnough);
    }

    private update(number: number, listener: WritableSignal<number>): void {
        this.listeners.set(listener, number);
        const max = Math.max(...this.listeners.values());
        for (const entry of this.listeners.keys()) {
            entry.set(max);
        }
    }

    unregister(isWideEnough: WritableSignal<number>) {
        return this.listeners.delete(isWideEnough);
    }
}
