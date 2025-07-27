import { inject, Injectable } from '@angular/core';
import { StageDetailService } from './stage-detail.service';
import { AllocationRequestsApi } from '@crczp/sandbox-api';
import { RequestStage } from '@crczp/sandbox-model';
import {
    OffsetPaginationEvent,
    PaginatedResource,
} from '@sentinel/common/pagination';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { StagesDetailPollRegistry } from './stages-detail-poll-registry.service';
import { PortalConfig } from '@crczp/utils';

@Injectable()
export class TerraformOutputsService extends StageDetailService {
    private api = inject(AllocationRequestsApi);

    constructor() {
        const pollRegistry = inject(StagesDetailPollRegistry);
        const settings = inject(PortalConfig);

        super(
            pollRegistry,
            Number.MAX_SAFE_INTEGER,
            settings.polling.pollingPeriodShort
        );
    }

    protected callApiToGetStageDetail(
        stage: RequestStage,
        requestedPagination: OffsetPaginationEvent
    ): Observable<PaginatedResource<string>> {
        return this.api
            .getTerraformOutputs(stage.requestId, requestedPagination)
            .pipe(
                map((paginatedResources) => {
                    const formattedEvents = paginatedResources.elements.map(
                        (event) => `${event.content}`
                    );
                    return new PaginatedResource<string>(
                        formattedEvents,
                        paginatedResources.pagination
                    );
                })
            );
    }
}
