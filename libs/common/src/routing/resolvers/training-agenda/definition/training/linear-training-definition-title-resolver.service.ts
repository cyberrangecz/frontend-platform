import { Injectable } from '@angular/core';
import { LINEAR_DEFINITION_PATH } from '@crczp/training-agenda';
import { CommonTrainingDefinitionTitleResolver } from './common-definition-title-resolver.service';
import { LinearTrainingDefinitionResolver } from './linear-training-definition-resolver.service';

@Injectable()
export class LinearTrainingDefinitionTitleResolver extends CommonTrainingDefinitionTitleResolver {
    constructor(trainingDefinitionResolver: LinearTrainingDefinitionResolver) {
        super(trainingDefinitionResolver, LINEAR_DEFINITION_PATH);
    }
}
