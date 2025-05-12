import { PaginatedResource } from '@sentinel/common/pagination';
import { User } from '@crczp/user-and-group-model';
import { Column, Row, SentinelTable } from '@sentinel/components/table';
import { defer, of } from 'rxjs';
import { UserOverviewService } from '../services/overview/user-overview.service';
import { UserDeleteAction } from '../../../internal/src';
import { UserAndGroupNavigator } from '../../../src';

/**
 * Class creating data source for user table
 */
export class UserTable extends SentinelTable<User> {
    constructor(resource: PaginatedResource<User>, service: UserOverviewService, navigator: UserAndGroupNavigator) {
        const rows = resource.elements.map((element) => UserTable.createRow(element, service, navigator));

        const columns = [
            new Column('id', 'id', true),
            new Column('name', 'name', true, 'familyName,givenName'),
            new Column('login', 'login', true, 'sub'),
            new Column('issuer', 'issuer', true, 'iss'),
            new Column('mail', 'email', true, 'mail')
        ];
        super(rows, columns);
        this.pagination = resource.pagination;
        this.filterable = true;
        this.filterLabel = 'Filter by name';
        this.selectable = true;
    }

    private static createRow(user: User, service: UserOverviewService, navigator: UserAndGroupNavigator) {
        const row = new Row(user, [UserTable.createActions(user, service)]);
        row.addLink('name', navigator.toUserDetail(user.id));
        return row;
    }

    private static createActions(user: User, service: UserOverviewService) {
        return new UserDeleteAction(
            of(false),
            defer(() => service.delete(user))
        );
    }
}
