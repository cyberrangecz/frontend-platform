import { Group } from '@crczp/user-and-group-model';
import { Column, RowAction } from '@sentinel/components/table';
import { LinkedRow, TableModel } from '@crczp/components';
import { signal } from '@angular/core';
import { defer, of } from 'rxjs';
import { GroupOverviewService } from '../../services/group-overview.service';
import { GroupDeleteAction } from './group-delete-action';
import { GroupEditAction } from './group-edit-action';
import { GroupRowAdapter } from './group-row-adapter';
import { Routing } from '@crczp/routing-commons';
import { OffsetPaginatedResource } from '@crczp/api-common';
import { GroupSort } from '@crczp/user-and-group-api';

/**
 * @dynamic
 * Class creating data source for group-overview table
 */
export class GroupTable extends TableModel<GroupRowAdapter, GroupSort> {
    constructor(
        resource: OffsetPaginatedResource<Group>,
        service: GroupOverviewService,
    ) {
        const rows = resource.elements.map((element) =>
            GroupTable.createRow(element, service),
        );
        const columns = [
            new Column<GroupSort>('name', 'name', true, 'name'),
            new Column<GroupSort>(
                'description',
                'description',
                true,
                'description',
            ),
            new Column<GroupSort>(
                'expirationDateFormatted',
                'expiration date',
                true,
                'expirationDate',
            ),
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
    ): LinkedRow<GroupRowAdapter> {
        const rowAdapter = group as GroupRowAdapter;
        if (rowAdapter.expirationDate) {
            rowAdapter.expirationDateFormatted = [
                group.expirationDate.getFullYear(),
                group.expirationDate.getMonth() + 1,
                group.expirationDate.getDate(),
            ].join('-');
        } else {
            rowAdapter.expirationDateFormatted = '-';
        }
        const row = new LinkedRow(
            rowAdapter,
            GroupTable.createActions(group, service),
            false,
            undefined,
            undefined,
            signal(!group.canBeDeleted),
        );
        row.addLink(
            'name',
            Routing.RouteBuilder.group.groupId(group.id).build(),
        );
        return row;
    }

    private static createActions(
        group: Group,
        service: GroupOverviewService,
    ): RowAction[] {
        const actions: RowAction[] = [
            new GroupEditAction(
                of(false),
                defer(() => service.edit(group)),
            ),
        ];
        if (group.canBeDeleted) {
            actions.push(
                new GroupDeleteAction(
                    of(false),
                    defer(() => service.delete(group)),
                ),
            );
        }
        return actions;
    }
}
