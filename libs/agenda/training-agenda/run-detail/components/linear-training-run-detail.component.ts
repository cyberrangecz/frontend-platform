import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AccessTrainingRunInfo } from '@crczp/training-model';
import { AbstractTrainingRunService } from '../services/training-run/abstract-training-run.service';
import { LinearTrainingRunService } from '../services/training-run/linear-training-run.service';
import { TrainingRunComponent } from './training-run.component';
import { Routing } from '@crczp/routing-commons';

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
export class LinearTrainingRunDetailComponent {
    private readonly route = inject(ActivatedRoute);
    private readonly router = inject(Router);

    readonly runInfoSignal = signal<AccessTrainingRunInfo>(
        this.route.snapshot.data[AccessTrainingRunInfo.name] as AccessTrainingRunInfo
    );

    constructor() {
        const info = this.runInfoSignal();
        if (!info) return;
        const noLevelContent = (info.currentLevelId ?? 0) === 0;
        if (!noLevelContent) return;

        const reason = info.managed ? 'managedNoSandbox' : 'nonManagedNoSandbox';
        this.router.navigate(
            [Routing.RouteBuilder.run.build()],
            { queryParams: { resumeReason: reason } },
        );
    }
}
