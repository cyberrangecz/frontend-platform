import { HttpClient, HttpHeaders } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { SentinelParamsMerger } from '@sentinel/common';
import { JavaPaginatedResource, OffsetPaginatedResource, ParamsBuilder, QueryParam } from '@crczp/api-common';
import { OffsetPaginationEvent } from '@sentinel/common/pagination';
import { Microservice } from '@crczp/user-and-group-model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MicroserviceCreateDTO } from '../DTO/microservice/microservice-create-dto.model';
import { MicroserviceDTO } from '../DTO/microservice/microservice-dto';
import { MicroserviceMapper } from '../mappers/microservice.mapper';
import { PortalConfig } from '@crczp/utils';
import { MicroserviceSort } from './sort';

/**
 * Implementation of http communication with microservice endpoints.
 */
@Injectable()
export class MicroserviceApi {
    private readonly http = inject(HttpClient);

    private apiUrl =
        inject(PortalConfig).basePaths.userAndGroup + '/microservices';

    /**
     * Creates new microservice
     * @param microservice microservice to be created
     */
    create(microservice: Microservice): Observable<MicroserviceCreateDTO> {
        return this.http.post<MicroserviceCreateDTO>(
            this.apiUrl,
            JSON.stringify(
                MicroserviceMapper.mapMicroserviceToMicroserviceCreateDTO(
                    microservice,
                ),
            ),
            { headers: this.createDefaultHeaders() },
        );
    }

    /**
     * Sends http request to get paginated microservices
     * @param pagination requested pagination
     * @param filter filter to be applied on microservices
     */
    getAll(
        pagination: OffsetPaginationEvent<MicroserviceSort>,
        filter?: QueryParam[],
    ): Observable<OffsetPaginatedResource<Microservice>> {
        const params = SentinelParamsMerger.merge([
            ParamsBuilder.javaPaginationParams(pagination),
            ParamsBuilder.queryParams(filter),
        ]);
        return this.http
            .get<JavaPaginatedResource<MicroserviceDTO>>(this.apiUrl, {
                params,
            })
            .pipe(
                map((resp) =>
                    MicroserviceMapper.mapMicroserviceDTOsToMicroservices(resp),
                ),
            );
    }

    private createDefaultHeaders() {
        return new HttpHeaders({
            'Content-Type': 'application/json',
        });
    }
}
