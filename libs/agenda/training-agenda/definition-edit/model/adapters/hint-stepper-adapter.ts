import { Hint } from '@crczp/training-model';
import { StepItem, StepStateEnum } from '@sentinel/components/stepper';

export class HintStepperAdapter implements StepItem {
    private _hint: Hint;
    id: number;
    title: string;
    state: StepStateEnum;
    icon: string;

    constructor(hint: Hint) {
        this._hint = hint;
        this.id = hint.id;
        this.title = hint.title;
        this.state = StepStateEnum.SELECTABLE;
        this.icon = 'help_outline';
    }

    get hint(): Hint {
        return this._hint;
    }

    set hint(value: Hint) {
        this._hint = value;
        this.id = value.id;
        this.title = value.title;
    }
}
