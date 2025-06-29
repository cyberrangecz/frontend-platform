import {HttpErrorResponse} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {Request} from '@crczp/sandbox-model';
import {Observable, zip} from 'rxjs';
import {SandboxErrorHandler} from '@crczp/sandbox-agenda';
import {RequestStagesService} from './request-stages.service';
import {AllocationRequestsApi} from '@crczp/sandbox-api';
import {map} from 'rxjs/operators';
import {StageAdapterMapper} from '../../model/adapters/stage-adapter-mapper';
import {StageAdapter} from '../../model/adapters/stage-adapter';
import {POLLING_PERIOD_SHORT_SETTING_TOKEN} from "@crczp/components-common";

/**
 * Basic implementation of a layer between a component and an API service.
 * Can manually get stages of creation or cleanup requests, poll them and perform various operations to modify them.
 */
@Injectable()
export class AllocationStagesConcreteService extends RequestStagesService {
    constructor(
        private api: AllocationRequestsApi,
        private errorHandler: SandboxErrorHandler,
    ) {
        super(inject(POLLING_PERIOD_SHORT_SETTING_TOKEN));
    }

    protected callApiToGetStages(request: Request): Observable<StageAdapter[]> {
        return zip(
            this.api.getTerraformStage(request.id),
            this.api.getNetworkingAnsibleStage(request.id),
            this.api.getUserAnsibleStage(request.id),
        ).pipe(map((stages) => stages.map((stage) => StageAdapterMapper.fromStage(stage))));
    }

    protected onGetAllError(err: HttpErrorResponse): void {
        this.errorHandler.emit(err, 'Fetching stages');
        this.hasErrorSubject$.next(true);
    }
}
