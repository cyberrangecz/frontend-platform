import { PreferenceStore } from '@crczp/utils';
import { z } from 'zod';
import { LOG_HIGHLIGHT_LEVELS, LogHighlightLevel } from './log-highlight-level';
import { DEFAULT_LOG_VIEW_FONT_FAMILY } from './monospace-fonts';
import { DEFAULT_LOG_PRESET, LOG_PRESETS } from './log-presets';

/** Inclusive numeric range whose values are multiples of the step, counted from the minimum. */
export interface SettingRange {
    readonly min: number;
    readonly max: number;
    readonly step: number;
}

export const FONT_SIZE_RANGE: SettingRange = { min: 10, max: 24, step: 1 };
export const FONT_WEIGHT_RANGE: SettingRange = { min: 100, max: 900, step: 100 };

const DEFAULT_FONT_SIZE = 14;
const DEFAULT_FONT_WEIGHT = 400;

const rangeSchema = (range: SettingRange) =>
    z
        .number()
        .min(range.min)
        .max(range.max)
        .refine((value) => (value - range.min) % range.step === 0);

const logViewSettingsSchema = z.object({
    lineWrapping: z.boolean(),
    jsonPrettified: z.boolean(),
    fontFamily: z.string().min(1).default(DEFAULT_LOG_VIEW_FONT_FAMILY),
    fontSize: rangeSchema(FONT_SIZE_RANGE).default(DEFAULT_FONT_SIZE),
    fontWeight: rangeSchema(FONT_WEIGHT_RANGE).default(DEFAULT_FONT_WEIGHT),
    presetId: z
        .string()
        .refine((id) => LOG_PRESETS.some((preset) => preset.id === id))
        .catch(DEFAULT_LOG_PRESET.id),
    highlightLevel: z
        .enum(LOG_HIGHLIGHT_LEVELS as readonly [LogHighlightLevel, ...LogHighlightLevel[]])
        .default('full'),
});

export type LogViewSettings = z.infer<typeof logViewSettingsSchema>;

/** The appearance part of the settings, which the settings panel resets together. */
export type LogViewAppearance = Pick<
    LogViewSettings,
    'fontFamily' | 'fontSize' | 'fontWeight' | 'presetId' | 'highlightLevel'
>;

export const DEFAULT_LOG_VIEW_APPEARANCE: LogViewAppearance = {
    fontFamily: DEFAULT_LOG_VIEW_FONT_FAMILY,
    fontSize: DEFAULT_FONT_SIZE,
    fontWeight: DEFAULT_FONT_WEIGHT,
    presetId: DEFAULT_LOG_PRESET.id,
    highlightLevel: 'full',
};

export const DEFAULT_LOG_VIEW_SETTINGS: LogViewSettings = {
    lineWrapping: true,
    jsonPrettified: true,
    ...DEFAULT_LOG_VIEW_APPEARANCE,
};

/** Settings shared by every log view, persisted in localStorage. */
export const LOG_VIEW_SETTINGS = new PreferenceStore(
    'crczp-log-view-settings',
    logViewSettingsSchema,
    DEFAULT_LOG_VIEW_SETTINGS,
);
