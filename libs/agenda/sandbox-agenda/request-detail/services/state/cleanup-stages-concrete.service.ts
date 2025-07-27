import { HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { CleanupRequestsApi } from '@crczp/sandbox-api';
import { Request, RequestStage } from '@crczp/sandbox-model';
import { Observable, zip } from 'rxjs';
import { map, take, tap } from 'rxjs/operators';
import { RequestStagesService } from './request-stages.service';
import { StageAdapter } from '../../model/adapters/stage-adapter';
import { StageAdapterMapper } from '../../model/adapters/stage-adapter-mapper';
import {
    ErrorHandlerService,
    NotificationService,
    PortalConfig,
} from '@crczp/utils';
import { Routing } from '@crczp/routing-commons';

@Injectable()
export class CleanupStagesConcreteService extends RequestStagesService {
    private api = inject(CleanupRequestsApi);
    private router = inject(Router);
    private route = inject(ActivatedRoute);
    private notificationService = inject(NotificationService);
    private errorHandler = inject(ErrorHandlerService);

    constructor() {
        const settings = inject(PortalConfig);

        super(settings.polling.pollingPeriodShort);
    }

    protected refreshStages(): Observable<StageAdapter[]> {
        return super
            .refreshStages()
            .pipe(
                tap((stagesMap) =>
                    this.navigateBackIfStagesFinished(
                        Array.from(stagesMap.values())
                    )
                )
            );
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
        if (err.status === 404) {
            this.notificationService.emit(
                'info',
                'Cleanup request finished. All stages were removed'
            );
            this.navigateBack();
            return;
        }
        this.errorHandler.emit(err, 'Fetching stages');
        this.hasErrorSubject$.next(true);
    }

    private navigateBackIfStagesFinished(stages: RequestStage[]) {
        if (stages.every((stage) => stage.hasFinished())) {
            this.notificationService.emit(
                'info',
                'Cleanup request finished. All stages were removed'
            );
            this.navigateBack();
        }
    }

    private navigateBack() {
        this.route.paramMap
            .pipe(take(1))
            .subscribe(() =>
                this.router.navigate([Routing.RouteBuilder.pool.build()])
            );
    }
}
