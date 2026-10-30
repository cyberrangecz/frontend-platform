import {
    afterNextRender,
    ChangeDetectionStrategy,
    Component,
    computed,
    ElementRef,
    output,
    signal,
    viewChild,
} from '@angular/core';
import { CdkListbox, CdkOption } from '@angular/cdk/listbox';
import { MatButton } from '@angular/material/button';
import { MatOption } from '@angular/material/core';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatSelect } from '@angular/material/select';
import { MatSlider, MatSliderThumb } from '@angular/material/slider';
import { LOG_HIGHLIGHT_LEVELS, LogHighlightLevel } from './log-highlight-level';
import { LOG_PRESETS, LogPreset } from './log-presets';
import { discoverMonospaceFonts } from './monospace-fonts';
import {
    DEFAULT_LOG_VIEW_APPEARANCE,
    FONT_SIZE_RANGE,
    FONT_WEIGHT_RANGE,
    LOG_VIEW_SETTINGS,
    SettingRange,
} from './log-view-settings';

const LEVEL_LABELS: Record<LogHighlightLevel, string> = {
    none: 'None',
    errors: 'Errors',
    reduced: 'Reduced',
    full: 'Full',
};

interface PresetSection {
    readonly key: string;
    readonly label: string;
    readonly holds: (preset: LogPreset) => boolean;
}

const PRESET_SECTIONS: readonly PresetSection[] = [
    { key: 'platform', label: 'Platform', holds: (preset) => preset.group === 'platform' },
    {
        key: 'other-light',
        label: 'Other - light',
        holds: (preset) => preset.group === 'other' && preset.scheme === 'light',
    },
    {
        key: 'other-dark',
        label: 'Other - dark',
        holds: (preset) => preset.group === 'other' && preset.scheme === 'dark',
    },
];

const SCHEME_ICONS: Record<LogPreset['scheme'], string> = {
    light: 'light_mode',
    dark: 'dark_mode',
};

/** Matches the word naming the colour scheme within a preset label, with the space before it. */
const SCHEME_WORD = /\s+(light|dark)\b/i;

/**
 * Form that edits the appearance of every log view: colour preset, font and highlighting level.
 * Each change is written to the shared log view settings at once.
 */
@Component({
    selector: 'crczp-log-view-settings-panel',
    imports: [
        CdkListbox,
        CdkOption,
        MatButton,
        MatFormField,
        MatIcon,
        MatLabel,
        MatOption,
        MatSelect,
        MatSlider,
        MatSliderThumb,
    ],
    templateUrl: './log-view-settings-panel.component.html',
    styleUrl: './log-view-settings-panel.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LogViewSettingsPanel {
    /** Emits when the person presses Escape inside the panel. */
    readonly dismissed = output<void>();

    protected readonly fontSizeRange = FONT_SIZE_RANGE;
    protected readonly fontWeightRange = FONT_WEIGHT_RANGE;
    protected readonly levelIndexRange: SettingRange = {
        min: 0,
        max: LOG_HIGHLIGHT_LEVELS.length - 1,
        step: 1,
    };
    protected readonly levelLabels = LOG_HIGHLIGHT_LEVELS.map((level) => LEVEL_LABELS[level]);
    protected readonly presetGroups = this.groupPresets();
    protected readonly settings = LOG_VIEW_SETTINGS.value;
    protected readonly levelIndex = computed(() =>
        LOG_HIGHLIGHT_LEVELS.indexOf(this.settings().highlightLevel),
    );
    protected readonly fontFamilies = computed(() => {
        const current = this.settings().fontFamily;
        const discovered = this.discoveredFamilies();
        return discovered.includes(current) ? discovered : [current, ...discovered];
    });

    private readonly presetList = viewChild.required<CdkListbox, ElementRef<HTMLElement>>(CdkListbox, {
        read: ElementRef,
    });
    private readonly discoveredFamilies = signal<readonly string[]>([]);
    private readonly isFontListOpen = signal(false);
    private hasRequestedFonts = false;

    constructor() {
        afterNextRender(() => this.centreSelectedPreset());
    }

    protected readonly describeLevel = (index: number): string =>
        this.levelLabels[index] ?? '';

    /** Requests the installed monospace fonts the first time the font list opens. */
    protected onFontListToggled(isOpen: boolean): void {
        this.isFontListOpen.set(isOpen);
        if (!isOpen || this.hasRequestedFonts) return;
        this.hasRequestedFonts = true;
        discoverMonospaceFonts().subscribe((families) => this.discoveredFamilies.set(families));
    }

    protected selectFontFamily(fontFamily: string): void {
        LOG_VIEW_SETTINGS.update({ fontFamily });
    }

    protected selectPreset(presetIds: readonly unknown[]): void {
        const [presetId] = presetIds;
        if (typeof presetId === 'string') LOG_VIEW_SETTINGS.update({ presetId });
    }

    protected selectFontSize(fontSize: number): void {
        LOG_VIEW_SETTINGS.update({ fontSize });
    }

    protected selectFontWeight(fontWeight: number): void {
        LOG_VIEW_SETTINGS.update({ fontWeight });
    }

    protected changeLevel(levelIndex: number): void {
        const highlightLevel = LOG_HIGHLIGHT_LEVELS[levelIndex];
        if (highlightLevel) LOG_VIEW_SETTINGS.update({ highlightLevel });
    }

    protected reset(): void {
        LOG_VIEW_SETTINGS.update(DEFAULT_LOG_VIEW_APPEARANCE);
    }

    /** Closes the panel on Escape, leaving the key to the font list while that list is open. */
    protected dismiss(event: Event): void {
        if (this.isFontListOpen()) return;
        event.preventDefault();
        this.dismissed.emit();
    }

    /** Scrolls the preset list, and only the list, so the selected preset sits in its middle. */
    private centreSelectedPreset(): void {
        const list = this.presetList().nativeElement;
        const selected = list.querySelector<HTMLElement>('[aria-selected="true"]');
        if (!selected) return;
        list.scrollTop = selected.offsetTop - (list.clientHeight - selected.offsetHeight) / 2;
    }

    /**
     * Sorts the presets into the listed sections. Each preset is shown by its label without the
     * scheme word, next to the icon of its scheme.
     */
    private groupPresets() {
        return PRESET_SECTIONS.map(({ key, label, holds }) => ({
            key,
            label,
            options: LOG_PRESETS.filter(holds).map((preset) => ({
                preset,
                name: preset.label.replace(SCHEME_WORD, ''),
                icon: SCHEME_ICONS[preset.scheme],
            })),
        }));
    }
}
