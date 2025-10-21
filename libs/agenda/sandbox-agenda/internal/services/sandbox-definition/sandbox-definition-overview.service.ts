import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { SandboxDefinition } from '@crczp/sandbox-model';
import { Observable } from 'rxjs';
import { SandboxDefinitionSort } from '@crczp/sandbox-api';
import { CrczpOffsetElementsPaginatedService, OffsetPaginatedResource } from '@crczp/api-common';

/**
 * A layer between a component and an API service. Implement a concrete service by extending this class.
 * Provide a concrete class in Angular Module. For more info see https://angular.io/guide/dependency-injection-providers.
 * You can use get methods to get paginated sandbox definitions and other operations to modify data.
 */
export abstract class SandboxDefinitionOverviewService extends CrczpOffsetElementsPaginatedService<SandboxDefinition> {
    protected constructor(pageSize: number) {
        super(pageSize);
    }

    /**
     * @param pagination requested pagination
     */
    abstract getAll(
        pagination: OffsetPaginationEvent<SandboxDefinitionSort>,
    ): Observable<OffsetPaginatedResource<SandboxDefinition>>;

    /**
     * Deletes sandbox definition by given id
     * @param sandboxDefinition sandbox definition to delete
     */
    abstract delete(
        sandboxDefinition: SandboxDefinition,
    ): Observable<OffsetPaginatedResource<SandboxDefinition>>;

    /**
     * Creates a  new sandbox definition
     */
    abstract create(): Observable<any>;

    abstract showTopology(
        sandboxDefinition: SandboxDefinition,
    ): Observable<any>;
}
