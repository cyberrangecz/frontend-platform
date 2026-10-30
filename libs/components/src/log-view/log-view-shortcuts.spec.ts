import { describe, expect, it } from 'vitest';
import { describeLogViewShortcuts, isMacPlatform, matchLogViewShortcut } from './log-view-shortcuts';

const press = (init: KeyboardEventInit) => new KeyboardEvent('keydown', init);

describe('matchLogViewShortcut', () => {
    it.each([
        ['KeyW', 'lineWrap'],
        ['KeyP', 'prettifyJson'],
        ['KeyF', 'fullscreen'],
        ['KeyC', 'copy'],
        ['KeyD', 'download'],
        ['KeyS', 'settings'],
    ])('matches Alt+Shift with %s to %s on both platforms', (code, action) => {
        for (const isMac of [false, true]) {
            const event = press({ code, key: code.slice(3), altKey: true, shiftKey: true });
            expect(matchLogViewShortcut(event, isMac)).toBe(action);
        }
    });

    it('matches by the physical key when Option on macOS changes the typed character', () => {
        const event = press({ code: 'KeyW', key: '„', altKey: true, shiftKey: true });
        expect(matchLogViewShortcut(event, true)).toBe('lineWrap');
    });

    it('matches Ctrl+F, Ctrl+Home and Ctrl+End to search and scrolling outside macOS', () => {
        expect(matchLogViewShortcut(press({ code: 'KeyF', key: 'f', ctrlKey: true }), false)).toBe('search');
        expect(matchLogViewShortcut(press({ code: 'Home', key: 'Home', ctrlKey: true }), false)).toBe('scrollToTop');
        expect(matchLogViewShortcut(press({ code: 'End', key: 'End', ctrlKey: true }), false)).toBe('scrollToEnd');
    });

    it('matches Cmd+F, Cmd+ArrowUp and Cmd+ArrowDown to search and scrolling on macOS', () => {
        expect(matchLogViewShortcut(press({ code: 'KeyF', key: 'f', metaKey: true }), true)).toBe('search');
        expect(matchLogViewShortcut(press({ code: 'ArrowUp', key: 'ArrowUp', metaKey: true }), true)).toBe(
            'scrollToTop',
        );
        expect(matchLogViewShortcut(press({ code: 'ArrowDown', key: 'ArrowDown', metaKey: true }), true)).toBe(
            'scrollToEnd',
        );
    });

    it("leaves the other platform's search and scroll keys unmatched", () => {
        expect(matchLogViewShortcut(press({ code: 'KeyF', ctrlKey: true }), true)).toBeUndefined();
        expect(matchLogViewShortcut(press({ code: 'Home', ctrlKey: true }), true)).toBeUndefined();
        expect(matchLogViewShortcut(press({ code: 'End', ctrlKey: true }), true)).toBeUndefined();
        expect(matchLogViewShortcut(press({ code: 'KeyF', metaKey: true }), false)).toBeUndefined();
        expect(matchLogViewShortcut(press({ code: 'ArrowUp', metaKey: true }), false)).toBeUndefined();
    });

    it('ignores a key press whose modifiers differ from the shortcut', () => {
        expect(matchLogViewShortcut(press({ code: 'KeyW', altKey: true }), false)).toBeUndefined();
        const tooManyModifiers = press({ code: 'KeyW', altKey: true, shiftKey: true, ctrlKey: true });
        expect(matchLogViewShortcut(tooManyModifiers, false)).toBeUndefined();
        expect(matchLogViewShortcut(press({ code: 'KeyF', ctrlKey: true, shiftKey: true }), false)).toBeUndefined();
        expect(matchLogViewShortcut(press({ code: 'KeyF', metaKey: true, shiftKey: true }), true)).toBeUndefined();
        expect(matchLogViewShortcut(press({ code: 'Home' }), false)).toBeUndefined();
    });
});

describe('describeLogViewShortcuts', () => {
    it('writes modifier names joined by plus signs outside macOS', () => {
        const shortcuts = describeLogViewShortcuts(false);
        expect(shortcuts.lineWrap).toBe('Alt+Shift+W');
        expect(shortcuts.search).toBe('Ctrl+F');
        expect(shortcuts.scrollToTop).toBe('Ctrl+Home');
        expect(shortcuts.scrollToEnd).toBe('Ctrl+End');
    });

    it('writes modifier symbols on macOS', () => {
        const shortcuts = describeLogViewShortcuts(true);
        expect(shortcuts.lineWrap).toBe('⌥⇧W');
        expect(shortcuts.download).toBe('⌥⇧D');
        expect(shortcuts.search).toBe('⌘F');
        expect(shortcuts.scrollToTop).toBe('⌘↑');
        expect(shortcuts.scrollToEnd).toBe('⌘↓');
    });
});

describe('isMacPlatform', () => {
    it('recognises macOS and iOS user agents only', () => {
        expect(isMacPlatform('Mozilla/5.0 (Macintosh; Intel Mac OS X 14_5) AppleWebKit/605.1.15')).toBe(true);
        expect(isMacPlatform('Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X)')).toBe(true);
        expect(isMacPlatform('Mozilla/5.0 (X11; Linux x86_64) Gecko/20100101 Firefox/131.0')).toBe(false);
        expect(isMacPlatform('Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/130.0')).toBe(false);
    });
});
