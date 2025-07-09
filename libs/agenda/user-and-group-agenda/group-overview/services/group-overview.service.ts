import {PaginatedResource, PaginationBaseEvent} from '@sentinel/common/pagination';
import {Group} from '@crczp/user-and-group-model';
import {Observable} from 'rxjs';
import {SelectablePaginatedService} from '@crczp/user-and-group-agenda/internal';

/**
 * A layer between a component and an API service. Implement a concrete service by extending this class.
 * Provide a concrete class in Angular Module. For more info see https://angular.io/guide/dependency-injection-providers.
 * You can use get methods to get paginated requests and other operations to modify data.
 */
export abstract class GroupOverviewService extends SelectablePaginatedService<Group> {
    protected constructor(pageSize: number) {
        super(pageSize);
    }

    /**
     *
     * @param pagination requested pagination
     * @param filter filter to be applied on groups
     */
    abstract getAll(pagination?: PaginationBaseEvent, filter?: string): Observable<PaginatedResource<Group>>;

    /**
     * Deletes group-overview
     * @param group a group-overview to be deleted
     */
    abstract delete(group: Group): Observable<any>;

    abstract deleteSelected(): Observable<any>;

    abstract edit(group: Group): Observable<any>;

    abstract create(): Observable<any>;
}
