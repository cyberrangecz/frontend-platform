import { User } from '@crczp/user-and-group-model';
import { Column } from '@sentinel/components/table';
import { LinkedRow, TableModel } from '@crczp/components';
import { defer, of } from 'rxjs';
import { UserDeleteAction } from '@crczp/user-and-group-agenda/internal';
import { UserOverviewService } from '../services/user-overview.service';
import { Routing } from '@crczp/routing-commons';
import { OffsetPaginatedResource } from '@crczp/api-common';
import { UserSort } from '@crczp/user-and-group-api';

/**
 * Class creating data source for user table
 */
export class UserTable extends TableModel<User, UserSort> {
    constructor(
        resource: OffsetPaginatedResource<User>,
        service: UserOverviewService,
    ) {
        const rows = resource.elements.map((element) =>
            UserTable.createRow(element, service),
        );

        const columns = [
            new Column<UserSort>('id', 'id', true, 'id'),
            new Column<UserSort>('name', 'name', true, 'fullName'),
            new Column<UserSort>('login', 'login', true, 'sub'),
            new Column<UserSort>('issuer', 'issuer', true, 'iss'),
            new Column<UserSort>('mail', 'email', true, 'mail'),
        ];
        super(rows, columns);
        this.pagination = resource.pagination;
        this.filterable = true;
        this.filterLabel = 'Filter by name';
        this.selectable = true;
    }

    private static createRow(user: User, service: UserOverviewService) {
        const row = new LinkedRow(user, [UserTable.createActions(user, service)]);
        row.addLink(
            'name',
            Routing.RouteBuilder.user.userId(user.id.toString()).build(),
        );
        return row;
    }

    private static createActions(user: User, service: UserOverviewService) {
        return new UserDeleteAction(
            of(false),
            defer(() => service.delete(user)),
        );
    }
}
