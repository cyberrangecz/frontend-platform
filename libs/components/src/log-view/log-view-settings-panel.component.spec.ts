import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LogViewSettingsPanel } from './log-view-settings-panel.component';
import { DEFAULT_LOG_VIEW_APPEARANCE, LOG_VIEW_SETTINGS } from './log-view-settings';

const discoverMonospaceFonts = vi.hoisted(() => vi.fn());
vi.mock('./monospace-fonts', async (importOriginal) => ({
    ...(await importOriginal<typeof import('./monospace-fonts')>()),
    discoverMonospaceFonts,
}));

describe('LogViewSettingsPanel', () => {
    let fixture: ComponentFixture<LogViewSettingsPanel>;

    const element = () => fixture.nativeElement as HTMLElement;
    const sliderThumb = (labelId: string) =>
        element().querySelector(`input[matSliderThumb][aria-labelledby="${labelId}"]`) as HTMLInputElement;
    const slide = (labelId: string, value: number) => {
        const thumb = sliderThumb(labelId);
        thumb.value = String(value);
        thumb.dispatchEvent(new Event('input'));
        thumb.dispatchEvent(new Event('change'));
        fixture.detectChanges();
    };
    const presetOption = (label: string) =>
        [...element().querySelectorAll<HTMLElement>('[role="option"]')].find(
            (option) => option.getAttribute('aria-label') === label,
        );

    beforeEach(() => {
        localStorage.clear();
        LOG_VIEW_SETTINGS.update(DEFAULT_LOG_VIEW_APPEARANCE);
        discoverMonospaceFonts.mockReset().mockReturnValue(of(['Hack', 'Roboto Mono']));
        fixture = TestBed.createComponent(LogViewSettingsPanel);
        fixture.detectChanges();
    });

    it('labels every control', () => {
        const titles = [...element().querySelectorAll('mat-label, .settings-title')].map((title) =>
            title.textContent?.trim(),
        );
        expect(titles).toEqual([
            'Colour preset',
            'Font family',
            'Font size',
            'Font weight',
            'Highlighting level',
        ]);
        ['log-preset-label', 'log-font-size-label', 'log-font-weight-label', 'log-highlight-level-label'].forEach(
            (labelId) => expect(element().querySelector(`[aria-labelledby="${labelId}"]`)).not.toBeNull(),
        );
    });

    it('lists the presets as a listbox under the Platform, Other - light and Other - dark headings', () => {
        expect(element().querySelector('[role="listbox"]')).not.toBeNull();
        const headings = [...element().querySelectorAll('.settings-preset-group')].map((heading) =>
            heading.textContent?.trim(),
        );
        expect(headings).toEqual(['Platform', 'Other - light', 'Other - dark']);
        expect(element().querySelector('mat-select[aria-labelledby="log-preset-label"]')).toBeNull();
    });

    it('marks the stored preset as selected', () => {
        expect(presetOption('Platform light')?.getAttribute('aria-selected')).toBe('true');
        expect(presetOption('Dracula')?.getAttribute('aria-selected')).toBe('false');
    });

    it('shows each preset by its name without the scheme word, followed by the icon of its scheme', () => {
        const shown = (label: string) => {
            const option = presetOption(label);
            return {
                name: option?.firstChild?.textContent?.trim(),
                icon: option?.querySelector('mat-icon[aria-hidden="true"]')?.textContent?.trim(),
                iconIsLast: option?.lastElementChild?.tagName === 'MAT-ICON',
            };
        };
        expect(shown('Platform light')).toEqual({ name: 'Platform', icon: 'light_mode', iconIsLast: true });
        expect(shown('Gruvbox Material Dark Medium')).toEqual({
            name: 'Gruvbox Material Medium',
            icon: 'dark_mode',
            iconIsLast: true,
        });
        expect(shown('Dracula')).toEqual({ name: 'Dracula', icon: 'dark_mode', iconIsLast: true });
    });

    it('sorts the other presets into a light and a dark section', () => {
        const sectionOf = (label: string) =>
            presetOption(label)?.closest('[role="group"]')?.querySelector('.settings-preset-group')?.textContent?.trim();
        expect(sectionOf('Flexoki Light')).toBe('Other - light');
        expect(sectionOf('Flexoki Dark')).toBe('Other - dark');
    });

    it('stores the preset clicked in the list', () => {
        presetOption('Dracula')?.click();
        fixture.detectChanges();
        expect(LOG_VIEW_SETTINGS.value().presetId).toBe('dracula');
        expect(presetOption('Dracula')?.getAttribute('aria-selected')).toBe('true');
    });

    it('outlines the font family field', () => {
        expect(element().querySelector('mat-form-field')?.classList).toContain('mat-form-field-appearance-outline');
    });

    it('labels the 4 highlighting steps', () => {
        const steps = [...element().querySelectorAll('.settings-level-labels span')].map((step) => step.textContent);
        expect(steps).toEqual(['None', 'Errors', 'Reduced', 'Full']);
    });

    it('requests no fonts before the font list opens', () => {
        expect(discoverMonospaceFonts).not.toHaveBeenCalled();
    });

    it('requests fonts once, on the first opening of the font list', () => {
        const select = element().querySelector('mat-select') as HTMLElement;
        select.click();
        fixture.detectChanges();
        select.click();
        select.click();
        fixture.detectChanges();
        expect(discoverMonospaceFonts).toHaveBeenCalledTimes(1);
    });

    it('stores the font size chosen on its slider and shows it in pixels', () => {
        slide('log-font-size-label', 18);
        expect(LOG_VIEW_SETTINGS.value().fontSize).toBe(18);
        expect(element().querySelector('.settings-value')?.textContent?.trim()).toBe('18 px');
    });

    it('stores the font weight chosen on its slider', () => {
        slide('log-font-weight-label', 600);
        expect(LOG_VIEW_SETTINGS.value().fontWeight).toBe(600);
    });

    it('stores the highlighting level chosen on the slider', () => {
        slide('log-highlight-level-label', 1);
        expect(LOG_VIEW_SETTINGS.value().highlightLevel).toBe('errors');
    });

    it('resets the appearance and keeps the other settings', () => {
        LOG_VIEW_SETTINGS.update({
            fontSize: 20,
            fontWeight: 700,
            presetId: 'platform-dark',
            highlightLevel: 'none',
            lineWrapping: false,
        });
        const reset = [...element().querySelectorAll('button')].find(
            (button) => button.textContent?.trim() === 'Reset to defaults',
        );
        reset?.click();
        expect(LOG_VIEW_SETTINGS.value()).toMatchObject({
            ...DEFAULT_LOG_VIEW_APPEARANCE,
            lineWrapping: false,
        });
    });

    it('asks to be dismissed on Escape', () => {
        const dismissed = vi.fn();
        fixture.componentInstance.dismissed.subscribe(dismissed);
        element()
            .querySelector('.settings-panel')
            ?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
        expect(dismissed).toHaveBeenCalledTimes(1);
    });

    it('selects and stores the preset that arrow keys move focus to', () => {
        const list = element().querySelector('[role="listbox"]') as HTMLElement;
        (presetOption('Platform light') as HTMLElement).focus();
        const arrowDown = new KeyboardEvent('keydown', {
            key: 'ArrowDown',
            keyCode: 40,
            bubbles: true,
            cancelable: true,
        });
        list.dispatchEvent(arrowDown);
        fixture.detectChanges();
        const focused = document.activeElement as HTMLElement;
        expect(focused).not.toBe(presetOption('Platform light'));
        expect(focused.getAttribute('aria-selected')).toBe('true');
        expect(LOG_VIEW_SETTINGS.value().presetId).not.toBe('platform-light');
    });

    it('leaves Escape to the font list while it is open and dismisses once it is closed', async () => {
        const dismissed = vi.fn();
        fixture.componentInstance.dismissed.subscribe(dismissed);
        const select = element().querySelector('mat-select') as HTMLElement;
        const pressEscape = () =>
            select.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
        select.click();
        fixture.detectChanges();
        pressEscape();
        expect(dismissed).not.toHaveBeenCalled();
        document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
        fixture.detectChanges();
        await fixture.whenStable();
        pressEscape();
        expect(dismissed).toHaveBeenCalledTimes(1);
    });
});
