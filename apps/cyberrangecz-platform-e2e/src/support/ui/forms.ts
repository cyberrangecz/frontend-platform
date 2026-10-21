import type { Locator, Page } from '@playwright/test';
import { pageOf, type Scope, type TextMatcher } from './scope';

/** The Material form field whose label matches. */
export function formField(scope: Scope, label: TextMatcher): Locator {
    return scope
        .locator('mat-form-field')
        .filter({ has: pageOf(scope).locator('mat-label', { hasText: label }) });
}

/** The text input or textarea of a form field. */
export function fieldInput(scope: Scope, label: TextMatcher): Locator {
    return formField(scope, label).locator('input, textarea').first();
}

/** The validation messages (`mat-error`) a form field currently shows. */
export function fieldErrors(scope: Scope, label: TextMatcher): Locator {
    return formField(scope, label).locator('mat-error');
}

/** The hint line of a form field. */
export function fieldHint(scope: Scope, label: TextMatcher): Locator {
    return formField(scope, label).locator('mat-hint');
}

/** Fills a form field's text input, replacing its content. */
export async function fillField(scope: Scope, label: TextMatcher, value: string): Promise<void> {
    await fieldInput(scope, label).fill(value);
}

/** The Material select of a form field. */
export function selectField(scope: Scope, label: TextMatcher): Locator {
    return formField(scope, label).getByRole('combobox');
}

/** The options of the open select or autocomplete panel. */
export function panelOptions(page: Page): Locator {
    return page.getByRole('option');
}

/** Opens a select and picks the option whose text matches. */
export async function chooseSelectOption(
    scope: Scope,
    label: TextMatcher,
    option: TextMatcher,
): Promise<void> {
    await selectField(scope, label).click();
    await pageOf(scope).getByRole('option', { name: option, exact: typeof option === 'string' }).click();
}

/** Types into an autocomplete input and picks the suggestion whose text matches. */
export async function chooseAutocompleteOption(
    scope: Scope,
    label: TextMatcher,
    search: string,
    option: TextMatcher,
): Promise<void> {
    await fieldInput(scope, label).fill(search);
    await pageOf(scope).getByRole('option', { name: option }).first().click();
}

/** The switch of the Material slide toggle whose label text matches; the switch itself carries no accessible name. */
export function slideToggle(scope: Scope, label: TextMatcher): Locator {
    return scope.locator('mat-slide-toggle').filter({ hasText: label }).getByRole('switch');
}

/** A Material checkbox by its label. */
export function checkbox(scope: Scope, label: TextMatcher): Locator {
    return scope.getByRole('checkbox', { name: label });
}

/** A Material radio button by its label. */
export function radioButton(scope: Scope, label: TextMatcher): Locator {
    return scope.getByRole('radio', { name: label });
}

/** The popup of the open date and time picker (`owl-date-time`). */
export function dateTimePicker(page: Page): Locator {
    return page.locator('owl-date-time-container');
}

/** Opens the date and time picker of a field by clicking the field. */
export async function openDateTimePicker(scope: Scope, label: TextMatcher): Promise<void> {
    await formField(scope, label).click();
    await dateTimePicker(pageOf(scope)).waitFor();
}

/** A day of the month shown in the open picker; days of neighbouring months are excluded. */
export function pickerDay(page: Page, dayOfMonth: number): Locator {
    return dateTimePicker(page)
        .locator('td.owl-dt-calendar-cell')
        .filter({ has: page.locator('span.owl-dt-calendar-cell-content:not(.owl-dt-calendar-cell-out)') })
        .filter({ hasText: new RegExp(`^\\s*${dayOfMonth}\\s*$`) });
}

/** The hour and minute inputs of the open picker, in that order. */
export function pickerTimeInputs(page: Page): Locator {
    return dateTimePicker(page).locator('input.owl-dt-timer-input');
}

/** The picker's navigation button to the next month. */
export function pickerNextMonth(page: Page): Locator {
    return dateTimePicker(page).getByRole('button', { name: 'Next month' });
}

/** The picker's navigation button to the previous month. */
export function pickerPreviousMonth(page: Page): Locator {
    return dateTimePicker(page).getByRole('button', { name: 'Previous month' });
}

/** The picker's Set button, which applies the chosen date and time. */
export function pickerSetButton(page: Page): Locator {
    return dateTimePicker(page).getByRole('button', { name: 'Set', exact: true });
}

/** The picker's Cancel button. */
export function pickerCancelButton(page: Page): Locator {
    return dateTimePicker(page).getByRole('button', { name: 'Cancel', exact: true });
}

/** Types a date and time into the field's input and leaves it so the value is parsed. */
export async function fillDateTime(scope: Scope, label: TextMatcher, value: string): Promise<void> {
    const input = fieldInput(scope, label);
    await input.fill(value);
    await input.blur();
}
