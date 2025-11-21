import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { AccessTrainingRunInfo } from '@crczp/training-model';
import { AbstractTrainingRunService } from '../services/training-run/abstract-training-run.service';
import { LinearTrainingRunService } from '../services/training-run/linear-training-run.service';
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
            useClass: LinearTrainingRunService,
        },
    ],
})
export class LinearTrainingRunDetailComponent {}
