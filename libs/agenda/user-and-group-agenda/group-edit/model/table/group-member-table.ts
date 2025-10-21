import { User } from '@crczp/user-and-group-model';
import { Column, Row, SentinelTable } from '@sentinel/components/table';
import { defer, of } from 'rxjs';
import { UserAssignService } from '../../services/state/user-assign.service';
import { UserDeleteAction } from '@crczp/user-and-group-agenda/internal';
import { OffsetPaginatedResource, PaginationMapper } from '@crczp/api-common';

/**
 * Class creating data source for group-overview members table
 */
export class GroupMemberTable extends SentinelTable<User, string> {
    constructor(
        resource: OffsetPaginatedResource<User>,
        resourceId: number,
        service: UserAssignService,
    ) {
        const rows = resource.elements.map(
            (user) =>
                new Row(user, [
                    new UserDeleteAction(
                        of(false),
                        defer(() => service.unassign(resourceId, [user])),
                    ),
                ]),
        );
        const columns = [
            new Column<string>('id', 'id', true, 'id'),
            new Column<string>('name', 'name', true, 'familyName'),
            new Column<string>('login', 'login', true, 'sub'),
            new Column<string>('issuer', 'issuer', true, 'iss'),
        ];
        super(rows, columns);
        console.log('pagination', resource.pagination);
        this.pagination = PaginationMapper.fromArray(
            resource.elements,
            resource.pagination.size,
        );
        this.filterable = true;
        this.filterLabel = 'Filter by name';
        this.selectable = true;
    }
}
