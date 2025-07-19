import { Injectable } from '@angular/core';
import { COOP_DEFINITION_PATH } from '@crczp/training-agenda';
import { CommonTrainingDefinitionTitleResolver } from './common-definition-title-resolver.service';
import { CoopTrainingDefinitionResolver } from './coop-training-definition-resolver.service';

@Injectable()
export class CoopTrainingDefinitionTitleResolver extends CommonTrainingDefinitionTitleResolver {
    constructor(trainingDefinitionResolver: CoopTrainingDefinitionResolver) {
        super(trainingDefinitionResolver, COOP_DEFINITION_PATH);
    }
}
