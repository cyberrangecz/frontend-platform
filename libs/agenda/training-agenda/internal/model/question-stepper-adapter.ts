import { ExtendedMatchingItems, FreeFormQuestion, MultipleChoiceQuestion, Question } from '@crczp/training-model';
import { StepItem, StepStateEnum } from '@sentinel/components/stepper';

export class QuestionStepperAdapter implements StepItem {
    private _question: Question;
    id: number;
    title: string;
    required: boolean;
    valid: boolean;
    icon: string;
    state: StepStateEnum;

    constructor(question: Question) {
        this._question = question;
        this.id = question.id;
        this.title = question.title;
        this.valid = question.valid;
        this.state = StepStateEnum.SELECTABLE;
        this.required = question.required;
        this.icon = QuestionStepperAdapter.iconType(question);
    }

    get question(): Question {
        return this._question;
    }

    set question(value: Question) {
        this._question = value;
        this.id = value.id;
        this.title = value.title;
        this.required = value.required;
    }

    set requiredState(value: boolean) {
        this._question.required = value;
    }

    private static iconType(question: Question): string {
        if (question instanceof FreeFormQuestion) {
            return 'help_outline';
        } else if (question instanceof ExtendedMatchingItems) {
            return 'list_alt';
        } else if (question instanceof MultipleChoiceQuestion) {
            return 'check_circle';
        }
    }
}
