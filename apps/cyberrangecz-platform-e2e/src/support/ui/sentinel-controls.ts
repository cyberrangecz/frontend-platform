import type { Locator, Page } from '@playwright/test';
import { pageOf, type Scope, type TextMatcher } from './scope';

/**
 * Locates a Sentinel control (a button or an anchor styled as one) by its label. The label is the
 * accessible name; the control's icon is hidden from assistive technology and takes no part.
 * A string label matches the whole name. Breadcrumb links are never a control.
 */
export function control(scope: Scope, label: TextMatcher): Locator {
    const exact = typeof label === 'string';
    const outsideBreadcrumbs = scope.locator(':not(sentinel-breadcrumbs *)');
    return scope
        .getByRole('button', { name: label, exact })
        .or(scope.getByRole('link', { name: label, exact }).and(outsideBreadcrumbs));
}

/** The bulk delete control, labelled with the selection size once rows are selected. */
export function bulkDeleteControl(scope: Scope): Locator {
    return control(scope, /^Delete( \(\d+\))?$/);
}

/** Reads whether a control is disabled. */
export async function isControlDisabled(controlLocator: Locator): Promise<boolean> {
    return controlLocator.isDisabled();
}

/** The overflow button that holds the controls that did not fit into a controls bar or a row. */
export function overflowButton(scope: Scope): Locator {
    return scope.locator('button.show-menu');
}

/** An entry of an open Sentinel overflow or expandable menu, located by its label. */
export function menuControl(page: Page, label: TextMatcher): Locator {
    return page.getByRole('menuitem', { name: label, exact: typeof label === 'string' });
}

/**
 * Clicks the control with the given label: directly when it is shown in the bar, otherwise
 * through the overflow menu of the same bar. Waits until the control or the overflow button is shown.
 */
export async function clickControl(scope: Scope, label: TextMatcher): Promise<void> {
    const direct = control(scope, label);
    const overflow = overflowButton(scope);
    await direct.or(overflow).first().waitFor();
    if (await direct.first().isVisible()) {
        await direct.first().click();
        return;
    }
    await overflow.first().click();
    await menuControl(pageOf(scope), label).click();
}
