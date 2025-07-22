import {Routing} from "../../routing-namespace";
import {ActivatedRouteSnapshot, RouterStateSnapshot} from "@angular/router";
import {Observable} from "rxjs";
import {TrainingInstance} from "@crczp/training-model";
import {catchError, map, take} from "rxjs/operators";


export namespace CheatingDetectionResolvers {

    /**
     * Retrieves a breadcrumb title based on provided url
     * @param route route snapshot
     * @param state router state snapshot
     */
    export function resolveCheatingDetectionBreadcrumb(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<string> | Promise<string> | string {
        if (Routing.Utils.containsSubroute('cheating-detection/create', state)) {
            return 'Create';
        }
        if (Routing.Utils.containsSubroute('cheating-detection/:eventId', state)) {
            return 'Detection-event-detail';
        }
        if (Routing.Utils.containsSubroute('cheating-detection', state)) {
            return 'Detection-events';
        }

        return '';
    }

    /**
     * Retrieves a specific resource title based on id provided in url
     * @param route route snapshot
     * @param state router state snapshot
     */
    export function resolveCheatingDetectionTitle(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<string> | Promise<string> | string {
        const resolved = Routing.Resolvers.TrainingInstance.linearInstanceResolver(route, state);
        return resolved.pipe(
            take(1),
            map((ti) => (ti && ti instanceof TrainingInstance ? resolveTitle(ti, state) : '')),
            catchError(() => ''),
        );
    }

    function resolveTitle(ti: TrainingInstance, state: RouterStateSnapshot): string {
        if (Routing.Utils.containsSubroute('cheating-detection/create', state)) {
            return `Create of cheating detection of ${ti.title}`;
        }
        if (Routing.Utils.containsSubroute('cheating-detection', state)) {
            return `Detection events of cheating detection of ${ti.title}`;
        }
        return ti.title;
    }
}
