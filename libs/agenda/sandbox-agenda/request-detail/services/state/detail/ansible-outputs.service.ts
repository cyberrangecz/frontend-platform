import { StageDetailService } from './stage-detail.service';
import { RequestStage, RequestStageType } from '@crczp/sandbox-model';
import {
    OffsetPaginationEvent,
    PaginatedResource,
} from '@sentinel/common/pagination';
import { Observable } from 'rxjs';
import { AllocationRequestsApi } from '@crczp/sandbox-api';
import { inject, Injectable } from '@angular/core';
import { StagesDetailPollRegistry } from './stages-detail-poll-registry.service';
import { PortalConfig } from '@crczp/utils';
import { take } from 'rxjs/operators';

@Injectable()
export class AnsibleOutputsService extends StageDetailService {
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
        if (stage.type === RequestStageType.NETWORKING_ANSIBLE_ALLOCATION) {
            return this.api
                .getNetworkingAnsibleOutputs(
                    stage.requestId,
                    requestedPagination
                )
                .pipe(take(1));
        } else if (stage.type === RequestStageType.USER_ANSIBLE_ALLOCATION) {
            return this.api
                .getUserAnsibleOutputs(stage.requestId, requestedPagination)
                .pipe(take(1));
        }
    }
}
