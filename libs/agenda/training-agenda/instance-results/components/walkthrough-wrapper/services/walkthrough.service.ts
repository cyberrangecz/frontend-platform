import {inject, Injectable} from '@angular/core';
import {Observable} from 'rxjs';
import {TrainingDefinition} from '@crczp/training-model';
import {LinearTrainingDefinitionApi} from '@crczp/training-api';

@Injectable()
export class WalkthroughService {
    private api = inject(LinearTrainingDefinitionApi);


    /**
     * Gets training definition by @definitionId. Updates related observables or handles an error
     * @param definitionId ID of requested training definition
     */
    get(definitionId: number): Observable<TrainingDefinition> {
        return this.api.get(definitionId, true);
    }
}
