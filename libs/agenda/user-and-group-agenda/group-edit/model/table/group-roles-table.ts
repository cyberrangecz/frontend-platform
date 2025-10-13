import { PaginatedResource } from '@sentinel/common/pagination';
import { UserRole } from '@crczp/user-and-group-model';
import { Column, Row, SentinelTable } from '@sentinel/components/table';
import { defer, of } from 'rxjs';
import { RoleDeleteAction } from './role-delete-action';
import { RoleAssignService } from '../../services/state/role-assign.service';

/**
 * Class creating data source for role table
 */
export class GroupRolesTable extends SentinelTable<UserRole, string> {
    constructor(
        resource: PaginatedResource<UserRole>,
        groupId: number,
        service: RoleAssignService,
    ) {
        const columns = [
            new Column<string>('id', 'id', true, 'id'),
            new Column<string>(
                'microserviceId',
                'microservice-registration id',
                false,
                'microserviceId',
            ),
            new Column<string>('roleType', 'role type', true, 'roleType'),
            new Column<string>(
                'microserviceName',
                'microservice-registration name',
                false,
            ),
        ];
        const rows = resource.elements.map(
            (role) =>
                new Row(role, [
                    new RoleDeleteAction(
                        of(false),
                        defer(() => service.unassign(groupId, [role])),
                    ),
                ]),
        );
        super(rows, columns);
        this.pagination = resource.pagination;
        this.selectable = true;
        this.filterable = true;
        this.filterLabel = 'Filter by microservice-registration name';
    }
}
