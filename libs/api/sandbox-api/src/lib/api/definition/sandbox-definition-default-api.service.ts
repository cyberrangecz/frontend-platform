import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { SandboxDefinition, SandboxDefinitionRef } from '@crczp/sandbox-model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { DjangoResourceDTO } from '../../DTOs/other/django-resource-dto';
import { SandboxDefinitionDTO } from '../../DTOs/sandbox-definition/sandbox-definition-dto';
import { SandboxDefinitionRefDTO } from '../../DTOs/sandbox-definition/sandbox-definition-ref-dto';
import { PaginationParams } from '../../http/pagination-params';
import { PaginationMapper } from '../../mappers/pagination-mapper';
import { SandboxDefinitionMapper } from '../../mappers/sandbox-definition/sandbox-definition-mapper';
import { SandboxDefinitionRefMapper } from '../../mappers/sandbox-definition/sandbox-definition-ref-mapper';
import { SandboxApiConfigService } from '../../others/sandbox-api-config.service';
import { SandboxDefinitionApi } from './sandbox-definition-api.service';

/**
 * Service abstracting http communication with sandbox definition endpoints.
 */
@Injectable()
export class SandboxDefinitionDefaultApi extends SandboxDefinitionApi {
    private readonly sandboxDefsEndpoint ;

    constructor(
        private http: HttpClient,
        private context: SandboxApiConfigService,
    ) {
        super();
        if (this.context.config === undefined || this.context.config === null) {
            throw new Error(
                'SandboxApiConfig is null or undefined. Please provide it in forRoot() method of SandboxApiModule' +
                    ' or provide own implementation of API services',
            );
        }
        this.sandboxDefsEndpoint = this.context.config.sandboxRestBasePath + 'definitions';
    }

    /**
     * Sends http request to retrieve all sandbox definitions on specified page of a pagination
     */
    getAll(pagination?: OffsetPaginationEvent): Observable<PaginatedResource<SandboxDefinition>> {
        return this.http
            .get<DjangoResourceDTO<SandboxDefinitionDTO>>(this.sandboxDefsEndpoint, {
                headers: this.createDefaultHeaders(),
                params: PaginationParams.create(pagination),
            })
            .pipe(
                map(
                    (response) =>
                        new PaginatedResource<SandboxDefinition>(
                            SandboxDefinitionMapper.fromDTOs(response.results),
                            PaginationMapper.fromDjangoAPI(response),
                        ),
                ),
            );
    }

    /**
     * Sends http request to retrieve sandbox definition by id
     * @param id id of the sandbox definition that should be retrieved
     */
    get(id: number): Observable<SandboxDefinition> {
        return this.http
            .get<SandboxDefinitionDTO>(`${this.sandboxDefsEndpoint}/${id}`, { headers: this.createDefaultHeaders() })
            .pipe(map((response) => SandboxDefinitionMapper.fromDTO(response)));
    }

    /**
     * Sends http request to delete sandbox definition
     * @param id id of sandbox definition which should be removed
     */
    delete(id: number): Observable<any> {
        return this.http.delete(`${this.sandboxDefsEndpoint}/${id}`);
    }

    /**
     * Sends http request to create new sandbox definition from gitlab repo
     * @param sandboxDefinition sandbox definition to create
     */
    create(sandboxDefinition: SandboxDefinition): Observable<SandboxDefinition> {
        return this.http
            .post<SandboxDefinitionDTO>(this.sandboxDefsEndpoint, {
                url: sandboxDefinition.url,
                rev: sandboxDefinition.rev,
            })
            .pipe(map((response) => SandboxDefinitionMapper.fromDTO(response)));
    }

    private createDefaultHeaders() {
        return new HttpHeaders({ Accept: 'application/json' });
    }

    /**
     * Sends http request to retrieve sandbox definition refs
     * @param id id of the sandbox definition for which refs should be retrieved
     */
    getRefs(id: number, pagination?: OffsetPaginationEvent): Observable<PaginatedResource<SandboxDefinitionRef>> {
        return this.http
            .get<DjangoResourceDTO<SandboxDefinitionRefDTO>>(`${this.sandboxDefsEndpoint}/${id}/refs`, {
                headers: this.createDefaultHeaders(),
                params: PaginationParams.create(pagination),
            })
            .pipe(
                map(
                    (response) =>
                        new PaginatedResource<SandboxDefinitionRef>(
                            SandboxDefinitionRefMapper.fromDTOs(response.results),
                            PaginationMapper.fromDjangoAPI(response),
                        ),
                ),
            );
    }
}
