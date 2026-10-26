import type { Locator, Page } from '@playwright/test';
import { bulkDeleteControl, control, SentinelTable, tableFilterInput, waitForPageReady } from '../../ui';

/** The user overview at `/user`. */
export class UserOverviewPage {
    readonly table: SentinelTable;

    constructor(readonly page: Page) {
        this.table = SentinelTable.in(page);
    }

    async open(): Promise<void> {
        await this.page.goto('/user', { waitUntil: 'commit' });
        await waitForPageReady(this.page);
        await this.table.waitUntilLoaded();
    }

    /** The bulk delete control, labelled with the selection size once rows are selected. */
    get deleteButton(): Locator {
        return bulkDeleteControl(this.page);
    }

    get credentialsButton(): Locator {
        return control(this.page, 'Get Users Credentials');
    }

    get importButton(): Locator {
        return control(this.page, 'Import Users');
    }

    get filterInput(): Locator {
        return tableFilterInput(this.page);
    }

    /** Narrows the list to the users whose name contains the text and waits for the reload. */
    async filterBy(text: string): Promise<void> {
        await this.filterInput.fill(text);
        await this.table.waitUntilLoaded();
    }

    rowOf(text: string): Locator {
        return this.table.rowByText(text);
    }

    /** The inline delete action of a row. */
    deleteActionOf(login: string): Locator {
        return this.table.rowAction(this.rowOf(login), 'delete');
    }
}

/** The user detail at `/user/:userId`. */
export class UserDetailPage {
    constructor(readonly page: Page) {}

    async open(userId: number): Promise<void> {
        await this.page.goto(`/user/${userId}`, { waitUntil: 'commit' });
        await waitForPageReady(this.page);
        await this.page.locator('mat-card').first().waitFor();
    }

    get summaryCard(): Locator {
        return this.page.locator('mat-card').first();
    }

    get rolePanelHeaders(): Locator {
        return this.page.locator('mat-expansion-panel-header');
    }

    get expandAllButton(): Locator {
        return control(this.page, 'Expand All');
    }

    get collapseAllButton(): Locator {
        return control(this.page, 'Collapse All');
    }
}
