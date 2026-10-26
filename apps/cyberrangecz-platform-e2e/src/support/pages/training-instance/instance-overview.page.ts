import type { Locator, Page } from '@playwright/test';
import { control, SentinelTable, tableFilterInput, waitWhileLoading } from '../../ui';

/** The training instance overview at `/linear-instance`. */
export class InstanceOverviewPage {
    readonly table: SentinelTable;

    constructor(readonly page: Page) {
        this.table = SentinelTable.in(page);
    }

    /** Opens the overview and waits until its table finished loading. */
    async open(): Promise<void> {
        await this.page.goto('/linear-instance');
        await this.table.waitUntilLoaded();
    }

    get createControl(): Locator {
        return control(this.page, 'Create');
    }

    get filterInput(): Locator {
        return tableFilterInput(this.page);
    }

    /** The table rows whose text contains the title. */
    rowOf(title: string): Locator {
        return this.table.rowByText(title);
    }

    /** Types the text into the title filter. */
    async filterByTitle(text: string): Promise<void> {
        await this.filterInput.fill(text);
    }

    /** Filters by title and waits for the table to settle on that result. */
    async showOnly(title: string): Promise<Locator> {
        await this.filterByTitle(title);
        const row = this.rowOf(title);
        await waitWhileLoading(row.first());
        return row;
    }

    /** Title of every shown row, in table order. */
    titlesInOrder(): Promise<string[]> {
        return this.table.columnTexts('Title');
    }
}
