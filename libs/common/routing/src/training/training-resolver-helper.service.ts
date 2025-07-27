import { inject, Injectable } from '@angular/core';
import { ErrorHandlerService } from '@crczp/utils';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import {
    AdaptiveInstanceApi,
    AdaptiveRunApi,
    AdaptiveTrainingDefinitionApi,
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
import { Routing } from '../routing-namespace';
import { RoutingUtils } from '../utils';

@Injectable({
    providedIn: 'root',
})
export class TrainingResolverHelperService {
    private readonly errorHandler = inject(ErrorHandlerService);
    public readonly emitError = this.errorHandler.emit;
    private readonly router = inject(Router);

    private readonly linearDefinitionApi = inject(LinearTrainingDefinitionApi);
    private readonly adaptiveDefinitionApi = inject(
        AdaptiveTrainingDefinitionApi
    );

    private readonly linearInstanceApi = inject(LinearTrainingInstanceApi);
    private readonly adaptiveInstanceApi = inject(AdaptiveInstanceApi);

    private readonly linearRunApi = inject(LinearRunApi);
    private readonly adaptiveRunApi = inject(AdaptiveRunApi);

    public getDefinitionOverviewRedirect(type: TrainingTypeEnum): UrlTree {
        return this.router.parseUrl(
            type === TrainingTypeEnum.LINEAR
                ? Routing.RouteBuilder.linear_definition.build()
                : Routing.RouteBuilder.adaptive_definition.build()
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
            return of(null);
        }

        return api.get(definitionId, false).pipe(
            take(1),
            catchError((err) => {
                this.emitError(err, 'Resolving training definition');
                return of(null);
            })
        );
    }

    public getInstanceOverviewRedirect(type: TrainingTypeEnum): UrlTree {
        return this.router.parseUrl(
            type === TrainingTypeEnum.LINEAR
                ? Routing.RouteBuilder.linear_instance.build()
                : Routing.RouteBuilder.adaptive_instance.build()
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
            return of(null);
        }

        return api.get(instanceId).pipe(
            take(1),
            catchError((err) => {
                this.emitError(err, 'Resolving training instance');
                return of(null);
            })
        );
    }

    public getRunOverviewRedirect(): UrlTree {
        return this.router.parseUrl(Routing.RouteBuilder.run.build());
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
                this.emitError(err, 'Accessing training run');
                return of(this.getRunOverviewRedirect());
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
                this.emitError(err, 'Accessing training run');
                return of(this.getRunOverviewRedirect());
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
            return of(null);
        }

        return api.get(runId).pipe(
            take(1),
            catchError((err) => {
                this.emitError(err, 'Fetching training run results');
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
