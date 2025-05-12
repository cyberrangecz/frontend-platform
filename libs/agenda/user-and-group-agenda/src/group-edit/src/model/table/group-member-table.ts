import { PaginatedResource } from '@sentinel/common/pagination';
import { User } from '@crczp/user-and-group-model';
import { Column, Row, SentinelTable } from '@sentinel/components/table';
import { defer, of } from 'rxjs';
import { UserAssignService } from '../../services/state/user-assign.service';
import { UserDeleteAction } from '../../../../internal/src';

/**
 * Class creating data source for group-overview members table
 */
export class GroupMemberTable extends SentinelTable<User> {
    constructor(resource: PaginatedResource<User>, resourceId: number, service: UserAssignService) {
        const rows = resource.elements.map(
            (user) =>
                new Row(user, [
                    new UserDeleteAction(
                        of(false),
                        defer(() => service.unassign(resourceId, [user]))
                    )
                ])
        );
        const columns = [
            new Column('id', 'id', true),
            new Column('name', 'name', true, 'familyName'),
            new Column('login', 'login', true, 'sub'),
            new Column('issuer', 'issuer', true, 'iss')
        ];
        super(rows, columns);

        this.pagination = resource.pagination;
        this.filterable = true;
        this.filterLabel = 'Filter by name';
        this.selectable = true;
    }
}
