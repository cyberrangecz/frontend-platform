import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { TrainingDefinition } from '@crczp/training-model';
import { Observable, of } from 'rxjs';
import { catchError, mergeMap, take } from 'rxjs/operators';
import { DEFINITION_NEW_PATH, TRAINING_DEFINITION_SELECTOR } from '@crczp/training-agenda';
import { CommonTrainingDefinitionResolver } from './common-training-definition-resolver.service';

export class CommonTrainingDefinitionTitleResolver {
    constructor(
        private trainingDefinitionResolver: CommonTrainingDefinitionResolver,
        private basePath: string,
    ) {}

    /**
     * Retrieves a specific resource title based on id provided in url
     * @param route route snapshot
     * @param state router state snapshot
     */
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<string> | Promise<string> | string {
        if (state.url.endsWith(`${this.basePath}/${DEFINITION_NEW_PATH}`)) {
            return 'Create Training Definition';
        } else if (route.paramMap.has(TRAINING_DEFINITION_SELECTOR)) {
            const resolved = this.trainingDefinitionResolver.resolve(route, state) as Observable<TrainingDefinition>;
            return resolved.pipe(
                take(1),
                mergeMap((td) => (td ? of(`Edit ${td.title}`) : '')),
                catchError(() => ''),
            );
        }
        return '';
    }
}
