import { LogPreset } from './log-preset';

/**
 * Black background; the foreground and every token colour reach at least 7:1, bright black at
 * least 4.5:1.
 */
export const HIGH_CONTRAST_DARK: LogPreset = {
    id: 'high-contrast-dark',
    label: 'High contrast dark',
    scheme: 'dark',
    group: 'platform',
    palette: {
        background: '#000000',
        foreground: '#ffffff',
        cursor: '#ffffff',
        selectionBackground: '#1d3f8f',
        selectionForeground: '#ffffff',
        ansi: [
            '#808080',
            '#ff6e6e',
            '#4cff4c',
            '#ffd84d',
            '#8aa4ff',
            '#ff7de0',
            '#3ee8e8',
            '#e6e6e6',
            '#9a9a9a',
            '#ff9a9a',
            '#8dff8d',
            '#fff08a',
            '#adbfff',
            '#ffa8ee',
            '#80f5f5',
            '#ffffff',
        ],
    },
};
