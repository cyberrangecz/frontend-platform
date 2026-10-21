import type { Locator, Page } from '@playwright/test';
import { control, SentinelTable, waitForPageReady, wholeText } from '../../ui';

/** Columns of the overview table that can be sorted. */
export type SortableColumn = 'Id' | 'Title';

/** The sandbox definition overview at `/sandbox-definition`. */
export class SandboxDefinitionOverviewPage {
    static readonly PATH = '/sandbox-definition';

    readonly table: SentinelTable;
    readonly createButton: Locator;
    /** The git URL panel of an expanded row. */
    readonly expandedDetails: Locator;
    /** The button that appends the remaining rows below the loaded ones. */
    readonly showMoreButton: Locator;

    constructor(readonly page: Page) {
        this.table = SentinelTable.in(page);
        this.createButton = control(page, 'Create');
        this.expandedDetails = this.table.expandedDetails;
        this.showMoreButton = this.table.root.getByRole('button', { name: /^Show more/ });
    }

    async open(): Promise<void> {
        await this.page.goto(SandboxDefinitionOverviewPage.PATH, { waitUntil: 'commit' });
        await waitForPageReady(this.page);
        await this.table.waitUntilLoaded();
    }

    /** The row of the definition with the given id. */
    rowOfDefinition(definitionId: number): Locator {
        return this.table.rows.filter({
            has: this.page.locator('[data-cy$="-id"]').filter({ hasText: wholeText(String(definitionId)) }),
        });
    }

    /** The cell of a row holding the title with its revision in brackets. */
    titleCell(row: Locator): Locator {
        return row.locator('[data-cy$="-titleWithRevision"]');
    }

    /** The link inside the title cell that leads to the git repository. */
    repositoryLink(row: Locator): Locator {
        return this.titleCell(row).getByRole('link');
    }

    createdByCell(row: Locator): Locator {
        return row.locator('[data-cy$="-createdByName"]');
    }

    topologyAction(row: Locator): Locator {
        return this.table.rowAction(row, 'device_hub');
    }

    deleteAction(row: Locator): Locator {
        return this.table.rowAction(row, 'delete');
    }

    expandToggle(row: Locator): Locator {
        return row.locator('[data-cy$="expand-button"] button');
    }

    /** Ids of the displayed rows, top to bottom. */
    async displayedIds(): Promise<number[]> {
        const texts = await this.table.rows.locator('[data-cy$="-id"]').allInnerTexts();
        return texts.map((text) => Number(text.trim()));
    }

    /** Titles of the displayed rows without the revision in brackets, top to bottom. */
    async displayedTitles(): Promise<string[]> {
        const texts = await this.table.rows.locator('[data-cy$="-titleWithRevision"]').allInnerTexts();
        return texts.map((text) => text.trim().replace(/\s*\([^()]*\)$/, ''));
    }

    /** The header cell of a column; carries `aria-sort`. */
    sortHeader(column: SortableColumn): Locator {
        return this.table.headerCell(column);
    }

    sortButton(column: SortableColumn): Locator {
        return this.table.root.locator('th').getByRole('button', { name: column, exact: true });
    }

    /** The header cell of the Created By column. */
    get createdByHeader(): Locator {
        return this.table.headerCell('Created By');
    }

    /** The options of the open page-size list. */
    get pageSizeOptions(): Locator {
        return this.page.getByRole('option');
    }

    /** Opens the page-size list from the keyboard. */
    async openPageSizeListByKeyboard(): Promise<void> {
        await this.table.pageSizeSelect.focus();
        await this.page.keyboard.press('Enter');
        await this.pageSizeOptions.first().waitFor();
    }

    /** Picks a page size, opening the list from the keyboard and choosing the option with the pointer. */
    async selectPageSize(size: number): Promise<void> {
        await this.openPageSizeListByKeyboard();
        await this.page.getByRole('option', { name: String(size), exact: true }).click();
        await this.table.waitUntilLoaded();
    }
}
