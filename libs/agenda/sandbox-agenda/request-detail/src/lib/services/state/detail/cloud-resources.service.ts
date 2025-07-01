import { StageDetailService } from './stage-detail.service';
import { AllocationRequestsApi } from '@crczp/sandbox-api';
import { RequestStage } from '@crczp/sandbox-model';
import {
    OffsetPaginationEvent,
    PaginatedResource,
} from '@sentinel/common/pagination';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { inject, Injectable } from '@angular/core';
import { StagesDetailPollRegistry } from './stages-detail-poll-registry.service';
import { POLLING_PERIOD_SHORT_SETTING_TOKEN } from '@crczp/common';

@Injectable()
export class CloudResourcesService extends StageDetailService {
    constructor(
        private api: AllocationRequestsApi,
        protected pollRegistry: StagesDetailPollRegistry
    ) {
        super(pollRegistry, 500, inject(POLLING_PERIOD_SHORT_SETTING_TOKEN));
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
