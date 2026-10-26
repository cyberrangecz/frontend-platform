import { expect, type Locator, type Page } from '@playwright/test';
import { control, SentinelTable, waitForPageReady } from '../../ui';

/** The pool overview at `/pool`. */
export class PoolOverviewPage {
    readonly table: SentinelTable;

    constructor(readonly page: Page) {
        this.table = SentinelTable.in(page);
    }

    async open(): Promise<void> {
        await this.page.goto('/pool', { waitUntil: 'commit' });
        await waitForPageReady(this.page);
        await this.table.waitUntilLoaded();
    }

    get createButton(): Locator {
        return control(this.page, 'Create');
    }

    get quotas(): Locator {
        return this.page.locator('crczp-quotas');
    }

    /** The row of a pool on the page currently shown. */
    rowOf(poolId: number): Locator {
        return this.table.rows.filter({
            has: this.page.getByRole('link', { name: `Pool ${poolId}`, exact: true }),
        });
    }

    /** Pages forward until the pool's row is shown; fails when the last page lacks it. */
    async locatePool(poolId: number): Promise<Locator> {
        const row = this.rowOf(poolId);
        for (;;) {
            if ((await row.count()) > 0) {
                return row;
            }
            await expect(this.table.nextPageButton, `pool ${poolId} listed`).toBeEnabled();
            const before = await this.table.rangeLabel.innerText();
            await this.table.nextPageButton.click();
            await expect(this.table.rangeLabel).not.toHaveText(before);
            await this.table.waitUntilLoaded();
        }
    }

    /** Sorts newest pools first and returns the pool's row. */
    async showPool(poolId: number): Promise<Locator> {
        await this.table.sortTo('Title', 'descending');
        const row = await this.locatePool(poolId);
        await expect(row).toBeVisible();
        return row;
    }

    /** The pool ids of the rows shown, in table order. */
    async shownPoolIds(): Promise<number[]> {
        const titles = await this.table.rows.getByRole('link', { name: /^Pool \d+$/ }).allInnerTexts();
        return titles.map((title) => Number(title.replace('Pool ', '')));
    }

    /**
     * Opens the comment of a row for editing and types the text. The field is marked touched by
     * moving focus to the save button, which keeps the edit open, so validation messages show.
     */
    async typeTouchedComment(row: Locator, text: string): Promise<void> {
        const { input, editButton } = this.commentOf(row);
        await editButton.click();
        await input.focus();
        await editButton.focus();
        await input.fill(text);
    }

    /** The inline comment control of a pool row. */
    commentOf(row: Locator): { input: Locator; editButton: Locator } {
        return {
            input: row.locator('crczp-editable-comment').getByRole('textbox'),
            editButton: row.locator('crczp-editable-comment').getByRole('button', { name: 'Edit comment' }),
        };
    }
}
