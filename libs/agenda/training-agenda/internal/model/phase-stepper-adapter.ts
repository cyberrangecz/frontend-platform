import { StepItem, StepStateEnum } from '@sentinel/components/stepper';
import { AbstractPhaseTypeEnum, Phase } from '@crczp/training-model';

export class PhaseStepperAdapter implements StepItem {
    id: number;
    title: string;
    phase: Phase;
    icon: string;
    state: StepStateEnum;
    type: AbstractPhaseTypeEnum;

    constructor(phase: Phase) {
        this.id = phase.id;
        this.title = phase.title;
        this.phase = phase;
        this.state = StepStateEnum.SELECTABLE;
        this.type = phase.type;
        this.icon = phase.getIcon();
    }
}
