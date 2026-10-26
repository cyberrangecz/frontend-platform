import { UserRole } from '@crczp/user-and-group-model';
import { Column, RowExpand } from '@sentinel/components/table';
import { LinkedRow, TableModel } from '@crczp/components';
import { RoleExpandComponent } from '../components/role-expand/role-expand.component';
import { RoleSort } from '@crczp/user-and-group-api';
import { OffsetPaginatedResource } from '@crczp/api-common';

/**
 * @dynamic
 */
export class RolesDetailTable extends TableModel<UserRole, RoleSort> {
    constructor(resource: OffsetPaginatedResource<UserRole>) {
        const columns = [
            new Column<RoleSort>('roleType', 'role type', true, 'roleType'),
            new Column<RoleSort>(
                'microserviceName',
                'microservice name',
                false,
            ),
        ];
        const rows = resource.elements.map((element) =>
            RolesDetailTable.createRow(element),
        );
        const expand = new RowExpand(RoleExpandComponent, null);
        super(rows, columns, expand);
        this.filterable = true;
        this.filterLabel = 'Filter by role type';
        this.pagination = resource.pagination;
    }

    private static createRow(role: UserRole): LinkedRow<UserRole> {
        const row = new LinkedRow(role);
        return row;
    }
}
