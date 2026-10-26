import { expect, type Locator } from '@playwright/test';
import { LoadingWindow } from './loading-window';
import { pageOf, type Scope, type TextMatcher, wholeText } from './scope';

const SORT_CLICK_SETTLE_MILLISECONDS = 3_000;
const SORT_TOTAL_MILLISECONDS = 15_000;
const COLUMN_HEADER_MILLISECONDS = 15_000;

/** Order a sorted column shows, as the `aria-sort` value of its header. */
export type SortDirection = 'ascending' | 'descending';

/** Whether values are in the given order, equal neighbours allowed. */
export function isOrdered<Value extends number | string>(
    values: Value[],
    direction: SortDirection,
): boolean {
    return values.every((value, index) => {
        const previous = values[index - 1];
        if (previous === undefined) {
            return true;
        }
        return direction === 'ascending'
            ? previous <= value
            : previous >= value;
    });
}

/** A string header matches the whole header text, ignoring case and surrounding whitespace; a pattern is used as given. */
function headerPattern(header: TextMatcher): RegExp {
    return typeof header === 'string' ? wholeText(header, 'i') : header;
}

/** Picks one table among several on a page. */
export interface TableSelection {
    /** Keeps only the table that has a column header matching this text. */
    column?: TextMatcher;
    /** Position among the remaining tables, counted from 0. */
    index?: number;
}

/** Identifies a row action: its icon always, its menu label when it can land in the overflow menu. */
export interface RowActionTarget {
    /** Material icon name the inline icon button shows, for example `delete`. */
    icon: string;
    /** Label the action carries inside the overflow menu. */
    label?: TextMatcher;
}

/**
 * One `sentinel-table` and everything inside it: header, rows, cells, row actions, selection,
 * expansion, loading and empty state, and its offset paginator. Row actions render as icon-only
 * buttons, so they are found by icon name; the label exists only in the overflow menu.
 */
export class SentinelTable {
    /** The `sentinel-table` element. */
    readonly root: Locator;

    constructor(root: Locator) {
        this.root = root;
    }

    /** Finds a table within a scope; the first table when no selection is given. */
    static in(scope: Scope, selection: TableSelection = {}): SentinelTable {
        let tables = scope.locator('sentinel-table');
        if (selection.column !== undefined) {
            tables = tables.filter({
                has: pageOf(scope).getByRole('columnheader', {
                    name: headerPattern(selection.column),
                }),
            });
        }
        return new SentinelTable(tables.nth(selection.index ?? 0));
    }

    /** Every data row, excluding the header, the empty-state row and expanded detail rows. */
    get rows(): Locator {
        return this.root.locator('tbody tr.element-row');
    }

    /** The rows whose visible text matches. */
    rowByText(text: TextMatcher): Locator {
        return this.rows.filter({ hasText: text });
    }

    /** The rows whose cell under the given column header matches the text. */
    async rowByColumnValue(
        header: TextMatcher,
        text: TextMatcher,
    ): Promise<Locator> {
        const columnIndex = await this.columnIndex(header);
        const cellMatching = pageOf(this.root)
            .locator(`td:nth-child(${columnIndex + 1})`)
            .filter({ hasText: text });
        return this.rows.filter({ has: cellMatching });
    }

    /** The header cell of a column; carries `aria-sort` while the table is sorted by it. */
    headerCell(header: TextMatcher): Locator {
        return this.root.getByRole('columnheader', {
            name: headerPattern(header),
        });
    }

    /**
     * Zero-based position of a column among the table's header cells, selection and expand columns included.
     * Rereads the headers until one matches, so a table still receiving its columns is waited out; fails
     * naming the headers last seen when none matches in time.
     */
    async columnIndex(header: TextMatcher): Promise<number> {
        const pattern = headerPattern(header);
        let index = -1;
        await expect(async () => {
            const texts = await this.root.getByRole('columnheader').allInnerTexts();
            index = texts.findIndex((text) => pattern.test(text));
            expect(
                index,
                `No column header matches ${String(header)}; headers are: ${texts.join(' | ')}`,
            ).toBeGreaterThanOrEqual(0);
        }).toPass({ timeout: COLUMN_HEADER_MILLISECONDS });
        return index;
    }

    /** The cell of a row under the given column header. */
    async cell(row: Locator, header: TextMatcher): Promise<Locator> {
        return row.locator('td').nth(await this.columnIndex(header));
    }

    /** Clicks a column header to sort by it; a second click reverses the direction. */
    async sortBy(header: TextMatcher): Promise<void> {
        await this.headerCell(header).click();
    }

    /** Sorts by a column in the given direction, clicking its header again whenever a click did not take effect. */
    async sortTo(header: TextMatcher, direction: SortDirection): Promise<void> {
        const headerCell = this.headerCell(header);
        await expect(async () => {
            if ((await headerCell.getAttribute('aria-sort')) !== direction) {
                await this.sortBy(header);
            }
            await expect(headerCell).toHaveAttribute('aria-sort', direction, {
                timeout: SORT_CLICK_SETTLE_MILLISECONDS,
            });
        }).toPass({ timeout: SORT_TOTAL_MILLISECONDS });
        await this.waitUntilLoaded();
    }

