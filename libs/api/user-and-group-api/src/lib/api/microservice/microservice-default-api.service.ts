import {HttpClient, HttpHeaders} from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import {SentinelParamsMerger} from '@sentinel/common';
import {SentinelFilter} from '@sentinel/common/filter';
import {OffsetPaginationEvent, PaginatedResource} from '@sentinel/common/pagination';
import {Microservice} from '@crczp/user-and-group-model';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {MicroserviceCreateDTO} from '../../DTO/microservice/microservice-create-dto.model';
import {MicroserviceDTO} from '../../DTO/microservice/microservice-dto';
import {MicroserviceMapper} from '../../mappers/microservice.mapper';
import {UserAndGroupApiConfig} from '../../other/user-and-group-api-config';
import {UserAndGroupContext} from '../../other/user-and-group.context.service';
import {MicroserviceApi} from './microservice-api.service';
import {JavaPaginatedResource, ParamsBuilder} from '@crczp/api-common';

/**
 * Implementation of http communication with microservice endpoints.
 */
@Injectable()
export class MicroserviceDefaultApi extends MicroserviceApi {
    private http = inject(HttpClient);
    private context = inject(UserAndGroupContext);

    private readonly config: UserAndGroupApiConfig;

    constructor() {
        super();
        this.config = this.context.config;
    }

    /**
     * Creates new microservice
     * @param microservice microservice to be created
     */
    create(microservice: Microservice): Observable<MicroserviceCreateDTO> {
        return this.http.post<MicroserviceCreateDTO>(
            `${this.config.userAndGroupRestBasePath}microservices`,
            JSON.stringify(MicroserviceMapper.mapMicroserviceToMicroserviceCreateDTO(microservice)),
            { headers: this.createDefaultHeaders() },
        );
    }

    private createDefaultHeaders() {
        return new HttpHeaders({
            'Content-Type': 'application/json',
        });
    }

    /**
     * Sends http request to get paginated microservices
     * @param pagination requested pagination
     * @param filter filter to be applied on microservices
     */
    getAll(pagination: OffsetPaginationEvent, filter?: SentinelFilter[]): Observable<PaginatedResource<Microservice>> {
        const params = SentinelParamsMerger.merge([
            ParamsBuilder.javaPaginationParams(pagination),
            ParamsBuilder.filterParams(filter),
        ]);
        return this.http
            .get<JavaPaginatedResource<MicroserviceDTO>>(`${this.config.userAndGroupRestBasePath}microservices`, { params })
            .pipe(map((resp) => MicroserviceMapper.mapMicroserviceDTOsToMicroservices(resp)));
    }
}
