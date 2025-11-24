import { AfterViewChecked, Component, DestroyRef, inject } from '@angular/core';
import { AbstractFlagLevelComponent } from '../abstract-level-with-flag/subcomponents/abstract-flag-level/abstract-flag-level.component';
import { AbstractTrainingLevelService } from '../../../services/training-run/level/access/training/abstract-training-level.service';
import { LinearTrainingLevelService } from '../../../services/training-run/level/access/training/linear-training-level.service';
import { GenericTrainingLevelComponent } from './generic-training-level.component';
import { Observable } from 'rxjs';
import { Hint, TrainingLevel } from '@crczp/training-model';
import { AsyncPipe } from '@angular/common';
import { map } from 'rxjs/operators';
import { AnswerFormHintsComponent } from '../abstract-level-with-flag/subcomponents/answer-floating-form/answer-form-hints/answer-form-hints.component';
import { AbstractTrainingRunService } from '../../../services/training-run/abstract-training-run.service';

@Component({
    selector: 'crczp-linear-training-level',
    templateUrl: './generic-training-level.component.html',
    imports: [AbstractFlagLevelComponent, AsyncPipe, AnswerFormHintsComponent],
    providers: [
        {
            provide: AbstractTrainingLevelService,
            useClass: LinearTrainingLevelService,
        },
    ],
})
export class LinearTrainingLevelComponent
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
            .pipe(map((level) => (level as TrainingLevel).content));

        this.hints$ = this.runService.runInfo$
            .observeProperty()
            .displayedLevel.$()
            .pipe(map((level) => (level as TrainingLevel).hints));
    }

    revealHint(hint: Hint): void {
        (this.trainingLevelService as LinearTrainingLevelService).revealHint(
            hint,
        );
    }

    registerViewCheckHook(viewCheckHook: () => void): void {
        this.viewCheckedCallback = viewCheckHook;
    }

    ngAfterViewChecked(): void {
        this.viewCheckedCallback();
    }

    private viewCheckedCallback: () => void = () => {
        /* replaced by registered callback */
    };
}
