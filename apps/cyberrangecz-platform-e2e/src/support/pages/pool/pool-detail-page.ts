import type { Locator, Page } from '@playwright/test';
import { control, SentinelTable, waitForPageReady } from '../../ui';

type DeleteMenuLabel = 'Delete All' | 'Delete Failed' | 'Delete Unlocked';

/** The pool detail at `/pool/:poolId`. */
export class PoolDetailPage {
    readonly table: SentinelTable;

    constructor(readonly page: Page) {
        this.table = SentinelTable.in(page);
    }

    async open(poolId: number): Promise<void> {
        await this.page.goto(`/pool/${poolId}`, { waitUntil: 'commit' });
        await waitForPageReady(this.page);
        await this.table.waitUntilLoaded();
    }

    get allocateButton(): Locator {
        return control(this.page, /^Allocate Sandbox(es)?$/);
    }

    get deleteMenuButton(): Locator {
        return this.page.getByRole('button', { name: 'Delete', exact: true });
    }

    /** The row of a sandbox by its allocation unit id. */
    rowOf(allocationUnitId: number): Locator {
        return this.table.rows.filter({
            has: this.page.getByRole('link', { name: `Sandbox ${allocationUnitId}`, exact: true }),
        });
    }

    /** The stage icons of a row, one per stage. */
    stageIcons(row: Locator): Locator {
        return row.locator('crczp-stage-overview mat-icon');
    }

    /** An entry of the open Delete menu. */
    deleteMenuEntry(label: DeleteMenuLabel): Locator {
        return this.page.getByRole('menuitem', { name: label, exact: true });
    }

    /** Opens the Delete menu and chooses one of its entries. */
    async chooseDeleteMenuEntry(label: DeleteMenuLabel): Promise<void> {
        await this.deleteMenuButton.click();
        await this.deleteMenuEntry(label).click();
    }

    /** Runs the Lock, Unlock or Delete action of a sandbox row. */
    async clickSandboxAction(row: Locator, action: 'Lock' | 'Unlock' | 'Delete'): Promise<void> {
        const icon = { Lock: 'lock', Unlock: 'lock_open', Delete: 'delete' }[action];
        await this.table.clickRowAction(row, { icon, label: action });
    }
}
