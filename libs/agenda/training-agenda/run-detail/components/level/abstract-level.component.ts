import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { AbstractLevelTypeEnum, AbstractPhaseTypeEnum } from '@crczp/training-model';
import { TrainingTimerComponent } from './training-timer/training-timer.component';
import { MatTooltip } from '@angular/material/tooltip';
import { AbstractTrainingRunService } from '../../services/training-run/abstract-training-run.service';
import { AsyncPipe } from '@angular/common';
import '@crczp/mixins';
import { InfoLevelComponent } from './info-level/info-level.component';
import { LinearTrainingLevelComponent } from './training-level/linear-training-level.component';
import { AdaptiveTrainingLevelComponent } from './training-level/adaptive-training-level.component';
import { AssessmentLevelComponent } from './assessment-level/assessment-level.component';
import { QuestionnaireLevelComponent } from './questionnaire-phase/questionnaire-level.component';
import { AdaptiveAccessLevelComponent } from './access-level/adaptive-access-level.component';
import { LinearAccessLevelComponent } from './access-level/linear-access-level.component';
import { Observable } from 'rxjs';

/**
 * Component to display one level in a training run. Serves mainly as a wrapper which determines the type of the training
 * and displays child component accordingly
 */
@Component({
    selector: 'crczp-abstract-level',
    templateUrl: './abstract-level.component.html',
    styleUrls: ['./abstract-level.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        TrainingTimerComponent,
        MatTooltip,
        AsyncPipe,
        InfoLevelComponent,
        AdaptiveAccessLevelComponent,
        AdaptiveAccessLevelComponent,
        LinearAccessLevelComponent,
        LinearTrainingLevelComponent,
        AdaptiveTrainingLevelComponent,
        AssessmentLevelComponent,
        QuestionnaireLevelComponent,
    ],
})
export class AbstractLevelComponent implements OnInit {
    protected readonly runService = inject(AbstractTrainingRunService);
    protected readonly levelType = signal<
        AbstractLevelTypeEnum | AbstractPhaseTypeEnum
    >(null);
    protected readonly destroyRef = inject(DestroyRef);
    protected readonly AbstractLevelTypeEnum = AbstractLevelTypeEnum;
    protected readonly AbstractPhaseTypeEnum = AbstractPhaseTypeEnum;

    protected readonly displayedLevelTitle$: Observable<string>;
    protected readonly startTime$: Observable<Date>;

    constructor() {
        this.displayedLevelTitle$ = this.runService.runInfo$
            .observeProperty()
            .displayedLevel.title.$();

        this.startTime$ = this.runService.runInfo$
            .observeProperty()
            .startTime.$();
    }

    ngOnInit(): void {
        this.runService.runInfo$.subscribe((runInfo) => {
            this.levelType.set(runInfo.displayedLevel.type);
        });
    }
}
