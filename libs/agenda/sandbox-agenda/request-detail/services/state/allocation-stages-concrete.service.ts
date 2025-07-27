import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Request } from '@crczp/sandbox-model';
import { Observable, zip } from 'rxjs';
import { RequestStagesService } from './request-stages.service';
import { AllocationRequestsApi } from '@crczp/sandbox-api';
import { map } from 'rxjs/operators';
import { StageAdapterMapper } from '../../model/adapters/stage-adapter-mapper';
import { StageAdapter } from '../../model/adapters/stage-adapter';
import { ErrorHandlerService, PortalConfig } from '@crczp/utils';

/**
 * Basic implementation of a layer between a component and an API service.
 * Can manually get stages of creation or cleanup requests, poll them and perform various operations to modify them.
 */
@Injectable()
export class AllocationStagesConcreteService extends RequestStagesService {
    private api = inject(AllocationRequestsApi);
    private errorHandler = inject(ErrorHandlerService);

    constructor() {
        const settings = inject(PortalConfig);

        super(settings.polling.pollingPeriodShort);
    }

    protected callApiToGetStages(request: Request): Observable<StageAdapter[]> {
        return zip(
            this.api.getTerraformStage(request.id),
            this.api.getNetworkingAnsibleStage(request.id),
            this.api.getUserAnsibleStage(request.id)
        ).pipe(
            map((stages) =>
                stages.map((stage) => StageAdapterMapper.fromStage(stage))
            )
        );
    }

    protected onGetAllError(err: HttpErrorResponse): void {
        this.errorHandler.emit(err, 'Fetching stages');
        this.hasErrorSubject$.next(true);
    }
}
