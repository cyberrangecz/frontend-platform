import { signal, Signal, WritableSignal } from '@angular/core';
import { z } from 'zod';

/** Behaviour switches of a {@link PreferenceStore}. */
export interface PreferenceStoreOptions {
    /** Removes a stored entry that cannot be parsed or validated. Defaults to true. */
    readonly eraseInvalidValue?: boolean;
}

/**
 * Holds one localStorage preference object as a signal.
 *
 * A stored value that cannot be read, parsed or validated is replaced as a whole by the
 * defaults, so the value never mixes stored and default parts. Storage failures never throw.
 */
export class PreferenceStore<T extends object> {
    private readonly valueSignal: WritableSignal<T>;

    /** The current preference value. */
    readonly value: Signal<T>;

    /**
     * @param key localStorage key the preference persists under.
     * @param schema Describes the stored value; failing it counts as an invalid entry.
     * @param defaults Value used when nothing valid is stored.
     * @param options Behaviour switches.
     */
    constructor(
        private readonly key: string,
        private readonly schema: z.ZodType<T>,
        private readonly defaults: T,
        private readonly options: PreferenceStoreOptions = {},
    ) {
        this.valueSignal = signal(this.read());
        this.value = this.valueSignal.asReadonly();
    }

    /**
     * Merges the change into the current value, publishes it and writes it to localStorage.
     * Properties set to undefined are ignored. A merged value that fails the schema is discarded
     * and the current value stays. When writing fails the value stays in memory only.
     *
     * @param change Properties to overwrite.
     */
    update(change: Partial<T>): void {
        const definedChange = Object.fromEntries(
            Object.entries(change).filter(([, propertyValue]) => propertyValue !== undefined),
        );
        const validation = this.schema.safeParse({ ...this.valueSignal(), ...definedChange });
        if (!validation.success) {
            return;
        }
        const merged = validation.data;
        this.valueSignal.set(merged);
        try {
            localStorage.setItem(this.key, JSON.stringify(merged));
        } catch {
            // The value then lives in memory only.
        }
    }

    private read(): T {
        let stored: string | null;
        try {
            stored = localStorage.getItem(this.key);
        } catch {
            return this.copyOfDefaults();
        }
        if (stored === null) {
            return this.copyOfDefaults();
        }
        try {
            return this.schema.parse(JSON.parse(stored));
        } catch {
            this.eraseInvalidEntry();
            return this.copyOfDefaults();
        }
    }

    private copyOfDefaults(): T {
        return structuredClone(this.defaults);
    }

    private eraseInvalidEntry(): void {
        if (this.options.eraseInvalidValue === false) {
            return;
        }
        try {
            localStorage.removeItem(this.key);
        } catch {
            // Nothing to erase when storage is unavailable.
        }
    }
}
