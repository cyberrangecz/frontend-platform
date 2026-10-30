import { beforeEach, describe, expect, it, vi } from 'vitest';

const STORAGE_KEY = 'crczp-log-view-settings';

const DEFAULT_APPEARANCE = {
    fontFamily: 'Roboto Mono',
    fontSize: 14,
    fontWeight: 400,
    presetId: 'platform-light',
    highlightLevel: 'full',
};

async function freshSettings() {
    vi.resetModules();
    return import('./log-view-settings');
}

describe('log view settings', () => {
    beforeEach(() => localStorage.clear());

    it('defaults to wrapped lines, prettified JSON and the default appearance', async () => {
        const { LOG_VIEW_SETTINGS } = await freshSettings();
        expect(LOG_VIEW_SETTINGS.value()).toEqual({
            lineWrapping: true,
            jsonPrettified: true,
            ...DEFAULT_APPEARANCE,
        });
    });

    it('restores what was stored and fills the missing appearance with defaults', async () => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ lineWrapping: false, jsonPrettified: false }));
        const { LOG_VIEW_SETTINGS } = await freshSettings();
        expect(LOG_VIEW_SETTINGS.value()).toEqual({
            lineWrapping: false,
            jsonPrettified: false,
            ...DEFAULT_APPEARANCE,
        });
    });

    it('reads a stored preset that no longer exists as Platform light and keeps the other fields', async () => {
        localStorage.setItem(
            STORAGE_KEY,
            JSON.stringify({ lineWrapping: false, jsonPrettified: false, fontSize: 18, presetId: 'high-contrast-light' }),
        );
        const { LOG_VIEW_SETTINGS } = await freshSettings();
        expect(LOG_VIEW_SETTINGS.value()).toEqual({
            lineWrapping: false,
            jsonPrettified: false,
            ...DEFAULT_APPEARANCE,
            fontSize: 18,
        });
    });

    it('updates only the changed field and persists it', async () => {
        const { LOG_VIEW_SETTINGS } = await freshSettings();
        LOG_VIEW_SETTINGS.update({ fontSize: 18 });
        expect(LOG_VIEW_SETTINGS.value().fontSize).toBe(18);
        expect(LOG_VIEW_SETTINGS.value().lineWrapping).toBe(true);
        expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '').fontSize).toBe(18);
    });

    it.each([
        { fontSize: 9 },
        { fontSize: 25 },
        { fontSize: 12.5 },
        { fontWeight: 450 },
        { fontWeight: 1000 },
        { highlightLevel: 'loud' },
        { presetId: '' },
    ])('drops the invalid update %o', async (change) => {
        const { LOG_VIEW_SETTINGS } = await freshSettings();
        const before = LOG_VIEW_SETTINGS.value();
        LOG_VIEW_SETTINGS.update(change as never);
        expect(LOG_VIEW_SETTINGS.value()).toEqual(before);
    });

    it.each(['not json', '{"lineWrapping":1}', '{"lineWrapping":false}', 'null', '[]', '{"lineWrapping":true,"jsonPrettified":true,"fontSize":99}'])(
        'falls back to the defaults as a whole for corrupt value %s',
        async (stored) => {
            localStorage.setItem(STORAGE_KEY, stored);
            const { LOG_VIEW_SETTINGS, DEFAULT_LOG_VIEW_SETTINGS } = await freshSettings();
            expect(LOG_VIEW_SETTINGS.value()).toEqual(DEFAULT_LOG_VIEW_SETTINGS);
        },
    );
});
