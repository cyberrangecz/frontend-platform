import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AbstractFlagLevelComponent } from '../abstract-level-with-flag/subcomponents/abstract-flag-level/abstract-flag-level.component';
import { AsyncPipe } from '@angular/common';
import { AbstractAccessLevelService } from '../../../services/training-run/level/access/abstract-access-level.service';
import { LinearAccessLevelService } from '../../../services/training-run/level/access/linear-access-level.service';
import { GenericAccessLevelComponent } from './generic-access-level.component';
import { AbstractTrainingRunService } from '../../../services/training-run/abstract-training-run.service';

@Component({
    selector: 'crczp-linear-access-level',
    templateUrl: './access-level.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [AbstractFlagLevelComponent, AsyncPipe],
    providers: [
        {
            provide: AbstractAccessLevelService,
            useClass: LinearAccessLevelService,
        },
    ],
})
export class LinearAccessLevelComponent extends GenericAccessLevelComponent {
    constructor() {
        super(
            inject(AbstractTrainingRunService),
            inject(AbstractAccessLevelService),
        );
    }
}
