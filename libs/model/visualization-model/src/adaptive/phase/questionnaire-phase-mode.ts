import {TransitionPhase, TransitionTask} from './transition-phase-model';
import {QuestionnaireTypeEnum, QuestionTypeEnum} from '@crczp/training-model';

export class AdaptiveQuestionVisualization {
    id!: number;
    order!: number;
    text!: string;
    valid: boolean;
    questionType!: QuestionTypeEnum;
    choices!: ChoiceVisualization[];

    constructor() {
        this.valid = true;
    }
}

export class ChoiceVisualization {
    id!: number;
    order!: number;
    text!: string;
    correct!: boolean;
}

export class QuestionAnswerVisualization {
    questionId!: number;
    answers!: string[];
}

export class QuestionnairePhaseTaskVisuazlization extends TransitionTask {
    questions!: AdaptiveQuestionVisualization[];
    questionnaireType!: QuestionnaireTypeEnum;
}

export class QuestionnaireTransitionPhase extends TransitionPhase {
    questionnaireType!: QuestionnaireTypeEnum;
    override tasks: QuestionnairePhaseTaskVisuazlization[] = []
}
