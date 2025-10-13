import { PaginatedResource } from '@sentinel/common/pagination';
import { User } from '@crczp/user-and-group-model';
import { Column, Row, SentinelTable } from '@sentinel/components/table';
import { defer, of } from 'rxjs';
import { UserDeleteAction } from '@crczp/user-and-group-agenda/internal';
import { UserOverviewService } from '../services/user-overview.service';
import { Routing } from '@crczp/routing-commons';

/**
 * Class creating data source for user table
 */
export class UserTable extends SentinelTable<User, string> {
    constructor(
        resource: PaginatedResource<User>,
        service: UserOverviewService,
    ) {
        const rows = resource.elements.map((element) =>
            UserTable.createRow(element, service),
        );

        const columns = [
            new Column<string>('id', 'id', true, 'id'),
            new Column<string>('name', 'name', true, 'familyName,givenName'),
            new Column<string>('login', 'login', true, 'sub'),
            new Column<string>('issuer', 'issuer', true, 'iss'),
            new Column<string>('mail', 'email', true, 'mail'),
        ];
        super(rows, columns);
        this.pagination = resource.pagination;
        this.filterable = true;
        this.filterLabel = 'Filter by name';
        this.selectable = true;
    }

    private static createRow(user: User, service: UserOverviewService) {
        const row = new Row(user, [UserTable.createActions(user, service)]);
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
