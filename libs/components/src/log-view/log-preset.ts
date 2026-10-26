import { LogPalette } from './log-palette';

/**
 * A named colour scheme the log view can be switched to.
 */
export interface LogPreset {
    readonly id: string;
    readonly label: string;
    readonly scheme: 'light' | 'dark';
    readonly group: 'platform' | 'other';
    readonly palette: LogPalette;
}
