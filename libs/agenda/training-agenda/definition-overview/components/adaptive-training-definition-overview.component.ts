import { Component } from '@angular/core';
import { TrainingTypeEnum } from '@crczp/training-model';
import { TRAINING_TYPE_TOKEN } from '../../instance-edit/components/training-type-token';
import { CommonTrainingDefinitionOverviewComponent } from './common-training-definition-overview.component';
import { providePaginationStorageService } from '@crczp/utils';

/**
 * Main smart component of training definition overview
 */
@Component({
    selector: 'crczp-linear-training-definition-overview',
    template: '<crczp-common-training-definition-overview/>',
    imports: [CommonTrainingDefinitionOverviewComponent],
    providers: [
        providePaginationStorageService(
            AdaptiveTrainingDefinitionOverviewComponent
        ),
        {
            provide: TRAINING_TYPE_TOKEN,
            useValue: TrainingTypeEnum.ADAPTIVE,
        },
    ],
})
export class AdaptiveTrainingDefinitionOverviewComponent {}
