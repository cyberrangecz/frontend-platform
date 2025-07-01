import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable } from 'rxjs';
import {
    ACCESS_TOKEN_PATH,
    CHEATING_DETECTION_PATH,
    PROGRESS_PATH,
    RESULTS_PATH,
    RUNS_PATH,
    SUMMARY_PATH,
} from '@crczp/training-agenda';

/**
 * Router breadcrumb title resolver
 */
@Injectable()
export class TrainingInstanceDetailBreadcrumbResolver {
    /**
     * Retrieves a breadcrumb title based on provided url
     * @param route route snapshot
     * @param state router state snapshot
     */
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<string> | Promise<string> | string {
        if (state.url.includes(SUMMARY_PATH)) {
            return 'Summary';
        }
        if (state.url.includes(PROGRESS_PATH)) {
            return 'Progress';
        }
        if (state.url.includes(RESULTS_PATH)) {
            return 'Results';
        }
        if (state.url.includes(ACCESS_TOKEN_PATH)) {
            return 'Access Token';
        }
        if (state.url.includes(RUNS_PATH)) {
            return 'Training Runs';
        }
        if (state.url.includes(CHEATING_DETECTION_PATH)) {
            return 'Cheating Detections';
        }
        return '';
    }
}
