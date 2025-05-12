import { AdaptiveQuestion, QuestionTypeEnum } from '@crczp/training-model';
import { StepItem, StepStateEnum } from '@sentinel/components/stepper';
import { Choice } from '@crczp/training-model/lib/phase/questionnaire-phase/choice';

export class AdaptiveQuestionStepperAdapter implements StepItem {
    private _question: AdaptiveQuestion;
    id: number;
    title: string;
    order: number;
    valid: boolean;
    relations: number;
    state: StepStateEnum;
    icon: string;
    choices: Choice[];

    constructor(question: AdaptiveQuestion) {
        this._question = question;
        this.id = question.id;
        this.order = question.order;
        this.title = question.text;
        this.valid = question.valid;
        this.state = StepStateEnum.SELECTABLE;
        this.icon = AdaptiveQuestionStepperAdapter.iconType(question.questionType);
        this.relations = question.relations;
        this.choices = question.choices;
    }

    get question(): AdaptiveQuestion {
        return this._question;
    }

    set question(value: AdaptiveQuestion) {
        this._question = value;
        this.title = value.text;
        this.order = value.order;
        this.relations = value.relations;
        this.id = value.id;
    }

    private static iconType(questionType: QuestionTypeEnum): string {
        if (questionType === QuestionTypeEnum.FFQ) {
            return 'edit';
        } else if (questionType === QuestionTypeEnum.MCQ) {
            return 'check_circle_outline';
        } else if (questionType === QuestionTypeEnum.RFQ) {
            return 'star_half';
        }
        return 'help_outline';
    }
}
