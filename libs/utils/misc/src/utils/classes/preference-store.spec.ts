import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { PreferenceStore } from './preference-store';

const STORAGE_KEY = 'test.preference';
const schema = z.object({ mode: z.enum(['a', 'b']), size: z.number() });
const defaults = { mode: 'a' as const, size: 1 };

describe('PreferenceStore', () => {
    beforeEach(() => localStorage.clear());
    afterEach(() => vi.restoreAllMocks());

    it('reads a valid stored value', () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: 'b', size: 5 }));
        expect(new PreferenceStore(STORAGE_KEY, schema, defaults).value()).toEqual({ mode: 'b', size: 5 });
    });

    it('yields the defaults when the key is missing', () => {
        expect(new PreferenceStore(STORAGE_KEY, schema, defaults).value()).toEqual(defaults);
    });

    it('yields the defaults and erases the entry when the JSON is unparsable', () => {
        localStorage.setItem(STORAGE_KEY, '{broken');
        expect(new PreferenceStore(STORAGE_KEY, schema, defaults).value()).toEqual(defaults);
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('yields the whole defaults and erases the entry when validation fails', () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ mode: 'b', size: 'wide' }));
        expect(new PreferenceStore(STORAGE_KEY, schema, defaults).value()).toEqual(defaults);
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('keeps the invalid entry when erasing is opted out', () => {
        localStorage.setItem(STORAGE_KEY, '{"mode":"x"}');
        const store = new PreferenceStore(STORAGE_KEY, schema, defaults, { eraseInvalidValue: false });
        expect(store.value()).toEqual(defaults);
        expect(localStorage.getItem(STORAGE_KEY)).toBe('{"mode":"x"}');
    });

    it('yields the defaults when reading throws', () => {
        vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
            throw new Error('denied');
        });
        expect(new PreferenceStore(STORAGE_KEY, schema, defaults).value()).toEqual(defaults);
    });

    it('yields the defaults when erasing an invalid entry throws', () => {
        localStorage.setItem(STORAGE_KEY, 'nope');
        vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
            throw new Error('denied');
        });
        expect(new PreferenceStore(STORAGE_KEY, schema, defaults).value()).toEqual(defaults);
    });

    it('merges an update, updates the signal and writes JSON', () => {
        const store = new PreferenceStore(STORAGE_KEY, schema, defaults);
        store.update({ size: 9 });
        expect(store.value()).toEqual({ mode: 'a', size: 9 });
        expect(JSON.parse(localStorage.getItem(STORAGE_KEY) as string)).toEqual({ mode: 'a', size: 9 });
    });

    it('keeps the value in memory when writing throws', () => {
        vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
            throw new Error('full');
        });
        const store = new PreferenceStore(STORAGE_KEY, schema, defaults);
        expect(() => store.update({ mode: 'b' })).not.toThrow();
        expect(store.value().mode).toBe('b');
    });

    it('ignores a change property that is undefined', () => {
        const store = new PreferenceStore(STORAGE_KEY, schema, defaults);
        store.update({ size: 9 });
        store.update({ size: undefined, mode: 'b' });
        expect(store.value()).toEqual({ mode: 'b', size: 9 });
    });

    it('discards an update whose merged value fails the schema', () => {
        const store = new PreferenceStore(STORAGE_KEY, schema, defaults);
        store.update({ mode: 'x' as 'a' });
        expect(store.value()).toEqual(defaults);
        expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
    });

    it('does not share the defaults by reference', () => {
        const store = new PreferenceStore(STORAGE_KEY, schema, defaults);
        expect(store.value()).not.toBe(defaults);
        expect(new PreferenceStore(STORAGE_KEY, schema, defaults).value()).not.toBe(store.value());
    });
});
