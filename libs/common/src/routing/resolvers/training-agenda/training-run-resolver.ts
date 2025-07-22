import {ActivatedRouteSnapshot, Router, RouterStateSnapshot, UrlTree} from "@angular/router";
import {inject} from "@angular/core";
import {Routing} from "../../routing-namespace";
import {catchError, map, take} from "rxjs/operators";
import {Observable, of} from "rxjs";
import {ErrorHandlerService} from "../../../error-handling/error-handler.service";
import {AccessTrainingRunInfo, TrainingRun} from "libs/model/training-model/src";
import {AdaptiveRunApi, LinearRunApi} from "libs/api/training-api/src";

export namespace TrainingRunResolvers {

    function getRunOverviewRedirect(): UrlTree {
        return inject(Router).parseUrl(
            Routing.RouteBuilder.run.build()
        )
    }

    export function resolveRunAccess(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<AccessTrainingRunInfo | UrlTree> | UrlTree {

        const runId = Routing.Utils.extractVariable<'run'>('runId', route)
        const runToken = Routing.Utils.extractVariable<'run'>('runToken', route)

        const isAdaptive = Routing.Utils.containsSubroute('run/adaptive', state)

        const api = isAdaptive ? inject(AdaptiveRunApi) : inject(LinearRunApi);

        if (!runId && !runToken) {
            return getRunOverviewRedirect();
        }

        return (
            runId ? api.resume(+runId) : api.access(runToken!)
        ).pipe(
            take(1),
            catchError((err) => {
                inject(ErrorHandlerService).emit(err, 'Accessing adaptive run');
                return of(getRunOverviewRedirect());
            }),
        )
    }

    export function resolveAccessedTrainingRunResults(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<TrainingRun | UrlTree> | UrlTree {

        const runId = Routing.Utils.extractVariable<'run'>('runId', route)

        const isAdaptive = Routing.Utils.containsSubroute('run/adaptive', state)

        const api = isAdaptive ? inject(AdaptiveRunApi) : inject(LinearRunApi);

        if (runId) {
            return api.get(+runId).pipe(
                take(1),
                map((tr) => (tr || getRunOverviewRedirect())),
                catchError((err) => {
                    inject(ErrorHandlerService).emit(err, 'Training run data');
                    return of(getRunOverviewRedirect());
                }),
            );
        }

        return getRunOverviewRedirect();
    }


}
