import { UserRole } from '@crczp/user-and-group-model';
import { Column } from '@sentinel/components/table';
import { LinkedRow, TableModel } from '@crczp/components';
import { defer, of } from 'rxjs';
import { RoleDeleteAction } from './role-delete-action';
import { RoleAssignService } from '../../services/state/role-assign.service';
import { RoleSort } from '@crczp/user-and-group-api';
import { OffsetPaginatedResource } from '@crczp/api-common';

/**
 * Class creating data source for role table
 */
export class GroupRolesTable extends TableModel<UserRole, RoleSort> {
    constructor(
        resource: OffsetPaginatedResource<UserRole>,
        groupId: number,
        service: RoleAssignService,
    ) {
        const columns = [
            new Column<RoleSort>('id', 'id', true, 'id'),
            new Column<RoleSort>(
                'microserviceId',
                'microservice id',
                false,
            ),
            new Column<RoleSort>('roleType', 'role type', true, 'roleType'),
            new Column<RoleSort>('microserviceName', 'microservice name', false),
        ];
        const rows = resource.elements.map(
            (role) =>
                new LinkedRow(role, [
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
        this.filterLabel = 'Filter by role type';
    }
}
