import type { Locator, Page } from '@playwright/test';
import { control, SentinelTable, waitForPageReady, wholeText } from '../../ui';

/** Material icon of each row action of the definition table. */
export const ROW_ACTION_ICON = {
    edit: 'create',
    delete: 'delete',
    clone: 'file_copy',
    download: 'cloud_download',
    preview: 'remove_red_eye',
    release: 'lock',
    unrelease: 'lock_open',
    archive: 'archive',
} as const;

export type RowActionName = keyof typeof ROW_ACTION_ICON;

/** The training definition overview at `/linear-definition`. */
export class DefinitionOverviewPage {
    constructor(readonly page: Page) {}

    /** Opens the overview and waits until the table finished loading. */
    async goto(): Promise<void> {
        await this.page.goto('/linear-definition', { waitUntil: 'commit' });
        await waitForPageReady(this.page);
        await this.table.waitUntilLoaded();
    }

    get table(): SentinelTable {
        return SentinelTable.in(this.page);
    }

    get createButton(): Locator {
        return control(this.page, 'Create');
    }

    get uploadButton(): Locator {
        return control(this.page, 'Upload');
    }

    get mitreButton(): Locator {
        return control(this.page, 'MITRE ATT&CK Techniques');
    }

    get filterInput(): Locator {
        return this.page.getByRole('textbox', { name: 'Filter by title' });
    }

    /** Filters the table by title and waits for the filtered page to load. */
    async filterBy(text: string): Promise<void> {
        await this.filterInput.fill(text);
        await this.table.waitUntilLoaded();
    }

    /** Header cell of a column, matched on its whole label. */
    column(label: string): Locator {
        return this.table.headerCell(wholeText(label));
    }

    /** Clicks a column header and waits for the server to answer the re-sorted list request. */
    async sortBy(label: string): Promise<void> {
        const sortedList = this.page.waitForResponse(
            (response) =>
                response.request().method() === 'GET' &&
                /\/training-definitions\?/.test(response.url()) &&
                response.url().includes('sort='),
        );
        await this.table.sortBy(label);
        await sortedList;
        await this.table.waitUntilLoaded();
    }

    /** The row whose title link carries exactly this title. */
    rowOf(title: string): Locator {
        return this.table.rows.filter({
            has: this.page.getByRole('link', { name: title, exact: true }),
        });
    }

    /** Titles of the rows in display order. */
    async rowTitles(): Promise<string[]> {
        return this.table.rows.locator('td[data-cy$="-title"] a').allInnerTexts();
    }

    /** The inline icon button of a row action; the button is absent when the row does not offer it. */
    action(row: Locator, action: RowActionName): Locator {
        return this.table.rowAction(row, ROW_ACTION_ICON[action]);
    }

    /** Filters by the title, then returns the row of that title. */
    async findRow(title: string): Promise<Locator> {
        await this.filterBy(title);
        return this.rowOf(title);
    }
}
