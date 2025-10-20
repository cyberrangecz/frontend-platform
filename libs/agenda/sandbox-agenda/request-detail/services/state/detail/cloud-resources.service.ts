import { StageDetailService } from './stage-detail.service';
import { AllocationRequestsApi, ResourceUsageSort } from '@crczp/sandbox-api';
import { RequestStage } from '@crczp/sandbox-model';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { Observable } from 'rxjs';
import { map, take } from 'rxjs/operators';
import { inject, Injectable } from '@angular/core';
import { StagesDetailPollRegistry } from './stages-detail-poll-registry.service';
import { PortalConfig } from '@crczp/utils';

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
        requestedPagination: OffsetPaginationEvent<ResourceUsageSort>,
    ): Observable<PaginatedResource<string>> {
        return this.api
            .getCloudResources(stage.requestId, requestedPagination)
            .pipe(
                take(1),
                map((paginatedResources) => {
                    const formattedResources = paginatedResources.elements.map(
                        (resource) =>
                            `${resource.name} ${resource.type} ${resource.status}`,
                    );
                    return new PaginatedResource<string>(
                        formattedResources,
                        paginatedResources.pagination,
                    );
                }),
            );
    }
}
