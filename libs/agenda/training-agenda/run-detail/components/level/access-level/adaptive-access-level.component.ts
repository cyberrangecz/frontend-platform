import {
    ChangeDetectionStrategy,
    Component,
    inject,
    OnInit,
} from '@angular/core';
import { AbstractFlagLevelComponent } from '../abstract-level-with-flag/subcomponents/abstract-flag-level/abstract-flag-level.component';
import { AsyncPipe } from '@angular/common';
import { AbstractAccessLevelService } from '../../../services/training-run/level/access/abstract-access-level.service';
import { GenericAccessLevelComponent } from './generic-access-level.component';
import { AbstractTrainingRunService } from '../../../services/training-run/abstract-training-run.service';
import { AdaptiveAccessLevelService } from '../../../services/training-run/level/access/adaptive-access-level.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AccessPhase } from '@crczp/training-model';

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
export class AdaptiveAccessLevelComponent
    extends GenericAccessLevelComponent
    implements OnInit
{
    protected levelContent$: Observable<string>;
    constructor() {
        super(
            inject(AbstractTrainingRunService),
            inject(AbstractAccessLevelService),
        );
    }

    ngOnInit(): void {
        this.levelContent$ = this.runService.runInfo$.pipe(
            map((runInfo) => {
                if (runInfo.localEnvironment) {
                    return (runInfo.displayedLevel as AccessPhase).localContent;
                }
                return (runInfo.displayedLevel as AccessPhase).cloudContent;
            }),
        );
    }
}
