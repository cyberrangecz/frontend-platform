import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { TrainingDefinition } from '@crczp/training-model';
import { Observable, of } from 'rxjs';
import { catchError, mergeMap, take } from 'rxjs/operators';
import { ADAPTIVE_DEFINITION_PATH, ADAPTIVE_DEFINITION_SELECTOR, DEFINITION_NEW_PATH } from '@crczp/training-agenda';
import { AdaptiveDefinitionResolver } from './adaptive-definition-resolver.service';

@Injectable()
export class AdaptiveDefinitionTitleResolver {
    constructor(private adaptiveDefinitionResolver: AdaptiveDefinitionResolver) {}

    /**
     * Retrieves a specific resource title based on id provided in url
     * @param route route snapshot
     * @param state router state snapshot
     */
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<string> | Promise<string> | string {
        if (state.url.endsWith(`${ADAPTIVE_DEFINITION_PATH}/${DEFINITION_NEW_PATH}`)) {
            return 'Create Adaptive Training Definition';
        } else if (route.paramMap.has(ADAPTIVE_DEFINITION_SELECTOR)) {
            const resolved = this.adaptiveDefinitionResolver.resolve(route, state) as Observable<TrainingDefinition>;
            return resolved.pipe(
                take(1),
                mergeMap((td) => (td ? of(`Edit ${td.title}`) : '')),
                catchError(() => ''),
            );
        }
        return '';
    }
}
