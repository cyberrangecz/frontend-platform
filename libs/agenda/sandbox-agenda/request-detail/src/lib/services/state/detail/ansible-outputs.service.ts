import {StageDetailService} from './stage-detail.service';
import {RequestStage, RequestStageType} from '@crczp/sandbox-model';
import {OffsetPaginationEvent, PaginatedResource,} from '@sentinel/common/pagination';
import {Observable} from 'rxjs';
import {AllocationRequestsApi} from '@crczp/sandbox-api';
import { Injectable, inject } from '@angular/core';
import {StagesDetailPollRegistry} from './stages-detail-poll-registry.service';
import {Settings} from '@crczp/common';

@Injectable()
export class AnsibleOutputsService extends StageDetailService {
    private api = inject(AllocationRequestsApi);
    protected pollRegistry: StagesDetailPollRegistry;

    constructor() {
        const pollRegistry = inject(StagesDetailPollRegistry);
        const settings = inject(Settings);

        super(pollRegistry, 500, settings.POLLING_PERIOD_SHORT);
    
        this.pollRegistry = pollRegistry;
    }

    protected callApiToGetStageDetail(
        stage: RequestStage,
        requestedPagination: OffsetPaginationEvent
    ): Observable<PaginatedResource<string>> {
        if (stage.type === RequestStageType.NETWORKING_ANSIBLE_ALLOCATION) {
            return this.api.getNetworkingAnsibleOutputs(
                stage.requestId,
                requestedPagination
            );
        } else if (stage.type === RequestStageType.USER_ANSIBLE_ALLOCATION) {
            return this.api.getUserAnsibleOutputs(
                stage.requestId,
                requestedPagination
            );
        }
    }
}
