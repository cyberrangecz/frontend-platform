import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    inject,
    OnInit,
    signal,
    ViewChild
} from '@angular/core';
import { AbstractLevelTypeEnum, AbstractPhaseTypeEnum } from '@crczp/training-model';
import { TrainingTimerComponent } from './training-timer/training-timer.component';
import { MatTooltip } from '@angular/material/tooltip';
import { AbstractTrainingRunService } from '../../services/training-run/abstract-training-run.service';
import { AsyncPipe, NgClass } from '@angular/common';
import '@crczp/mixins';
import { InfoLevelComponent } from './info-level/info-level.component';
import { LinearTrainingLevelComponent } from './training-level/linear-training-level.component';
import { AdaptiveTrainingLevelComponent } from './training-level/adaptive-training-level.component';
import { AssessmentLevelComponent } from './assessment-level/assessment-level.component';
import { QuestionnaireLevelComponent } from './questionnaire-phase/questionnaire-level.component';
import { AdaptiveAccessLevelComponent } from './access-level/adaptive-access-level.component';
import { LinearAccessLevelComponent } from './access-level/linear-access-level.component';
import { Observable } from 'rxjs';
import { RunTopologyWrapperComponent } from './run-topology-wrapper/run-topology-wrapper.component';
import { TopologySynchronizerService } from '@crczp/topology-graph';
import { MatIcon } from '@angular/material/icon';

/**
 * Component to display one level in a training run. Serves mainly as a wrapper which determines the type of the training
 * and displays child component accordingly
 */
@Component({
    selector: 'crczp-abstract-level',
    templateUrl: './abstract-level.component.html',
    styleUrls: ['./abstract-level.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    providers: [TopologySynchronizerService],
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
        RunTopologyWrapperComponent,
        NgClass,
        MatIcon,
    ],
})
export class AbstractLevelComponent implements OnInit, AfterViewInit {
    @ViewChild('levelContent')
    protected readonly levelContent: ElementRef<HTMLDivElement>;

    protected readonly runService = inject(AbstractTrainingRunService);
    protected readonly levelType = signal<
        AbstractLevelTypeEnum | AbstractPhaseTypeEnum
    >(null);
    protected readonly destroyRef = inject(DestroyRef);
    protected readonly AbstractLevelTypeEnum = AbstractLevelTypeEnum;
    protected readonly AbstractPhaseTypeEnum = AbstractPhaseTypeEnum;
    protected readonly displayedLevelTitle$: Observable<string>;
    protected readonly startTime$: Observable<Date>;
    protected readonly topologyService = inject(TopologySynchronizerService);
    protected readonly topologyAllowed = signal<boolean>(true);

    constructor() {
        this.displayedLevelTitle$ = this.runService.runInfo$
            .observeProperty()
            .displayedLevel.title.$();

        this.startTime$ = this.runService.runInfo$
            .observeProperty()
            .startTime.$();
    }

    ngAfterViewInit(): void {
        this.topologyService.emitTopologyWidthChange(
            this.levelContent.nativeElement.clientWidth / 2,
        );
    }

    ngOnInit(): void {
        this.runService.runInfo$.subscribe((runInfo) => {
            const levelType = runInfo.displayedLevel.type;
            console.log('Level type set to: ', levelType);
            this.levelType.set(levelType);
            const shouldCollapse =
                levelType !== AbstractLevelTypeEnum.Training &&
                levelType !== AbstractLevelTypeEnum.Access &&
                levelType !== AbstractPhaseTypeEnum.Training &&
                levelType !== AbstractPhaseTypeEnum.Access;
            this.topologyAllowed.set(!shouldCollapse);
            this.topologyService.setTopologyCollapsed(shouldCollapse);
        });
    }
}
