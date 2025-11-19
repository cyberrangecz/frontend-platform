import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { AbstractFlagLevelComponent } from '../abstract-level-with-flag/subcomponents/abstract-flag-level/abstract-flag-level.component';
import { AsyncPipe } from '@angular/common';
import { AbstractAccessLevelService } from '../../../services/training-run/level/access/abstract-access-level.service';
import { GenericAccessLevelComponent } from './generic-access-level.component';
import { AbstractTrainingRunService } from '../../../services/training-run/abstract-training-run.service';
import { AdaptiveAccessLevelService } from '../../../services/training-run/level/access/adaptive-access-level.service';

@Component({
    selector: 'crczp-adaptive-access-level',
    templateUrl: './access-level.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [AbstractFlagLevelComponent, AsyncPipe],
    providers: [
        {
            provide: AbstractAccessLevelService,
            useClass: AdaptiveAccessLevelService,
        },
    ],
})
export class AdaptiveAccessLevelComponent extends GenericAccessLevelComponent {
    constructor() {
        super(
            inject(AbstractTrainingRunService),
            inject(AbstractAccessLevelService),
        );
    }
}
