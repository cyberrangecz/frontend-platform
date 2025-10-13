import { Component } from '@angular/core';
import { TrainingTypeEnum } from '@crczp/training-model';
import { CommonTrainingDefinitionOverviewComponent } from './common-training-definition-overview.component';
import { Injection, providePaginationStorageService } from '@crczp/utils';

/**
 * Main smart component of training definition overview
 */
@Component({
    selector: 'crczp-linear-training-definition-overview',
    template: '<crczp-common-training-definition-overview/>',
    imports: [CommonTrainingDefinitionOverviewComponent],
    providers: [
        providePaginationStorageService(
            LinearTrainingDefinitionOverviewComponent
        ),
        {
            provide: Injection.TrainingType,
            useValue: TrainingTypeEnum.LINEAR,
        },
    ],
})
export class LinearTrainingDefinitionOverviewComponent {}
