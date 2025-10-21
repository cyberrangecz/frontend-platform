import { UserRole } from '@crczp/user-and-group-model';
import { Column, Row, SentinelTable } from '@sentinel/components/table';
import { defer, of } from 'rxjs';
import { RoleDeleteAction } from './role-delete-action';
import { RoleAssignService } from '../../services/state/role-assign.service';
import { RoleSort } from '@crczp/user-and-group-api';
import { OffsetPaginatedResource } from '@crczp/api-common';

/**
 * Class creating data source for role table
 */
export class GroupRolesTable extends SentinelTable<UserRole, RoleSort> {
    constructor(
        resource: OffsetPaginatedResource<UserRole>,
        groupId: number,
        service: RoleAssignService,
    ) {
        const columns = [
            new Column<RoleSort>('id', 'id', true, 'id'),
            new Column<RoleSort>(
                'microserviceId',
                'microservice-registration id',
                false,
                'idOfMicroservice',
            ),
            new Column<RoleSort>('roleType', 'role type', true, 'roleType'),
            new Column<RoleSort>(
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
