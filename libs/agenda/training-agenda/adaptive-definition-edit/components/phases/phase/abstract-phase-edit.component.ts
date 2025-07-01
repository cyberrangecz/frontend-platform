import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    OnChanges,
    Output,
    SimpleChanges,
} from '@angular/core';
import {async, Observable} from 'rxjs';
import {
    AbstractPhaseTypeEnum,
    AdaptiveQuestion,
    MitreTechnique,
    Phase,
    PhaseRelation,
    TrainingPhase
} from '@crczp/training-model';
import {InfoPhaseEditComponent} from "./info-phase/info-phase-edit.component";
import {TrainingPhaseEditComponent} from "./training-phase/training-phase-edit.component";
import {QuestionnairePhaseEditComponent} from "./questionnaire/questionnaire-phase-edit.component";
import {AccessPhaseEditComponent} from "./access-phase/access-phase-edit.component";
import {AsyncPipe} from "@angular/common";

/**
 * Main component of phases edit. Resolves which component should be display based on phases type
 */
@Component({
    selector: 'crczp-phase-edit',
    templateUrl: './abstract-phase-edit.component.html',
    styleUrls: ['./abstract-phase-edit.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        InfoPhaseEditComponent,
        TrainingPhaseEditComponent,
        QuestionnairePhaseEditComponent,
        AccessPhaseEditComponent,
        AsyncPipe
    ]
})
export class AbstractPhaseEditComponent implements OnChanges {
    @Input() phase: Phase;
    @Input() updateMatrix$: Observable<boolean>;
    @Input() presentTrainingPhases$: Observable<TrainingPhase[]>;
    @Input() phaseRelations: PhaseRelation[];
    @Input() questions: Map<number, AdaptiveQuestion>;
    @Input() mitreTechniquesList: MitreTechnique[];
    @Output() phaseChange: EventEmitter<Phase> = new EventEmitter();
    phaseTypes = AbstractPhaseTypeEnum;
    relatedQuestions: AdaptiveQuestion[] = [];
    protected readonly async = async;

    onPhaseChange(phase: Phase): void {
        this.phaseChange.emit(phase);
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('phase' in changes || 'phaseRelations' in changes) {
            this.relatedQuestions = this.phaseRelations
                .filter((phaseRelation) => phaseRelation.phaseId === this.phase.id)
                .map((phaseRelation) => phaseRelation.questionIds.map((questionId) => this.questions.get(questionId)))
                .reduce((accumulator, value) => accumulator.concat(value), [] as AdaptiveQuestion[]);
        }
    }
}
