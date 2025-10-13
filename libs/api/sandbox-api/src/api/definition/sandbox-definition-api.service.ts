import {OffsetPaginationEvent, PaginatedResource} from '@sentinel/common/pagination';
import {SandboxDefinition, SandboxDefinitionRef} from '@crczp/sandbox-model';
import {Observable} from 'rxjs';

/**
 * Service abstracting http communication with sandbox definition endpoints.
 */
export abstract class SandboxDefinitionApi {
    /**
     * Sends http request to retrieve all sandbox definitions on specified page of a pagination
     */
    abstract getAll(pagination?: OffsetPaginationEvent): Observable<PaginatedResource<SandboxDefinition>>;

    /**
     * Sends http request to retrieve sandbox definition by id
     * @param id id of the sandbox definition that should be retrieved
     */
    abstract get(id: number): Observable<SandboxDefinition>;

    /**
     * Sends http request to delete sandbox definition
     * @param id id of sandbox definition which should be removed
     */
    abstract delete(id: number): Observable<any>;

    /**
     * Sends http request to create new sandbox definition from gitlab repo
     * @param sandboxDefinition sandbox definition to create
     */
    abstract create(sandboxDefinition: SandboxDefinition): Observable<SandboxDefinition>;

    /**
     * Sends http request to retrieve sandbox definition refs
     * @param id id of the sandbox definition for which refs should be retrieved
     */
    abstract getRefs(
        id: number,
        pagination?: OffsetPaginationEvent,
    ): Observable<PaginatedResource<SandboxDefinitionRef>>;
}
