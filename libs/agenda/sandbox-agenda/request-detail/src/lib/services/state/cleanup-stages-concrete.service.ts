import {HttpErrorResponse} from '@angular/common/http';
import {inject, Injectable} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {CleanupRequestsApi} from '@crczp/sandbox-api';
import {Request, RequestStage} from '@crczp/sandbox-model';
import {Observable, zip} from 'rxjs';
import {map, take, tap} from 'rxjs/operators';
import {SandboxErrorHandler, SandboxNavigator, SandboxNotificationService} from '@crczp/sandbox-agenda';
import {RequestStagesService} from './request-stages.service';
import {StageAdapter} from '../../model/adapters/stage-adapter';
import {StageAdapterMapper} from '../../model/adapters/stage-adapter-mapper';
import {POLLING_PERIOD_SHORT_SETTING_TOKEN} from "@crczp/components-common";

@Injectable()
export class CleanupStagesConcreteService extends RequestStagesService {
    constructor(
        private api: CleanupRequestsApi,
        private router: Router,
        private route: ActivatedRoute,
        private navigator: SandboxNavigator,
        private notificationService: SandboxNotificationService,
        private errorHandler: SandboxErrorHandler,
    ) {
        super(inject(POLLING_PERIOD_SHORT_SETTING_TOKEN));
    }

    protected refreshStages(): Observable<StageAdapter[]> {
        return super
            .refreshStages()
            .pipe(tap((stagesMap) => this.navigateBackIfStagesFinished(Array.from(stagesMap.values()))));
    }

    protected callApiToGetStages(request: Request): Observable<StageAdapter[]> {
        return zip(
            this.api.getTerraformStage(request.id),
            this.api.getNetworkingAnsibleStage(request.id),
            this.api.getUserAnsibleStage(request.id),
        ).pipe(map((stages) => stages.map((stage) => StageAdapterMapper.fromStage(stage))));
    }

    protected onGetAllError(err: HttpErrorResponse): void {
        if (err.status === 404) {
            this.notificationService.emit('info', 'Cleanup request finished. All stages were removed');
            this.navigateBack();
            return;
        }
        this.errorHandler.emit(err, 'Fetching stages');
        this.hasErrorSubject$.next(true);
    }

    private navigateBackIfStagesFinished(stages: RequestStage[]) {
        if (stages.every((stage) => stage.hasFinished())) {
            this.notificationService.emit('info', 'Cleanup request finished. All stages were removed');
            this.navigateBack();
        }
    }

    private navigateBack() {
        this.route.paramMap.pipe(take(1)).subscribe(() => this.router.navigate([this.navigator.toPoolOverview()]));
    }
}
