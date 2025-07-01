import { UntypedFormArray, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { AdaptiveQuestion, PhaseRelation, QuestionnairePhase } from '@crczp/training-model';

/**
 * @dynamic
 */
export class QuestionnairePhaseEditFormGroup {
    formGroup: UntypedFormGroup;

    constructor(phase: QuestionnairePhase) {
        this.formGroup = new UntypedFormGroup({
            title: new UntypedFormControl(phase.title, Validators.required),
            questions: new UntypedFormArray(
                phase.questions.map((question) => QuestionnairePhaseEditFormGroup.createQuestions(question)),
            ),
            phaseRelations: new UntypedFormArray(
                phase.phaseRelations.map((relation) => QuestionnairePhaseEditFormGroup.createRelations(relation)),
            ),
        });
    }

    private static createRelations(relation: PhaseRelation): UntypedFormGroup {
        return new UntypedFormGroup({
            id: new UntypedFormControl(relation.id),
            order: new UntypedFormControl(relation.order),
            phaseId: new UntypedFormControl(relation.phaseId),
            questionIds: new UntypedFormControl(relation.questionIds),
            successRate: new UntypedFormControl(relation.successRate, [
                Validators.required,
                Validators.min(0),
                Validators.max(100),
            ]),
        });
    }

    private static createQuestions(question: AdaptiveQuestion): UntypedFormGroup {
        return new UntypedFormGroup({
            text: new UntypedFormControl(question.text, Validators.required),
            id: new UntypedFormControl(question.id),
            order: new UntypedFormControl(question.order),
            questionType: new UntypedFormControl(question.questionType),
        });
    }

    setToPhase(phase: QuestionnairePhase): void {
        phase.title = this.formGroup.get('title').value;
        phase.phaseRelations = this.formGroup.get('phaseRelations').value;
        phase.valid = this.formGroup.valid && phase.questions.every((question) => question.valid);
    }
}
