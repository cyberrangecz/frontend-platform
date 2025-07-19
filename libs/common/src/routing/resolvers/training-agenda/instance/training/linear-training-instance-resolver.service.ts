import {Injectable} from '@angular/core';
import {Router} from '@angular/router';
import {LinearTrainingInstanceApi} from '@crczp/training-api';
import {LINEAR_INSTANCE_PATH, LinearTrainingNavigator, TrainingErrorHandler} from '@crczp/training-agenda';
import {TrainingInstanceResolver} from './training-instance-resolver.service';

/**
 * Router data provider
 */
@Injectable()
export class LinearTrainingInstanceResolver extends TrainingInstanceResolver {
    constructor(
        api: LinearTrainingInstanceApi,
        errorHandler: TrainingErrorHandler,
        navigator: LinearTrainingNavigator,
        router: Router,
    ) {
        super(api, errorHandler, router, LINEAR_INSTANCE_PATH, navigator.toTrainingInstanceOverview());
    }
}
