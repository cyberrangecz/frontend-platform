import {
    AfterViewInit,
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    ElementRef,
    HostListener,
    inject,
    OnInit,
    signal,
    ViewChild
} from '@angular/core';
import { AbstractLevelTypeEnum, AbstractPhaseTypeEnum, AccessTrainingRunInfo } from '@crczp/training-model';
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
import { RunTopologyWrapperComponent } from './run-topology-wrapper/run-topology-wrapper.component';
import { Stepper, StepperItem, TopologySynchronizerService } from '@crczp/components';
import { SentinelResizeDirective } from '@sentinel/common/resize';

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
        Stepper,
        SentinelResizeDirective,
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
    protected readonly stepperSteps = signal<StepperItem[]>([]);
    protected readonly stepperSelectedIndex = signal<number | null>(null);
    protected readonly stepperLastIndex = signal<number | null>(null);
    protected readonly stepperHeight = signal<number>(148);

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
        this.onResize();
    }

    @HostListener('window:resize')
    onResize() {
        this.topologyService.setMaxTopologyWidth(
            this.levelContent.nativeElement.clientWidth * 0.65,
        );
        this.topologyService.setMinTopologyWidth(
            this.levelContent.nativeElement.clientWidth * 0.25,
        );
    }

    ngOnInit(): void {
        this.runService.runInfo$.subscribe((runInfo) => {
            this.updateLevelType(runInfo);
            this.updateTopologyAllowed(runInfo);
            this.updateStepper(runInfo);
        });
    }

    private updateLevelType(runInfo: AccessTrainingRunInfo) {
        const levelType = runInfo.displayedLevel.type;
        this.levelType.set(levelType);
    }

    private updateTopologyAllowed(runInfo: AccessTrainingRunInfo) {
        const shouldCollapse =
            runInfo.displayedLevel.type !== AbstractLevelTypeEnum.Training &&
            runInfo.displayedLevel.type !== AbstractLevelTypeEnum.Access &&
            runInfo.displayedLevel.type !== AbstractPhaseTypeEnum.Training &&
            runInfo.displayedLevel.type !== AbstractPhaseTypeEnum.Access;
        this.topologyAllowed.set(!shouldCollapse && !runInfo.localEnvironment);
        this.topologyService.setTopologyCollapsed(
            shouldCollapse || runInfo.localEnvironment,
        );
    }

    private levelTypeToIcon(
        levelType: AbstractLevelTypeEnum | AbstractPhaseTypeEnum,
    ): string {
        switch (levelType) {
            case AbstractLevelTypeEnum.Info:
            case AbstractPhaseTypeEnum.Info:
                return 'info';
            case AbstractLevelTypeEnum.Training:
            case AbstractPhaseTypeEnum.Training:
                return 'videogame_asset';
            case AbstractLevelTypeEnum.Access:
            case AbstractPhaseTypeEnum.Access:
                return 'settings';
            case AbstractLevelTypeEnum.Assessment:
                return 'assignment';
            case AbstractPhaseTypeEnum.Questionnaire:
                return 'quiz';
            default:
                return 'help';
        }
    }

    private updateStepper(runInfo: AccessTrainingRunInfo) {
        const steps: StepperItem[] = runInfo.levels.map((level) => ({
            icon: this.levelTypeToIcon(level.type),
            label: level.title,
        }));
        this.stepperSteps.set(steps);
        this.stepperSelectedIndex.set(runInfo.displayedLevel.order);
        this.stepperLastIndex.set(runInfo.currentLevel.order);
    }
}
