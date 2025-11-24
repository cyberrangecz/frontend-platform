import {
    ChangeDetectionStrategy,
    Component,
    inject,
    OnInit,
} from '@angular/core';
import { AbstractFlagLevelComponent } from '../abstract-level-with-flag/subcomponents/abstract-flag-level/abstract-flag-level.component';
import { AsyncPipe } from '@angular/common';
import { AbstractAccessLevelService } from '../../../services/training-run/level/access/abstract-access-level.service';
import { LinearAccessLevelService } from '../../../services/training-run/level/access/linear-access-level.service';
import { GenericAccessLevelComponent } from './generic-access-level.component';
import { AbstractTrainingRunService } from '../../../services/training-run/abstract-training-run.service';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AccessLevel } from '@crczp/training-model';

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
export class LinearAccessLevelComponent
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
                    return (runInfo.displayedLevel as AccessLevel).localContent;
                }
                return (runInfo.displayedLevel as AccessLevel).cloudContent;
            }),
        );
    }
}
