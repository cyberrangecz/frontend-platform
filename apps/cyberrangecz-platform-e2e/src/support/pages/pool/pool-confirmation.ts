import { expect, type Page } from '@playwright/test';
import { ConfirmationDialog } from '../../ui';

/** What a confirmation dialog is expected to show. */
export interface ExpectedConfirmation {
    title: string;
    message: string;
    confirmLabel: string;
}

/** The confirmation dialogs of the pool detail and the pool overview. */
export const poolConfirmations = {
    unlockSandbox: (allocationUnitId: number): ExpectedConfirmation => ({
        title: 'Unlock Sandbox',
        message: `Do you want to unlock sandbox ${allocationUnitId}?`,
        confirmLabel: 'Unlock',
    }),
    deleteAllSandboxes: (poolId: number): ExpectedConfirmation => ({
        title: 'Create Cleanup Request',
        message: `Do you want to delete all sandboxes for pool ${poolId}?`,
        confirmLabel: 'Delete',
    }),
    deleteUnlockedSandboxes: (poolId: number): ExpectedConfirmation => ({
        title: 'Create Cleanup Request',
        message: `Do you want to delete all unlocked sandboxes for pool ${poolId}?`,
        confirmLabel: 'Delete',
    }),
    deletePoolWithAllocations: (poolId: number): ExpectedConfirmation => ({
        title: 'Delete Pool',
        message: `Do you want to delete pool "${poolId}" with all its allocations?`,
        confirmLabel: 'Delete with allocations',
    }),
};

/**
 * Checks that a confirmation dialog opened with the expected text and a Cancel button on the left,
 * then answers it. The checks are soft, so a deviating dialog fails the test while the flow goes on;
 * when no dialog opened, nothing is answered.
 */
export async function answerConfirmation(
    page: Page,
    expected: ExpectedConfirmation,
    answer: 'confirm' | 'cancel',
): Promise<void> {
    const dialog = new ConfirmationDialog(page);
    await expect.soft(dialog.root, `confirmation "${expected.title}" opens`).toBeVisible();
    if (!(await dialog.root.isVisible())) {
        return;
    }
    await expect.soft(dialog.title).toHaveText(expected.title);
    await expect.soft(dialog.message).toHaveText(expected.message);
    await expect.soft(dialog.cancelButton).toHaveText('Cancel');
    await expect.soft(dialog.confirmButton).toHaveText(expected.confirmLabel);
    if (answer === 'confirm') {
        await dialog.confirm();
    } else {
        await dialog.cancel();
    }
    await expect(dialog.root).toBeHidden();
}

/** Checks that an action ran without opening a confirmation dialog. */
export async function expectNoConfirmation(page: Page): Promise<void> {
    await expect(new ConfirmationDialog(page).root).toBeHidden();
}

/**
 * Aborts every request that locks a sandbox, unlocks it or creates a cleanup request, so an
 * action that runs without its confirmation cannot change a sandbox.
 */
export async function blockSandboxChanges(page: Page): Promise<void> {
    const changingRequest =
        /\/(sandbox-allocation-units\/\d+\/(lock|cleanup-request)|pools\/\d+\/(cleanup-requests|cleanup-unlocked|cleanup-failed))(\?.*)?$/;
    await page.route(changingRequest, (route) =>
        route.request().method() === 'GET' ? route.fallback() : route.abort(),
    );
}
