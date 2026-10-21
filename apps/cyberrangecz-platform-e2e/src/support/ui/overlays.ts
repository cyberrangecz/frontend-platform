import { expect, type Locator } from '@playwright/test';

const OVERLAY_OPEN_MILLISECONDS = 30_000;
const CLICK_ATTEMPT_MILLISECONDS = 5_000;
const VISIBLE_ATTEMPT_MILLISECONDS = 2_000;

/**
 * Clicks a trigger until the overlay it opens is visible. A click lost to a re-render of the
 * trigger or to an application still booting is repeated; once the overlay shows it is not
 * clicked again, so a toggling trigger is never closed by a retry. Fails once the bound passes.
 */
export async function clickUntilVisible(trigger: Locator, overlay: Locator): Promise<void> {
    await expect(async () => {
        if (!(await overlay.isVisible())) {
            await trigger.click({ timeout: CLICK_ATTEMPT_MILLISECONDS });
        }
        await expect(overlay).toBeVisible({ timeout: VISIBLE_ATTEMPT_MILLISECONDS });
    }).toPass({ timeout: OVERLAY_OPEN_MILLISECONDS });
}
