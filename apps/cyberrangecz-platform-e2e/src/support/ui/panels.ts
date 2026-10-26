import type { Locator } from '@playwright/test';
import { pageOf, type Scope, type TextMatcher } from './scope';

/**
 * The expansion panel whose header text matches. A panel that contains another panel also matches
 * the inner panel's header text.
 */
export function expansionPanel(scope: Scope, headerText: TextMatcher): Locator {
    return scope
        .locator('mat-expansion-panel')
        .filter({ has: pageOf(scope).locator('mat-expansion-panel-header', { hasText: headerText }) });
}

/** The header of an expansion panel; its `aria-expanded` attribute tells whether it is open. */
export function expansionPanelHeader(scope: Scope, headerText: TextMatcher): Locator {
    return scope.locator('mat-expansion-panel-header', { hasText: headerText });
}

/** Opens an expansion panel when it is closed. */
export async function expandPanel(scope: Scope, headerText: TextMatcher): Promise<void> {
    const header = expansionPanelHeader(scope, headerText).first();
    if ((await header.getAttribute('aria-expanded')) !== 'true') {
        await header.click();
    }
}

/** Closes an expansion panel when it is open. */
export async function collapsePanel(scope: Scope, headerText: TextMatcher): Promise<void> {
    const header = expansionPanelHeader(scope, headerText).first();
    if ((await header.getAttribute('aria-expanded')) === 'true') {
        await header.click();
    }
}

/** A tab of a Material tab group by its label; `aria-selected` tells whether it is active. */
export function tab(scope: Scope, label: TextMatcher): Locator {
    return scope.getByRole('tab', { name: label });
}

/** Content of the active tab. */
export function activeTabPanel(scope: Scope): Locator {
    return scope.getByRole('tabpanel');
}

/** Opens a tab by its label. */
export async function selectTab(scope: Scope, label: TextMatcher): Promise<void> {
    await tab(scope, label).click();
}

/**
 * A step of a `sentinel-stepper` (the levels, hints and questions strip of the definition editor
 * and preview), by title text or position. Titles of ten characters or more are shortened on screen.
 */
export function sentinelStepperStep(scope: Scope, titleOrIndex: TextMatcher | number): Locator {
    const steps = scope.locator('sentinel-stepper button');
    return typeof titleOrIndex === 'number'
        ? steps.nth(titleOrIndex)
        : steps.filter({ hasText: titleOrIndex });
}

/** The active step of a `sentinel-stepper`. */
export function activeSentinelStepperStep(scope: Scope): Locator {
    return scope.locator('sentinel-stepper button').filter({ has: pageOf(scope).locator('mat-icon.item-active') });
}

/** A step node of a `crczp-stepper` (the training run progress bar), by label text or position. */
export function runStepperStep(scope: Scope, labelOrIndex: TextMatcher | number): Locator {
    const steps = scope.locator('crczp-stepper .step-node-container');
    return typeof labelOrIndex === 'number'
        ? steps.nth(labelOrIndex)
        : steps.filter({ hasText: labelOrIndex });
}

/** The selected step of a `crczp-stepper`. */
export function selectedRunStepperStep(scope: Scope): Locator {
    return scope.locator('crczp-stepper .step-node-container.selected-step');
}

/** The steps of a `crczp-stepper` the trainee cannot open yet. */
export function lockedRunStepperSteps(scope: Scope): Locator {
    return scope.locator('crczp-stepper .step-node-container.locked-step');
}
