import {PaginatedResource} from '@sentinel/common/pagination';
import {UserRole} from '@crczp/user-and-group-model';
import {Column, ExpandableSentinelTable, Row, RowExpand} from '@sentinel/components/table';
import {RoleExpandComponent} from '../components/role-expand/role-expand.component';

/**
 * @dynamic
 */
export class RolesDetailTable extends ExpandableSentinelTable<UserRole, RoleExpandComponent, null> {
    constructor(resource: PaginatedResource<UserRole>) {
        const columns = [
            new Column('roleType', 'role type', true, 'roleType'),
            new Column('microserviceName', 'microservice name', false),
        ];
        const rows = resource.elements.map((element) => RolesDetailTable.createRow(element));
        const expand = new RowExpand(RoleExpandComponent, null);
        super(rows, columns, expand);
        this.filterable = true;
        this.filterLabel = 'Filter by role type';
        this.pagination = resource.pagination;
    }

    private static createRow(role: UserRole): Row<UserRole> {
        const row = new Row(role);
        return row;
    }
}
