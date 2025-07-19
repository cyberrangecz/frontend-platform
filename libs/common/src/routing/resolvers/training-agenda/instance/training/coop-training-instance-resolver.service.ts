import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {LinearTrainingInstanceApi} from '@crczp/training-api';
import {COOP_INSTANCE_PATH, CoopTrainingNavigator, TrainingErrorHandler} from '@crczp/training-agenda';
import {TrainingInstanceResolver} from './training-instance-resolver.service';

/**
 * Router data provider
 */
@Injectable()
export class CoopTrainingInstanceResolver extends TrainingInstanceResolver {
    constructor(
        api: LinearTrainingInstanceApi,
        errorHandler: TrainingErrorHandler,
        navigator: CoopTrainingNavigator,
        router: Router,
    ) {
        super(api, errorHandler, router, COOP_INSTANCE_PATH, navigator.toTrainingInstanceOverview());
    }
}
