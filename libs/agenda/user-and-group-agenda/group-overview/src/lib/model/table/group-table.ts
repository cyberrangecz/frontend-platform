import {PaginatedResource} from '@sentinel/common/pagination';
import {Group} from '@crczp/user-and-group-model';
import {Column, Row, RowAction, SentinelTable} from '@sentinel/components/table';
import {defer, of} from 'rxjs';
import {GroupOverviewService} from '../../services/group-overview.service';
import {GroupDeleteAction} from './group-delete-action';
import {GroupEditAction} from './group-edit-action';
import {GroupRowAdapter} from './group-row-adapter';
import {UserAndGroupNavigator} from '@crczp/user-and-group-agenda';

/**
 * @dynamic
 * Class creating data source for group-overview table
 */
export class GroupTable extends SentinelTable<GroupRowAdapter> {
    constructor(resource: PaginatedResource<Group>, service: GroupOverviewService, navigator: UserAndGroupNavigator) {
        const rows = resource.elements.map((element) => GroupTable.createRow(element, service, navigator));
        const columns = [
            new Column('name', 'name', true),
            new Column('description', 'description', true, 'description'),
            new Column('expirationDateFormatted', 'expiration date', true, 'expirationDate')
        ];
        super(rows, columns);
        this.pagination = resource.pagination;
        this.filterable = true;
        this.filterLabel = 'Filter by name';
        this.selectable = true;
    }

    private static createRow(
        group: Group,
        service: GroupOverviewService,
        navigator: UserAndGroupNavigator
    ): Row<GroupRowAdapter> {
        const rowAdapter = group as GroupRowAdapter;
        if (rowAdapter.expirationDate) {
            rowAdapter.expirationDateFormatted = `${group.expirationDate.getFullYear()}-${group.expirationDate.getMonth() + 1}
      -${group.expirationDate.getDate()}`;
        } else {
            rowAdapter.expirationDateFormatted = '-';
        }
        const row = new Row(rowAdapter, GroupTable.createActions(group, service));
        row.addLink('name', navigator.toGroupDetail(rowAdapter.id));
        return row;
    }

    private static createActions(group: Group, service: GroupOverviewService): RowAction[] {
        return [
            new GroupEditAction(
                of(false),
                defer(() => service.edit(group))
            ),
            new GroupDeleteAction(
                of(false),
                defer(() => service.delete(group))
            )
        ];
    }
}
