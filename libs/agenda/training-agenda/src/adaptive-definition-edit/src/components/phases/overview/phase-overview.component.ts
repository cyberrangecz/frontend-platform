import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    EventEmitter,
    inject,
    Input,
    OnChanges,
    OnInit,
    Output,
    SimpleChanges,
} from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { SentinelControlItem } from '@sentinel/components/controls';
import { Observable } from 'rxjs';
import { map, tap } from 'rxjs/operators';
import {
    AdaptiveQuestion,
    MitreTechnique,
    Phase,
    QuestionnairePhase,
    QuestionnaireTypeEnum,
    TrainingDefinition,
    TrainingPhase,
} from '@crczp/training-model';
import { PhaseStepperAdapter } from '@crczp/training-agenda/internal';
import { PhaseEditService } from '../../../services/state/phase/phase-edit.service';
import { PhaseMoveEvent } from '../../../model/events/phase-move-event';
import { PhaseOverviewControls } from '../../../model/adapters/phase-overview-controls';
import { PhaseRelation } from '@crczp/training-model/lib/phase/questionnaire-phase/phase-relation';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Smart component for phases stepper and phases edit components
 */
@Component({
    selector: 'crczp-phase-overview',
    templateUrl: './phase-overview.component.html',
    styleUrls: ['./phase-overview.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PhaseOverviewComponent implements OnInit, OnChanges {
    @Output() unsavedPhases: EventEmitter<Phase[]> = new EventEmitter();
    @Output() phasesCount: EventEmitter<number> = new EventEmitter();
    @Input() trainingDefinition: TrainingDefinition;
    @Input() mitreTechniquesList: MitreTechnique[];

    activeStep$: Observable<number>;
    stepperPhases$: Observable<PhaseStepperAdapter[]>;
    controls: SentinelControlItem[];
    phaseMovingInProgress: boolean;
    updateMatrix$: Observable<boolean>;
    updateQuestionsFlag$: Observable<boolean>;
    presentTrainingPhases$: Observable<TrainingPhase[]>;
    phaseRelations: PhaseRelation[] = [];
    questions: Map<number, AdaptiveQuestion> = new Map<number, AdaptiveQuestion>();
    destroyRef = inject(DestroyRef);

    constructor(
        private dialog: MatDialog,
        private phaseService: PhaseEditService,
    ) {}

    ngOnInit(): void {
        this.activeStep$ = this.phaseService.activeStep$;
        this.stepperPhases$ = this.phaseService.phases$.pipe(
            map((phases) => phases.map((phase) => new PhaseStepperAdapter(phase))),
            tap(() => this.phasesCount.emit(this.phaseService.getPhasesCount())),
        );

        this.updateMatrix$ = this.phaseService.updateMatrix$;
        this.updateQuestionsFlag$ = this.phaseService.updateQuestionsFlag$;
        this.presentTrainingPhases$ = this.phaseService.presentTrainingPhases$;

        this.phaseService.unsavedPhases$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((unsavedLevels) => this.unsavedPhases.emit(unsavedLevels));
        this.initControl();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('trainingDefinition' in changes) {
            this.phaseService.set(this.trainingDefinition.id, this.trainingDefinition.levels as Phase[]);
            this.phaseService.phases$
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe((phases) => this.updateQuestionsAndPhaseRelations(phases));
        }
    }

    /**
     * Calls service to set new active phases
     * @param phaseIndex index of new active phases
     */
    onActivePhaseChange(phaseIndex: number): void {
        this.phaseService.setActivePhase(phaseIndex);
    }

    onControlAction(control: SentinelControlItem): void {
        control.result$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }

    /**
     * Call service to move phases from original position to a new one
     * @param event event of phases move
     */
    onPhaseMoved(event: PhaseMoveEvent): void {
        this.phaseMovingInProgress = true;
        this.phaseService.move(event.stepperState.previousIndex, event.stepperState.currentIndex);
        this.phaseMovingInProgress = false;
    }

    onActivePhaseChanged(phase: Phase): void {
        this.phaseService.onActivePhaseChanged(phase);
    }

    private initControl(): void {
        const deleteDisabled$ = this.phaseService.phases$.pipe(map((phases) => phases.length <= 0));
        this.controls = PhaseOverviewControls.create(this.phaseService, deleteDisabled$);
    }

    private updateQuestionsAndPhaseRelations(phases: Phase[]) {
        const newPhaseRelations = [];
        const newQuestions = new Map<number, AdaptiveQuestion>();
        phases
            .filter(
                (phase) =>
                    phase instanceof QuestionnairePhase &&
                    (phase as QuestionnairePhase).questionnaireType === QuestionnaireTypeEnum.Adaptive,
            )
            .forEach((phase) => {
                newPhaseRelations.push(...(phase as QuestionnairePhase).phaseRelations);
                (phase as QuestionnairePhase).questions.forEach((question) => newQuestions.set(question.id, question));
            });
        this.phaseRelations = newPhaseRelations;
        this.questions = newQuestions;
    }
}
