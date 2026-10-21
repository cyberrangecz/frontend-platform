import { expect, type Locator } from '@playwright/test';
import type { SentinelTable, TextMatcher } from '../../ui';

const SORT_HEADER_CLASS = /(^|\s)mat-sort-header(\s|$)/;
const DISABLED_SORT_HEADER_CLASS = /(^|\s)mat-sort-header-disabled(\s|$)/;

/** The header of the "Actions" column a table adds when its rows have actions. */
export const ACTIONS_COLUMN = /^actions$/i;

/** The column headers of a table that a click sorts by; Material marks every other sort header as disabled. */
export function sortableHeaders(table: SentinelTable): Locator {
    return table.root.locator('th.mat-sort-header:not(.mat-sort-header-disabled)');
}

/** Asserts that each listed column header does, or does not, sort the table. */
export async function expectColumnSortability(
    table: SentinelTable,
    sortable: readonly TextMatcher[],
    unsortable: readonly TextMatcher[],
): Promise<void> {
    for (const column of sortable) {
        const header = table.headerCell(column);
        await expect(header).toHaveClass(SORT_HEADER_CLASS);
        await expect(header).not.toHaveClass(DISABLED_SORT_HEADER_CLASS);
    }
    for (const column of unsortable) {
        await expect(table.headerCell(column)).toHaveClass(DISABLED_SORT_HEADER_CLASS);
    }
}
