import { beforeEach, describe, expect, it } from 'vitest';
import { EditingViewPreference } from './editing-view.service';

describe('editing view preference', () => {
    beforeEach(() => localStorage.clear());

    it('starts in the raw view without a stored value', () => {
        expect(new EditingViewPreference().view()).toBe('raw');
    });

    it('ignores a stored value that is no view', () => {
        localStorage.setItem('crczp-markdown-editing-view', 'sideways');
        expect(new EditingViewPreference().view()).toBe('raw');
    });

    it('saves every switch and starts the next page load in it', () => {
        const preference = new EditingViewPreference();
        preference.set('preview');
        expect(preference.view()).toBe('preview');
        expect(new EditingViewPreference().view()).toBe('preview');
        preference.set('raw');
        expect(new EditingViewPreference().view()).toBe('raw');
    });

    it('shows one switch through every reader of the shared service', () => {
        const preference = new EditingViewPreference();
        const readers = [preference.view, preference.view];
        preference.set('preview');
        expect(readers.map((reader) => reader())).toEqual(['preview', 'preview']);
    });
});
