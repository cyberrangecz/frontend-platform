import {SentinelFilter} from '@sentinel/common/filter';
import {OffsetPaginationEvent, PaginatedResource} from '@sentinel/common/pagination';
import {Microservice} from '@crczp/user-and-group-model';
import {Observable} from 'rxjs';
import {MicroserviceCreateDTO} from '../../DTO/microservice/microservice-create-dto.model';

/**
 * Service abstracting http communication with microservice endpoints.
 */
export abstract class MicroserviceApi {
    /**
     * Creates new microservice
     * @param microservice microservice to be created
     */
    abstract create(microservice: Microservice): Observable<MicroserviceCreateDTO>;

    /**
     * Sends http request to get paginated microservices
     * @param pagination requested pagination
     * @param filter filter to be applied on microservices
     */
    abstract getAll(
        pagination: OffsetPaginationEvent,
        filter?: SentinelFilter[],
    ): Observable<PaginatedResource<Microservice>>;
}
