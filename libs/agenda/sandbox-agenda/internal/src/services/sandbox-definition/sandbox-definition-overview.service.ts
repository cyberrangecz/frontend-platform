import { OffsetPaginatedElementsService } from '@sentinel/common';
import { PaginatedResource, PaginationBaseEvent } from '@sentinel/common/pagination';
import { SandboxDefinition } from '@crczp/sandbox-model';
import { Observable } from 'rxjs';
import {inject} from "@angular/core";
import {PAGE_SIZE_SETTING_TOKEN} from "@crczp/components-common";

/**
 * A layer between a component and an API service. Implement a concrete service by extending this class.
 * Provide a concrete class in Angular Module. For more info see https://angular.io/guide/dependency-injection-providers.
 * You can use get methods to get paginated sandbox definitions and other operations to modify data.
 */
export abstract class SandboxDefinitionOverviewService extends OffsetPaginatedElementsService<SandboxDefinition> {
    protected constructor() {
        super(inject(PAGE_SIZE_SETTING_TOKEN));
    }

    /**
     * @param pagination requested pagination
     */
    abstract getAll(pagination: PaginationBaseEvent): Observable<PaginatedResource<SandboxDefinition>>;

    /**
     * Deletes sandbox definition by given id
     * @param sandboxDefinition sandbox definition to delete
     */
    abstract delete(sandboxDefinition: SandboxDefinition): Observable<PaginatedResource<SandboxDefinition>>;

    /**
     * Creates a  new sandbox definition
     */
    abstract create(): Observable<any>;

    abstract showTopology(sandboxDefinition: SandboxDefinition): Observable<any>;
}
