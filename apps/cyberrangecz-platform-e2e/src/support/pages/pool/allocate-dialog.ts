import { expect, type Locator, type Page, type Response } from '@playwright/test';
import { clickUntilVisible, dialogButton, openDialog } from '../../ui';

/** Resolves with the response of the next request that allocates sandboxes in the pool. */
export function waitForAllocationResponse(page: Page, poolId: number): Promise<Response> {
    return page.waitForResponse(
        (response) =>
            response.request().method() === 'POST' &&
            response.url().includes(`/pools/${poolId}/sandbox-allocation-units`),
    );
}

/** The dialog that asks how many sandboxes to allocate. */
export class AllocateDialog {
    readonly root: Locator;

    constructor(private readonly page: Page) {
        this.root = openDialog(page, 'Allocate sandboxes');
    }

    /** Clicks the trigger until the dialog is visible and its size input holds the autofocus, then returns it. */
    static async openFrom(page: Page, trigger: Locator): Promise<AllocateDialog> {
        const dialog = new AllocateDialog(page);
        await clickUntilVisible(trigger, dialog.root);
        await expect(dialog.sizeInput).toBeFocused();
        return dialog;
    }

    get sizeInput(): Locator {
        return this.root.getByRole('spinbutton');
    }

    get slider(): Locator {
        return this.root.getByRole('slider');
    }

    get incrementIcon(): Locator {
        return this.root.locator('mat-icon', { hasText: 'add_circle' });
    }

    get decrementIcon(): Locator {
        return this.root.locator('mat-icon', { hasText: 'remove_circle' });
    }

    get allocateButton(): Locator {
        return dialogButton(this.root, 'Allocate');
    }

    get cancelButton(): Locator {
        return dialogButton(this.root, 'Cancel');
    }

    /** Confirms the dialog and resolves with the response of the allocation request it sends for the pool. */
    async allocate(poolId: number): Promise<Response> {
        const [response] = await Promise.all([
            waitForAllocationResponse(this.page, poolId),
            this.allocateButton.click(),
        ]);
        return response;
    }
}
