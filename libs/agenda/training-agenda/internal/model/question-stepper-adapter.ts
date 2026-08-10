import { ExtendedMatchingItems, FreeFormQuestion, MultipleChoiceQuestion, Question } from '@crczp/training-model';
import { StepItem, StepStateEnum } from '@sentinel/components/stepper';

export class QuestionStepperAdapter implements StepItem {
    icon: string;
    state: StepStateEnum;

    constructor(question: Question) {
        this._question = question;
        this.state = StepStateEnum.SELECTABLE;
        this.icon = QuestionStepperAdapter.iconType(question);
    }

    private _question: Question;

    get id(): number {
        return this._question.id;
    }

    get title(): string {
        return this._question.title;
    }

    get required(): boolean {
        return this._question.required;
    }

    get valid(): boolean {
        return this._question.valid;
    }

    get question(): Question {
        return this._question;
    }

    set question(value: Question) {
        this._question = value;
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
        return 'help';
    }
}
