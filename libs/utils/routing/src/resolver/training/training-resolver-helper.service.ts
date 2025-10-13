import { inject, Injectable } from '@angular/core';
import { ErrorHandlerService } from '@crczp/utils';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import {
    AdaptiveRunApi,
    AdaptiveTrainingDefinitionApi,
    AdaptiveTrainingInstanceApi,
    LinearRunApi,
    LinearTrainingDefinitionApi,
    LinearTrainingInstanceApi,
} from '@crczp/training-api';
import {
    AccessTrainingRunInfo,
    TrainingDefinition,
    TrainingInstance,
    TrainingRun,
    TrainingTypeEnum,
} from '@crczp/training-model';
import { catchError, take } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { Routing } from '../../routing-namespace';
import { RoutingUtils } from '../../utils';
import { CommonResolverHelperService } from '../common-resolver-helper-service';

@Injectable({
    providedIn: 'root',
})
export class TrainingResolverHelperService extends CommonResolverHelperService {
    private readonly linearDefinitionApi = inject(LinearTrainingDefinitionApi);
    private readonly adaptiveDefinitionApi = inject(
        AdaptiveTrainingDefinitionApi
    );
    private readonly linearInstanceApi = inject(LinearTrainingInstanceApi);
    private readonly adaptiveInstanceApi = inject(AdaptiveTrainingInstanceApi);
    private readonly linearRunApi = inject(LinearRunApi);
    private readonly adaptiveRunApi = inject(AdaptiveRunApi);

    constructor() {
        super(inject(ErrorHandlerService), inject(Router));
    }

    public navigateToDefinitionOverview(type: TrainingTypeEnum) {
        return this.navigate(
            this.router.parseUrl(
                type === TrainingTypeEnum.LINEAR
                    ? Routing.RouteBuilder.linear_definition.build()
                    : Routing.RouteBuilder.adaptive_definition.build()
            )
        );
    }

    public navigateToInstanceOverview(type: TrainingTypeEnum) {
        return this.navigate(
            this.router.parseUrl(
                type === TrainingTypeEnum.LINEAR
                    ? Routing.RouteBuilder.linear_instance.build()
                    : Routing.RouteBuilder.adaptive_instance.build()
            )
        );
    }

    public navigateToRunOverview() {
        return this.navigate(
            this.router.parseUrl(Routing.RouteBuilder.run.build())
        );
    }

    public getDefinition(
        route: ActivatedRouteSnapshot,
        type: TrainingTypeEnum
    ): Observable<TrainingDefinition | null> {
        const api =
            type === TrainingTypeEnum.LINEAR
                ? this.linearDefinitionApi
                : this.adaptiveDefinitionApi;

        const definitionId = this.extractDefinitionId(route);
        if (!definitionId) {
            this.emitFrontendError('No definition id found in route');
            return of(null);
        }

        return api.get(definitionId, false).pipe(
            take(1),
            catchError((err) => {
                this.emitApiError(err, 'Resolving training definition');
                return of(null);
            })
        );
    }

    public getInstance(
        route: ActivatedRouteSnapshot,
        type: TrainingTypeEnum
    ): Observable<TrainingInstance | null> {
        const api =
            type === TrainingTypeEnum.LINEAR
                ? this.linearInstanceApi
                : this.adaptiveInstanceApi;

        const instanceId = this.extractInstanceId(route);
        if (!instanceId) {
            this.emitFrontendError('No instance id found in route');
            return of(null);
        }

        return api.get(instanceId).pipe(
            take(1),
            catchError((err) => {
                this.emitApiError(err, 'Resolving training instance');
                return of(null);
            })
        );
    }

    public resumeRun(
        runId: number,
        type: TrainingTypeEnum
    ): Observable<AccessTrainingRunInfo | UrlTree> {
        const api =
            type === TrainingTypeEnum.LINEAR
                ? this.linearRunApi
                : this.adaptiveRunApi;
        return api.resume(runId).pipe(
            take(1),
            catchError((err) => {
                this.emitApiError(err, 'Accessing training run');
                return this.navigateToRunOverview();
            })
        );
    }

    public accessRun(
        runToken: string,
        type: TrainingTypeEnum
    ): Observable<AccessTrainingRunInfo | UrlTree> {
        const api =
            type === TrainingTypeEnum.LINEAR
                ? this.linearRunApi
                : this.adaptiveRunApi;
        return api.access(runToken).pipe(
            take(1),
            catchError((err) => {
                this.emitApiError(err, 'Accessing training run');
                return this.navigateToRunOverview();
            })
        );
    }

    public getRunResults(
        route: ActivatedRouteSnapshot,
        type: TrainingTypeEnum
    ): Observable<TrainingRun | null> {
        const api =
            type === TrainingTypeEnum.LINEAR
                ? this.linearRunApi
                : this.adaptiveRunApi;

        const runId = this.extractRunId(route);
        if (!runId) {
            this.emitFrontendError('No run id found in route');
            return of(null);
        }

        return api.get(runId).pipe(
            take(1),
            catchError((err) => {
                this.emitApiError(err, 'Fetching training run results');
                return of(null);
            })
        );
    }

    private extractRunId(route: ActivatedRouteSnapshot): number | null {
        const runId = RoutingUtils.extractVariable<'run'>('runId', route);
        if (!runId || isNaN(+runId)) {
            return null;
        }
        return +runId;
    }

    private extractInstanceId(route: ActivatedRouteSnapshot): number | null {
        const instanceId = RoutingUtils.extractVariable<
            'linear-instance' | 'adaptive-instance'
        >('instanceId', route);
        if (!instanceId || isNaN(+instanceId)) {
            return null;
        }
        return +instanceId;
    }

    private extractDefinitionId(route: ActivatedRouteSnapshot): number | null {
        const definitionId = RoutingUtils.extractVariable<
            'linear-definition' | 'adaptive-definition'
        >('definitionId', route);
        if (!definitionId || isNaN(+definitionId)) {
            return null;
        }
        return +definitionId;
    }
}
