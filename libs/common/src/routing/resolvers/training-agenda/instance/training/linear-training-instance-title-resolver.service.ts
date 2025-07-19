import { Injectable } from '@angular/core';
import { LINEAR_INSTANCE_PATH } from '@crczp/training-agenda';
import { TrainingInstanceTitleResolver } from './training-instance-title-resolver.service';
import { TrainingInstanceResolver } from './training-instance-resolver.service';

@Injectable()
export class LinearTrainingInstanceTitleResolver extends TrainingInstanceTitleResolver {
    constructor(trainingInstanceResolver: TrainingInstanceResolver) {
        super(trainingInstanceResolver, 'Create Linear Training Instance', LINEAR_INSTANCE_PATH);
    }
}
