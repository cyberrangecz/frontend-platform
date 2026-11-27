import { Injectable, signal } from '@angular/core';

const STORAGE_KEY = 'crczp-markdown-preview-width';

/** Narrowest and widest preview width, as a percentage of the editor's available width. */
export const MIN_PREVIEW_WIDTH_PERCENT = 30;
export const MAX_PREVIEW_WIDTH_PERCENT = 100;

/**
 * The width of the editing preview as a percentage of the editor's available width, shared by
 * every editor and remembered in the browser. It stays unset until a reader resizes the preview.
 */
@Injectable({ providedIn: 'root' })
export class PreviewWidth {
    private readonly stored = signal<number | null>(readStoredPercent());

    /** The remembered width in percent, or null while the preview keeps its default width. */
    readonly percent = this.stored.asReadonly();

    /** Sets the width of every editor's preview without remembering it yet. */
    set(percent: number): void {
        this.stored.set(clampPercent(percent));
    }

    /** Remembers the current width in the browser. */
    remember(): void {
        const percent = this.stored();
        if (percent !== null) {
            try {
                localStorage.setItem(STORAGE_KEY, String(percent));
            } catch {
                // Storage can be unavailable; the width then lasts until the page closes.
            }
        }
    }
}

/** The preview width a pointer position asks for, symmetric around the centre of the available width. */
export function percentForPointer(pointerX: number, centreX: number, availableWidth: number): number {
    return availableWidth > 0 ? ((2 * Math.abs(pointerX - centreX)) / availableWidth) * 100 : MAX_PREVIEW_WIDTH_PERCENT;
}

export function clampPercent(percent: number): number {
    return Math.round(Math.min(MAX_PREVIEW_WIDTH_PERCENT, Math.max(MIN_PREVIEW_WIDTH_PERCENT, percent)) * 10) / 10;
}

function readStoredPercent(): number | null {
    try {
        const value = Number(localStorage.getItem(STORAGE_KEY));
        return value > 0 ? clampPercent(value) : null;
    } catch {
        return null;
    }
}
