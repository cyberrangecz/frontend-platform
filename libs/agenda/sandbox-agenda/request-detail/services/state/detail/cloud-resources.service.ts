import {StageDetailService} from './stage-detail.service';
import {AllocationRequestsApi} from '@crczp/sandbox-api';
import {RequestStage} from '@crczp/sandbox-model';
import {OffsetPaginationEvent, PaginatedResource,} from '@sentinel/common/pagination';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {inject, Injectable} from '@angular/core';
import {StagesDetailPollRegistry} from './stages-detail-poll-registry.service';
import {PortalConfig} from '@crczp/common';

@Injectable()
export class CloudResourcesService extends StageDetailService {
    private api = inject(AllocationRequestsApi);

    constructor() {
        const pollRegistry = inject(StagesDetailPollRegistry);
        const settings = inject(PortalConfig);

        super(pollRegistry, 500, settings.polling.pollingPeriodShort);
    }

    protected callApiToGetStageDetail(
        stage: RequestStage,
        requestedPagination: OffsetPaginationEvent
    ): Observable<PaginatedResource<string>> {
        return this.api
            .getCloudResources(stage.requestId, requestedPagination)
            .pipe(
                map((paginatedResources) => {
                    const formattedResources = paginatedResources.elements.map(
                        (resource) =>
                            `${resource.name} ${resource.type} ${resource.status}`
                    );
                    return new PaginatedResource<string>(
                        formattedResources,
                        paginatedResources.pagination
                    );
                })
            );
    }
}
