import { Pagination } from '@sentinel/common/pagination';
import { Column, Row, SentinelRowExpand } from '@sentinel/components/table';

/** Table row that also holds, per column id, the URL that column's cell links to. */
export class LinkedRow<T> extends Row<T> {
    readonly links = new Map<string, string>();

    /** Makes the cell of the given column link to the URL. */
    addLink(columnId: string, url: string): void {
        this.links.set(columnId, url);
    }
}

/**
 * Rows, columns and options of one `sentinel-table` page, together with the text filter
 * the page offers above the table.
 */
export class TableModel<T, Sort> {
    pagination?: Pagination;
    selectable = false;
    filterable = false;
    filterLabel = '';

    constructor(
        readonly rows: LinkedRow<T>[],
        readonly columns: Column<Sort>[],
        readonly expand?: SentinelRowExpand<unknown, unknown>,
    ) {}
}
