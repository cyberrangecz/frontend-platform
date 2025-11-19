import { AfterViewChecked, Component, DestroyRef, inject } from '@angular/core';
import { AbstractFlagLevelComponent } from '../abstract-level-with-flag/subcomponents/abstract-flag-level/abstract-flag-level.component';
import { AbstractTrainingLevelService } from '../../../services/training-run/level/access/training/abstract-training-level.service';
import { AdaptiveTrainingLevelService } from '../../../services/training-run/level/access/training/adaptive-training-level.service';
import { GenericTrainingLevelComponent } from './generic-training-level.component';
import { Observable, of } from 'rxjs';
import { Hint, TrainingPhase } from '@crczp/training-model';
import { map } from 'rxjs/operators';
import { AdaptiveTrainingRunService } from '../../../services/training-run/adaptive-training-run.service';
import { AsyncPipe } from '@angular/common';
import { AnswerFormHintsComponent } from '../abstract-level-with-flag/subcomponents/answer-floating-form/answer-form-hints/answer-form-hints.component';

@Component({
    selector: 'crczp-adaptive-training-level',
    templateUrl: './training-level.component.html',
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
    constructor() {
        super(
            inject(AdaptiveTrainingRunService),
            inject(AdaptiveTrainingLevelService),
            inject(DestroyRef),
        );
    }

    get levelContent$(): Observable<string> {
        return this.runService.runInfo$
            .observeProperty()
            .currentLevel.$()
            .pipe(map((level) => (level as TrainingPhase).currentTask.content));
    }

    get hints$(): Observable<Hint[]> {
        return of([]);
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
