import { Injectable, signal } from '@angular/core';

export type EditingView = 'raw' | 'preview';

const STORAGE_KEY = 'crczp-markdown-editing-view';
const DEFAULT_VIEW: EditingView = 'raw';

/**
 * The view every markdown editor and the expanded editor show, shared across them and remembered
 * in the browser. Every switch becomes the remembered preference.
 */
@Injectable({ providedIn: 'root' })
export class EditingViewPreference {
    private readonly current = signal<EditingView>(readStoredView());

    /** The view all editors currently show. */
    readonly view = this.current.asReadonly();

    /** Switches every editor to the view and remembers it as the preference. */
    set(view: EditingView): void {
        this.current.set(view);
        try {
            localStorage.setItem(STORAGE_KEY, view);
        } catch {
            // Storage can be unavailable; the view then lasts until the page closes.
        }
    }
}

function readStoredView(): EditingView {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        return stored === 'raw' || stored === 'preview' ? stored : DEFAULT_VIEW;
    } catch {
        return DEFAULT_VIEW;
    }
}
