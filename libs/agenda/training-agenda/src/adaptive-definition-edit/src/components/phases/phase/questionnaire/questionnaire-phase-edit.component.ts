import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    EventEmitter,
    inject,
    Input,
    OnChanges,
    Output,
    SimpleChanges,
} from '@angular/core';
import { QuestionnairePhaseEditFormGroup } from './questionnaire-phase-edit-form-group';
import { AbstractControl, UntypedFormArray } from '@angular/forms';
import {
    AdaptiveQuestion,
    Phase,
    PhaseRelation,
    QuestionnairePhase,
    QuestionnaireTypeEnum,
    QuestionTypeEnum,
    TrainingPhase,
} from '@crczp/training-model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'crczp-questionnaire-phase-configuration',
    templateUrl: './questionnaire-phase-edit.component.html',
    styleUrls: ['./questionnaire-phase-edit.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QuestionnairePhaseEditComponent implements OnChanges {
    @Input() phase: QuestionnairePhase;
    @Output() phaseChange: EventEmitter<QuestionnairePhase> = new EventEmitter();
    @Input() updateQuestionsFlag: boolean;
    @Input() presentTrainingPhases: TrainingPhase[];

    questionnaireFormGroup: QuestionnairePhaseEditFormGroup;
    questionnaireTypes = QuestionnaireTypeEnum;
    destroyRef = inject(DestroyRef);

    get title(): AbstractControl {
        return this.questionnaireFormGroup.formGroup.get('title');
    }

    get questions(): UntypedFormArray {
        return this.questionnaireFormGroup.formGroup.get('questions') as UntypedFormArray;
    }

    get phaseRelations(): UntypedFormArray {
        return this.questionnaireFormGroup.formGroup.get('phaseRelations') as UntypedFormArray;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('phase' in changes || 'updateQuestionsFlag' in changes) {
            this.questionnaireFormGroup = new QuestionnairePhaseEditFormGroup(this.phase);
            this.phase.questions.forEach((question) => {
                this.updateQuestionRelations(this.phase, question);
                this.validateQuestion(question);
            });
            this.title.markAsTouched();
            this.questionnaireFormGroup.formGroup.valueChanges
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(() => {
                    this.questionnaireFormGroup.setToPhase(this.phase);
                    this.phaseChange.emit(this.phase);
                });
        }
    }

    /**
     * Changes internal state of the component and emits change event to parent component
     * @param questions new state of changed questions
     */
    onQuestionsChanged(questions: AdaptiveQuestion[]): void {
        questions.forEach((question) => {
            this.validateQuestion(question);
        });
        this.phase.questions = questions;
        this.questionnaireFormGroup.setToPhase(this.phase);
        this.phaseChange.emit(this.phase);
    }

    getTrainingPhaseTitle(id: number): string {
        let result = '';
        result = this.presentTrainingPhases.find((phase) => phase.id === id).title;
        return result;
    }

    deleteRelation(relationIndex: number): void {
        this.phase.phaseRelations.splice(relationIndex, 1);
        this.phase.phaseRelations.forEach((relation, index) => (relation.order = index));
        this.updateForm();
    }

    onQuestionAddedToRelation(relationIndex: number, questionId: number): void {
        this.phase.phaseRelations[relationIndex].questionIds.push(questionId);
        this.updateForm();
    }

    getQuestionTitleById(qId: number): string {
        return this.phase.questions.find((question) => question.id === qId).text;
    }

    getQuestionIconById(qId: number): string {
        switch (this.phase.questions.find((question) => question.id === qId).questionType) {
            case QuestionTypeEnum.RFQ:
                return 'star_half';
            case QuestionTypeEnum.MCQ:
                return 'check_circle_outline';
            case QuestionTypeEnum.FFQ:
                return 'edit';
        }
    }

    get phaseRelationMenuItems(): Phase[] {
        const menuItems: Phase[] = [];
        this.presentTrainingPhases.forEach((phase) => menuItems.push(phase));
        return menuItems;
    }

    getValidQuestionMenuItems(relationIndex: number): AdaptiveQuestion[] {
        let questionsWithIds = this.phase.questions.filter((q) => q.id !== undefined && q.id !== null);
        this.phase.phaseRelations[relationIndex].questionIds.forEach((id) => {
            questionsWithIds = questionsWithIds.filter((question) => question.id !== id);
        });
        return questionsWithIds;
    }

    onQuestionRemovedFromRelation(relationIndex: number, qId: number): void {
        this.phase.phaseRelations[relationIndex].questionIds = this.phase.phaseRelations[
            relationIndex
        ].questionIds.filter((id) => id !== qId);
        this.phase.questions.find((question) => question.id === qId).relations--;
        this.phase.questions = [].concat(this.phase.questions); // trigger change
        this.updateForm();
    }

    onRelationCreated(phase: TrainingPhase): void {
        const newRelation = new PhaseRelation();
        newRelation.questionIds = [];
        newRelation.successRate = 0;
        newRelation.phaseId = phase.id;
        newRelation.order = this.phase.phaseRelations.length;
        this.phase.phaseRelations.push(newRelation);
        this.updateForm();
    }

    removeQuestionFromRelations(qId: number): void {
        this.phase.phaseRelations.forEach((relation) => {
            relation.questionIds = relation.questionIds.filter((id) => id !== qId);
        });
    }

    private validateQuestion(question: AdaptiveQuestion): void {
        question.valid = !!question.text && question.choices.length > 0;
    }

    private updateQuestionRelations(phase: QuestionnairePhase, question: AdaptiveQuestion): void {
        question.relations = phase.phaseRelations.reduce((acc, relation) => {
            return acc + relation.questionIds.filter((id) => id === question.id).length;
        }, 0);
    }

    private updateForm() {
        this.phaseChange.emit(this.phase);
        this.questionnaireFormGroup = new QuestionnairePhaseEditFormGroup(this.phase);
        this.questionnaireFormGroup.formGroup.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
            this.questionnaireFormGroup.setToPhase(this.phase);
            this.phaseChange.emit(this.phase);
        });
    }
}
