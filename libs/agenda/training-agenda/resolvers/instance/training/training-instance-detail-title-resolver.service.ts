import {inject, Injectable} from '@angular/core';
import {ActivatedRouteSnapshot, RouterStateSnapshot} from '@angular/router';
import {TrainingInstance} from '@crczp/training-model';
import {Observable, of} from 'rxjs';
import {catchError, mergeMap, take} from 'rxjs/operators';
import {
    ACCESS_TOKEN_PATH,
    CHEATING_DETECTION_PATH,
    PROGRESS_PATH,
    RESULTS_PATH,
    RUNS_PATH,
    SUMMARY_PATH,
} from '@crczp/training-agenda';
import {TrainingInstanceResolver} from './training-instance-resolver.service';

@Injectable()
export class TrainingInstanceDetailTitleResolver {
    private trainingInstanceResolver = inject(TrainingInstanceResolver);


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
        if (state.url.includes(SUMMARY_PATH)) {
            return `Summary of ${ti.title}`;
        }
        if (state.url.includes(PROGRESS_PATH)) {
            return `Progress of ${ti.title}`;
        }
        if (state.url.includes(RESULTS_PATH)) {
            return `Results of ${ti.title}`;
        }
        if (state.url.includes(ACCESS_TOKEN_PATH)) {
            return `Access Token of ${ti.title}`;
        }
        if (state.url.includes(RUNS_PATH)) {
            return `Training Runs of ${ti.title}`;
        }
        if (state.url.includes(CHEATING_DETECTION_PATH)) {
            return `Cheating Detections of ${ti.title}`;
        }
        return ti.title;
    }
}
