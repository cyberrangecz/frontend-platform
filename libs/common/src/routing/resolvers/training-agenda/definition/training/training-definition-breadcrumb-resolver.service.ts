import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { TrainingDefinition } from '@crczp/training-model';
import { EMPTY, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import {
    TRAINING_DEFINITION_EDIT_PATH,
    DEFINITION_NEW_PATH,
    TRAINING_DEFINITION_SELECTOR,
} from '@crczp/training-agenda';
import { CommonTrainingDefinitionResolver } from './common-training-definition-resolver.service';

/**
 * Router breadcrumb title provider
 */
@Injectable()
export class TrainingDefinitionBreadcrumbResolver {
    constructor(private trainingDefinitionResolver: CommonTrainingDefinitionResolver) {}

    /**
     * Retrieves a breadcrumb title based on provided url
     * @param route route snapshot
     * @param state router state snapshot
     */
    resolve(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<string> | Promise<string> | string {
        if (state.url.endsWith(DEFINITION_NEW_PATH)) {
            return 'Create';
        } else if (route.paramMap.has(TRAINING_DEFINITION_SELECTOR)) {
            const resolved = this.trainingDefinitionResolver.resolve(route, state) as Observable<TrainingDefinition>;
            return resolved.pipe(map((td) => (td ? this.getBreadcrumbFromDefinition(td, state) : '')));
        }
        return EMPTY;
    }

    private getBreadcrumbFromDefinition(trainingDefinition: TrainingDefinition, state: RouterStateSnapshot): string {
        return state.url.includes(TRAINING_DEFINITION_EDIT_PATH)
            ? `Edit ${trainingDefinition.title}`
            : trainingDefinition.title;
    }
}
