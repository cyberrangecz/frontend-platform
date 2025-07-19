import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { TrainingInstance } from '@crczp/training-model';
import { Observable, of } from 'rxjs';
import { catchError, mergeMap, take } from 'rxjs/operators';
import { CHEATING_DETECTION_CREATE_PATH, CHEATING_DETECTION_EVENTS_PATH } from '@crczp/training-agenda';
import { TrainingInstanceResolver } from './training-instance-resolver.service';

@Injectable()
export class TrainingInstanceDetailCheatingTitleResolver {
    constructor(private trainingInstanceResolver: TrainingInstanceResolver) {}

    /**
     * Retrieves a specific resource title based on id provided in url
     * @param route route snapshot
     * @param state router state snapshot
     */
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<string> | Promise<string> | string {
        const resolved = this.trainingInstanceResolver.resolve(route, state) as Observable<TrainingInstance>;
        return resolved.pipe(
            take(1),
            mergeMap((ti) => (ti ? of(this.resolveTitle(ti, state)) : '')),
            catchError(() => ''),
        );
    }

    private resolveTitle(ti: TrainingInstance, state: RouterStateSnapshot): string {
        if (state.url.includes(CHEATING_DETECTION_CREATE_PATH)) {
            return `Create of cheating detection of ${ti.title}`;
        }
        if (state.url.includes(CHEATING_DETECTION_EVENTS_PATH)) {
            return `Detection events of cheating detection of ${ti.title}`;
        }
        return ti.title;
    }
}
