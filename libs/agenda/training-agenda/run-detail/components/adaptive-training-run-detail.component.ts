import { Component } from '@angular/core';
import { AccessTrainingRunInfo } from '@crczp/training-model';
import { ActivatedRoute } from '@angular/router';
import { AbstractTrainingRunService } from '../services/training-run/abstract-training-run.service';
import { AdaptiveTrainingRunService } from '../services/training-run/adaptive-training-run.service';
import { TrainingRunComponent } from './training-run.component';

@Component({
    imports: [TrainingRunComponent],
    templateUrl: './generic-training-run-detail.component.html',
    styleUrl: './generic-training-run-detail.component.scss',
    providers: [
        {
            provide: AccessTrainingRunInfo,
            useFactory: (route: ActivatedRoute) => {
                return route.snapshot.data[AccessTrainingRunInfo.name];
            },
            deps: [ActivatedRoute],
        },
        {
            provide: AbstractTrainingRunService,
            useClass: AdaptiveTrainingRunService,
        },
    ],
})
export class AdaptiveTrainingRunDetailComponent {}
