import { inject, Injectable } from '@angular/core';
import { ErrorHandlerService } from '@crczp/utils';
import {
    ActivatedRouteSnapshot,
    RedirectCommand,
    Router,
    UrlTree,
} from '@angular/router';
import {
    LinearRunApi,
    LinearTrainingDefinitionApi,
    LinearTrainingInstanceApi,
} from '@crczp/training-api';
import {
    AccessTrainingRunInfo,
    TrainingDefinition,
    TrainingInstance,
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

    public definitionOverviewUrl(): UrlTree {
        return this.router.parseUrl(
            Routing.RouteBuilder.linear_definition.build(),
        );
    }

    public instanceOverviewUrl(): UrlTree {
        return this.router.parseUrl(
            Routing.RouteBuilder.linear_instance.build(),
        );
    }

    public runOverviewUrl(): UrlTree {
        return this.router.parseUrl(Routing.RouteBuilder.run.build());
    }

    public getDefinition(
        route: ActivatedRouteSnapshot,
    ): Observable<TrainingDefinition | null> {
        const definitionId = this.extractDefinitionId(route);
        if (!definitionId) {
            this.emitFrontendError('No definition id found in route');
            return of(null);
        }

        return this.linearDefinitionApi.get(definitionId).pipe(
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
    ): Observable<AccessTrainingRunInfo | RedirectCommand> {
        return this.linearRunApi.resume(runId).pipe(
            take(1),
            catchError((err) => {
                this.emitApiError(err, 'Accessing training run');
                return of(new RedirectCommand(this.runOverviewUrl()));
            }),
        );
    }

    public accessRun(
        runToken: string,
    ): Observable<AccessTrainingRunInfo | RedirectCommand> {
        return this.linearRunApi.access(runToken).pipe(
            take(1),
            catchError((err) => {
                this.emitApiError(err, 'Accessing training run');
                return of(new RedirectCommand(this.runOverviewUrl()));
            }),
        );
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
