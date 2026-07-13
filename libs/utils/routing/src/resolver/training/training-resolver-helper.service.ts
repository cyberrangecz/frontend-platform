import { inject, Injectable } from '@angular/core';
import { ErrorHandlerService } from '@crczp/utils';
import { ActivatedRouteSnapshot, Router, UrlTree } from '@angular/router';
import {
    LinearRunApi,
    LinearTrainingDefinitionApi,
    LinearTrainingInstanceApi,
} from '@crczp/training-api';
import {
    AccessTrainingRunInfo,
    TrainingDefinition,
    TrainingInstance,
    TrainingRun,
} from '@crczp/training-model';
import { catchError, take } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { RoutingUtils } from '../../utils';
import { CommonResolverHelperService } from '../common-resolver-helper-service';
import { Routing } from '../../routing-namespace';

@Injectable({
    providedIn: 'root',
})
export class TrainingResolverHelperService extends CommonResolverHelperService {
    private readonly linearDefinitionApi = inject(LinearTrainingDefinitionApi);
    private readonly linearInstanceApi = inject(LinearTrainingInstanceApi);
    private readonly linearRunApi = inject(LinearRunApi);

    constructor() {
        super(inject(ErrorHandlerService), inject(Router));
    }

    public navigateToDefinitionOverview() {
        return this.navigate(
            this.router.parseUrl(
                Routing.RouteBuilder.linear_definition.build(),
            ),
        );
    }

    public navigateToInstanceOverview() {
        return this.navigate(
            this.router.parseUrl(Routing.RouteBuilder.linear_instance.build()),
        );
    }

    public navigateToRunOverview() {
        return this.navigate(
            this.router.parseUrl(Routing.RouteBuilder.run.build()),
        );
    }

    public getDefinition(
        route: ActivatedRouteSnapshot,
        withLevels = false,
    ): Observable<TrainingDefinition | null> {
        const definitionId = this.extractDefinitionId(route);
        if (!definitionId) {
            this.emitFrontendError('No definition id found in route');
            return of(null);
        }

        return this.linearDefinitionApi.get(definitionId, withLevels).pipe(
            take(1),
            catchError((err) => {
                this.emitApiError(err, 'Resolving training definition');
                return of(null);
            }),
        );
    }

    public getInstance(
        route: ActivatedRouteSnapshot,
    ): Observable<TrainingInstance | null> {
        const instanceId = this.extractInstanceId(route);
        if (!instanceId) {
            this.emitFrontendError('No instance id found in route');
            return of(null);
        }

        return this.linearInstanceApi.get(instanceId).pipe(
            take(1),
            catchError((err) => {
                this.emitApiError(err, 'Resolving training instance');
                return of(null);
            }),
        );
    }

    public resumeRun(
        runId: number,
    ): Observable<AccessTrainingRunInfo | UrlTree> {
        return this.linearRunApi.resume(runId).pipe(
            take(1),
            catchError((err) => {
                this.emitApiError(err, 'Accessing training run');
                return this.navigateToRunOverview();
            }),
        );
    }

    public accessRun(
        runToken: string,
    ): Observable<AccessTrainingRunInfo | UrlTree> {
        return this.linearRunApi.access(runToken).pipe(
            take(1),
            catchError((err) => {
                this.emitApiError(err, 'Accessing training run');
                return this.navigateToRunOverview();
            }),
        );
    }

    public getRunResults(
        route: ActivatedRouteSnapshot,
    ): Observable<TrainingRun | null> {
        const runId = this.extractRunId(route);
        if (!runId) {
            this.emitFrontendError('No run id found in route');
            return of(null);
        }

        return this.linearRunApi.get(runId).pipe(
            take(1),
            catchError((err) => {
                this.emitApiError(err, 'Fetching training run results');
                return of(null);
            }),
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
        const instanceId = RoutingUtils.extractVariable<'linear-instance'>(
            'instanceId',
            route,
        );
        if (!instanceId || isNaN(+instanceId)) {
            return null;
        }
        return +instanceId;
    }

    private extractDefinitionId(route: ActivatedRouteSnapshot): number | null {
        const definitionId = RoutingUtils.extractVariable<'linear-definition'>(
            'definitionId',
            route,
        );
        if (!definitionId || isNaN(+definitionId)) {
            return null;
        }
        return +definitionId;
    }
}
