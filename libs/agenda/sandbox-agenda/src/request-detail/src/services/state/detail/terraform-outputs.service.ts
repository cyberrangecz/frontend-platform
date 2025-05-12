import { Injectable } from '@angular/core';
import { StageDetailService } from './stage-detail.service';
import { AllocationRequestsApi } from '@crczp/sandbox-api';
import { RequestStage } from '@crczp/sandbox-model';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { SandboxAgendaContext } from '@crczp/sandbox-agenda/internal';
import { StagesDetailPollRegistry } from './stages-detail-poll-registry.service';

@Injectable()
export class TerraformOutputsService extends StageDetailService {
    constructor(
        private api: AllocationRequestsApi,
        private context: SandboxAgendaContext,
        protected pollRegistry: StagesDetailPollRegistry,
    ) {
        super(pollRegistry, Number.MAX_SAFE_INTEGER, context.config.pollingPeriod);
    }

    protected callApiToGetStageDetail(
        stage: RequestStage,
        requestedPagination: OffsetPaginationEvent,
    ): Observable<PaginatedResource<string>> {
        return this.api.getTerraformOutputs(stage.requestId, requestedPagination).pipe(
            map((paginatedResources) => {
                const formattedEvents = paginatedResources.elements.map((event) => `${event.content}`);
                return new PaginatedResource<string>(formattedEvents, paginatedResources.pagination);
            }),
        );
    }
}
