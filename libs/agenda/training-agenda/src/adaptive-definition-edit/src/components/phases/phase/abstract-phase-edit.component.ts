import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    OnChanges,
    Output,
    SimpleChanges,
} from '@angular/core';
import { Observable } from 'rxjs';
import { AbstractPhaseTypeEnum, AdaptiveQuestion, MitreTechnique, Phase, TrainingPhase } from '@crczp/training-model';
import { PhaseRelation } from '@crczp/training-model/lib/phase/questionnaire-phase/phase-relation';

/**
 * Main component of phases edit. Resolves which component should be display based on phases type
 */
@Component({
    selector: 'crczp-phase-edit',
    templateUrl: './abstract-phase-edit.component.html',
    styleUrls: ['./abstract-phase-edit.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
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
