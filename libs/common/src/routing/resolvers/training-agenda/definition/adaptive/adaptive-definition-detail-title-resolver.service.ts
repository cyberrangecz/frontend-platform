import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { TrainingDefinition } from '@crczp/training-model';
import { Observable, of } from 'rxjs';
import { catchError, mergeMap, take } from 'rxjs/operators';
import { SUMMARY_PATH } from '@crczp/training-agenda';
import { AdaptiveDefinitionResolver } from './adaptive-definition-resolver.service';

@Injectable()
export class AdaptiveDefinitionDetailTitleResolver {
    constructor(private adaptiveDefinitionResolver: AdaptiveDefinitionResolver) {}

    /**
     * Retrieves a specific resource title based on id provided in url
     * @param route route snapshot
     * @param state router state snapshot
     */
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<string> | Promise<string> | string {
        const resolved = this.adaptiveDefinitionResolver.resolve(route, state) as Observable<TrainingDefinition>;
        return resolved.pipe(
            take(1),
            mergeMap((td) => (td ? of(this.resolveTitle(td, state)) : '')),
            catchError(() => ''),
        );
    }

    private resolveTitle(td: TrainingDefinition, state: RouterStateSnapshot): string {
        if (state.url.includes(SUMMARY_PATH)) {
            return `Summary of ${td.title}`;
        }
        return td.title;
    }
}
