import {
    COMMUNITY_DARK_PRESETS,
    COMMUNITY_LIGHT_PRESETS,
} from './log-community-presets';
import { HIGH_CONTRAST_DARK } from './log-high-contrast-presets';
import { PLATFORM_DARK, PLATFORM_LIGHT } from './log-palette';
import { LogPreset } from './log-preset';

export type { LogPreset } from './log-preset';

const PLATFORM_LIGHT_PRESET: LogPreset = {
    id: 'platform-light',
    label: 'Platform light',
    scheme: 'light',
    group: 'platform',
    palette: PLATFORM_LIGHT,
};

const PLATFORM_DARK_PRESET: LogPreset = {
    id: 'platform-dark',
    label: 'Platform dark',
    scheme: 'dark',
    group: 'platform',
    palette: PLATFORM_DARK,
};

export const DEFAULT_LOG_PRESET: LogPreset = PLATFORM_LIGHT_PRESET;

/**
 * Every preset in display order: platform light, platform dark and high contrast dark, then the
 * other presets, dark and light.
 */
export const LOG_PRESETS: readonly LogPreset[] = [
    PLATFORM_LIGHT_PRESET,
    PLATFORM_DARK_PRESET,
    HIGH_CONTRAST_DARK,
    ...COMMUNITY_DARK_PRESETS,
    ...COMMUNITY_LIGHT_PRESETS,
];
