import { expect, Locator, Page } from '@playwright/test';

/** The tooltip surface Angular Material shows while an element is hovered; it carries no ARIA role. */
export function visibleTooltip(page: Page): Locator {
    return page.locator('.mat-mdc-tooltip-surface');
}

/**
 * Hovers a tooltip trigger once no earlier tooltip is shown, so the tooltip surface that
 * follows belongs to this trigger alone.
 */
export async function hoverTooltipTrigger(page: Page, trigger: Locator): Promise<void> {
    await page.mouse.move(0, 0);
    await expect(visibleTooltip(page)).toHaveCount(0);
    await trigger.hover();
}
