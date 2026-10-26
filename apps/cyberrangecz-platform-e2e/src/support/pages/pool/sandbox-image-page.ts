import type { Locator, Page } from '@playwright/test';
import { SentinelTable, tableFilterInput, waitForPageReady } from '../../ui';

/** The virtual machine image list at `/sandbox-image`. */
export class SandboxImagePage {
    readonly table: SentinelTable;

    constructor(readonly page: Page) {
        this.table = SentinelTable.in(page);
    }

    async open(): Promise<void> {
        await this.page.goto('/sandbox-image', { waitUntil: 'commit' });
        await waitForPageReady(this.page);
        await this.table.waitUntilLoaded();
    }

    get onlyCustomCheckbox(): Locator {
        return this.page.getByRole('checkbox', { name: 'Only custom images' });
    }

    get onlyGuiCheckbox(): Locator {
        return this.page.getByRole('checkbox', { name: 'Only GUI access' });
    }

    get filter(): Locator {
        return tableFilterInput(this.page);
    }

    /** The image total the paginator reports, read from the part of the range label after "of". */
    async totalImageCount(): Promise<number> {
        const label = await this.table.rangeLabel.innerText();
        return Number(label.split('of')[1]?.trim() ?? 0);
    }
}