    /** The text of one column over the rows currently shown, whitespace collapsed to single spaces. */
    async columnTexts(header: TextMatcher): Promise<string[]> {
        const index = await this.columnIndex(header);
        const texts = await this.rows
            .locator(`td:nth-child(${index + 1})`)
            .allInnerTexts();
        return texts.map((text) => text.replace(/\s+/g, ' ').trim());
    }

    /** The row's inline icon button for an action. */
    rowAction(row: Locator, icon: string): Locator {
        return row
            .locator('sentinel-table-actions button')
            .filter({
                has: pageOf(this.root).locator('mat-icon', {
                    hasText: wholeText(icon),
                }),
            });
    }

    /** The row's overflow button, present only when the row has more actions than the table shows inline. */
    rowOverflowButton(row: Locator): Locator {
        return row.locator('sentinel-table-actions button.show-menu');
    }

    /** Runs a row action, through the overflow menu when it is not shown inline. */
    async clickRowAction(row: Locator, action: RowActionTarget): Promise<void> {
        const inline = this.rowAction(row, action.icon);
        const overflow = this.rowOverflowButton(row);
        await inline.or(overflow).first().waitFor();
        if (await inline.first().isVisible()) {
            await inline.first().click();
            return;
        }
        if (action.label === undefined) {
            throw new Error(
                `Row action "${action.icon}" is not inline and has no menu label to find it by`,
            );
        }
        await overflow.click();
        await pageOf(this.root)
            .getByRole('menuitem', {
                name: action.label,
                exact: typeof action.label === 'string',
            })
            .click();
    }

    /** The message row of a table that holds no records. */
    get emptyState(): Locator {
        return this.root.locator('tbody td[role="status"]');
    }

    /** The progress bar shown while the table loads. */
    get loadingIndicator(): Locator {
        return this.root.locator('mat-progress-bar');
    }

    /**
     * Resolves once the table is on the page, its loading ended and it shows either rows or its
     * empty state, waiting as long as the page keeps loading new requests.
     */
    async waitUntilLoaded(): Promise<void> {
        const window = LoadingWindow.of(this.root.page());
        await window.retry((timeout) => this.root.first().waitFor({ state: 'attached', timeout }));
        await window.retry((timeout) => this.loadingIndicator.first().waitFor({ state: 'hidden', timeout }));
        await window.retry((timeout) => this.rows.first().or(this.emptyState).first().waitFor({ timeout }));
    }

    /** The select-all checkbox of the header. */
    get selectAllCheckbox(): Locator {
        return this.root.locator('th.select').getByRole('checkbox');
    }

    /** The selection checkbox of a row. */
    rowCheckbox(row: Locator): Locator {
        return row.locator('td.select').getByRole('checkbox');
    }

    /** The expand or collapse button of a row. */
    expandButton(row: Locator): Locator {
        return row.locator('td.expand button');
    }

    /** The detail panels of the rows that are currently expanded; a collapsed row keeps its empty detail wrapper. */
    get expandedDetails(): Locator {
        return this.root.locator(
            'tr.detail-row sentinel-table-expanded-row-detail > .element-detail > *',
        );
    }

    /** The page-size selector of the paginator. */
    get pageSizeSelect(): Locator {
        return this.root.locator('mat-paginator').getByRole('combobox');
    }

    /** Opens the page-size list by clicking where a user does: the touch target laid over the selector. */
    async openPageSizeList(): Promise<void> {
        await this.root
            .locator('mat-paginator .mat-mdc-paginator-touch-target')
            .click();
    }

    /** Picks a page size from the paginator's selector. */
    async selectPageSize(size: number): Promise<void> {
        await this.openPageSizeList();
        await pageOf(this.root)
            .getByRole('option', { name: String(size), exact: true })
            .click();
    }

    /** The paginator's range text, for example "1 – 10 of 25". */
    get rangeLabel(): Locator {
        return this.root.locator('.mat-mdc-paginator-range-label');
    }

    /** The paginator button that moves to the next page. */
    get nextPageButton(): Locator {
        return this.root.getByRole('button', { name: 'Next page' });
    }

    /** The paginator button that moves to the previous page. */
    get previousPageButton(): Locator {
        return this.root.getByRole('button', { name: 'Previous page' });
    }

    /** The paginator button that moves to the first page. */
    get firstPageButton(): Locator {
        return this.root.getByRole('button', { name: 'First page' });
    }

    /** The paginator button that moves to the last page. */
    get lastPageButton(): Locator {
        return this.root.getByRole('button', { name: 'Last page' });
    }
}

/**
 * The text filter that sits above a table (`sentinel-filter-free-input`); it is not a child of the
 * table. Pass the filter's label when a page has several.
 */
export function tableFilterInput(scope: Scope, label?: TextMatcher): Locator {
    const filter = scope.locator('sentinel-filter-free-input');
    return label === undefined
        ? filter.getByRole('textbox')
        : filter.getByRole('textbox', { name: label });
}

/** Types a filter text into the filter above a table. */
export async function filterTable(
    scope: Scope,
    text: string,
    label?: TextMatcher,
): Promise<void> {
    await tableFilterInput(scope, label).fill(text);
}
