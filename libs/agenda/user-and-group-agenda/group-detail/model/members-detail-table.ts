import { User } from '@crczp/user-and-group-model';
import { Column } from '@sentinel/components/table';
import { LinkedRow, TableModel } from '@crczp/components';
import { OffsetPaginatedResource } from '@crczp/api-common';

/**
 * @dynamic
 */
export class MembersDetailTable extends TableModel<User, string> {
    constructor(resource: OffsetPaginatedResource<User>) {
        const columns = [
            new Column<string>('picture', 'picture', false),
            new Column<string>('name', 'name', true, 'familyName'),
            new Column<string>('login', 'login', true, 'sub'),
            new Column<string>('issuer', 'issuer', true, 'iss'),
        ];
        const rows = resource.elements.map((element) =>
            MembersDetailTable.createRow(element),
        );
        super(rows, columns);
        this.filterable = true;
        this.filterLabel = 'Filter by name';
        this.pagination = resource.pagination;
    }

    private static createRow(user: User): LinkedRow<User> {
        const row = new LinkedRow(user);
        return row;
    }
}
