import { User } from '@crczp/user-and-group-model';
import { PaginatedResource } from '@sentinel/common/pagination';
import { Column, Row, SentinelTable } from '@sentinel/components/table';

/**
 * @dynamic
 */
export class MembersDetailTable extends SentinelTable<User, string> {
    constructor(resource: PaginatedResource<User>) {
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

    private static createRow(user: User): Row<User> {
        const row = new Row(user);
        return row;
    }
}
