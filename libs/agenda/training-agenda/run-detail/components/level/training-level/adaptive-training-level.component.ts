import { AfterViewChecked, Component, DestroyRef, inject } from '@angular/core';
import { AbstractFlagLevelComponent } from '../abstract-level-with-flag/subcomponents/abstract-flag-level/abstract-flag-level.component';
import { AbstractTrainingLevelService } from '../../../services/training-run/level/access/training/abstract-training-level.service';
import { AdaptiveTrainingLevelService } from '../../../services/training-run/level/access/training/adaptive-training-level.service';
import { GenericTrainingLevelComponent } from './generic-training-level.component';
import { Observable, of } from 'rxjs';
import { Hint, TrainingPhase } from '@crczp/training-model';
import { map } from 'rxjs/operators';
import { AsyncPipe } from '@angular/common';
import { AnswerFormHintsComponent } from '../abstract-level-with-flag/subcomponents/answer-floating-form/answer-form-hints/answer-form-hints.component';
import { AbstractTrainingRunService } from '../../../services/training-run/abstract-training-run.service';

@Component({
    selector: 'crczp-adaptive-training-level',
    templateUrl: './generic-training-level.component.html',
    imports: [AbstractFlagLevelComponent, AsyncPipe, AnswerFormHintsComponent],
    providers: [
        {
            provide: AbstractTrainingLevelService,
            useClass: AdaptiveTrainingLevelService,
        },
    ],
})
export class AdaptiveTrainingLevelComponent
    extends GenericTrainingLevelComponent
    implements AfterViewChecked
{
    readonly levelContent$: Observable<string>;
    readonly hints$: Observable<Hint[]>;

    constructor() {
        super(
            inject(AbstractTrainingRunService),
            inject(AbstractTrainingLevelService),
            inject(DestroyRef),
        );

        this.levelContent$ = this.runService.runInfo$
            .observeProperty()
            .displayedLevel.$()
            .pipe(map((level) => (level as TrainingPhase).currentTask.content));

        this.hints$ = of([]);
    }

    registerViewCheckHook(viewCheckHook: () => void): void {
        this.viewCheckedCallback = viewCheckHook;
    }

    ngAfterViewChecked(): void {
        this.viewCheckedCallback();
    }

    revealHint(_hint: Hint): void {
        throw new Error('Adaptive levels do not support hints');
    }

    private viewCheckedCallback: () => void = () => {
        /* */
    };
}
