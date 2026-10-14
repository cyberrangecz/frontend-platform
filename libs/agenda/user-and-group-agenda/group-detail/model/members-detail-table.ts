import { User } from '@crczp/user-and-group-model';
import { Column } from '@sentinel/components/table';
import { LinkedRow, TableModel } from '@crczp/components';
import { OffsetPaginatedResource } from '@crczp/api-common';
import { UserSort } from '@crczp/user-and-group-api';

/**
 * @dynamic
 */
export class MembersDetailTable extends TableModel<User, UserSort> {
    constructor(resource: OffsetPaginatedResource<User>) {
        const columns = [
            new Column<UserSort>('picture', 'picture', false),
            new Column<UserSort>('name', 'name', true, 'familyName,givenName'),
            new Column<UserSort>('login', 'login', true, 'sub'),
            new Column<UserSort>('issuer', 'issuer', true, 'iss'),
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
