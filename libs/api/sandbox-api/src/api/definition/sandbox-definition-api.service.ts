import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { SandboxDefinition, SandboxDefinitionRef } from '@crczp/sandbox-model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SandboxDefinitionDTO } from '../../dto/sandbox-definition/sandbox-definition-dto';
import { SandboxDefinitionRefDTO } from '../../dto/sandbox-definition/sandbox-definition-ref-dto';
import { SandboxDefinitionMapper } from '../../mappers/sandbox-definition/sandbox-definition-mapper';
import { SandboxDefinitionRefMapper } from '../../mappers/sandbox-definition/sandbox-definition-ref-mapper';
import { DjangoResourceDTO, PaginationMapper, ParamsBuilder } from '@crczp/api-common';
import { PortalConfig } from '@crczp/utils';

/**
 * Service abstracting http communication with sandbox definition endpoints.
 */
@Injectable()
export class SandboxDefinitionApi {
    private readonly http = inject(HttpClient);

    private readonly apiUrl =
        inject(PortalConfig).basePaths.sandbox + '/definitions';

    /**
     * Sends http request to retrieve all sandbox definitions on specified page of a pagination
     */
    getAll(
        pagination?: OffsetPaginationEvent
    ): Observable<PaginatedResource<SandboxDefinition>> {
        return this.http
            .get<DjangoResourceDTO<SandboxDefinitionDTO>>(this.apiUrl, {
                headers: this.createDefaultHeaders(),
                params: ParamsBuilder.djangoPaginationParams(pagination),
            })
            .pipe(
                map(
                    (response) =>
                        new PaginatedResource<SandboxDefinition>(
                            SandboxDefinitionMapper.fromDTOs(response.results),
                            PaginationMapper.fromDjangoDTO(response)
                        )
                )
            );
    }

    /**
     * Sends http request to retrieve sandbox definition by id
     * @param id id of the sandbox definition that should be retrieved
     */
    get(id: number): Observable<SandboxDefinition> {
        return this.http
            .get<SandboxDefinitionDTO>(`${this.apiUrl}/${id}`, {
                headers: this.createDefaultHeaders(),
            })
            .pipe(map((response) => SandboxDefinitionMapper.fromDTO(response)));
    }

    /**
     * Sends http request to delete sandbox definition
     * @param id id of sandbox definition which should be removed
     */
    delete(id: number): Observable<any> {
        return this.http.delete(`${this.apiUrl}/${id}`);
    }

    /**
     * Sends http request to create new sandbox definition from gitlab repo
     * @param sandboxDefinition sandbox definition to create
     */
    create(
        sandboxDefinition: SandboxDefinition
    ): Observable<SandboxDefinition> {
        return this.http
            .post<SandboxDefinitionDTO>(this.apiUrl, {
                url: sandboxDefinition.url,
                rev: sandboxDefinition.rev,
            })
            .pipe(map((response) => SandboxDefinitionMapper.fromDTO(response)));
    }

    /**
     * Sends http request to retrieve sandbox definition refs
     * @param id id of the sandbox definition for which refs should be retrieved
     */
    getRefs(
        id: number,
        pagination?: OffsetPaginationEvent
    ): Observable<PaginatedResource<SandboxDefinitionRef>> {
        return this.http
            .get<DjangoResourceDTO<SandboxDefinitionRefDTO>>(
                `${this.apiUrl}/${id}/refs`,
                {
                    headers: this.createDefaultHeaders(),
                    params: ParamsBuilder.djangoPaginationParams(pagination),
                }
            )
            .pipe(
                map(
                    (response) =>
                        new PaginatedResource<SandboxDefinitionRef>(
                            SandboxDefinitionRefMapper.fromDTOs(
                                response.results
                            ),
                            PaginationMapper.fromDjangoDTO(response)
                        )
                )
            );
    }

    private createDefaultHeaders() {
        return new HttpHeaders({ Accept: 'application/json' });
    }
}
