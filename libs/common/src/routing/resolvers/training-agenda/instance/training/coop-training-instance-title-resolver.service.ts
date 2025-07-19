import { Injectable } from '@angular/core';
import { COOP_INSTANCE_PATH } from '@crczp/training-agenda';
import { TrainingInstanceResolver } from './training-instance-resolver.service';
import { TrainingInstanceTitleResolver } from './training-instance-title-resolver.service';

@Injectable()
export class CoopTrainingInstanceTitleResolver extends TrainingInstanceTitleResolver {
    constructor(trainingInstanceResolver: TrainingInstanceResolver) {
        super(trainingInstanceResolver, 'Create Coop Training Instance', COOP_INSTANCE_PATH);
    }
}
