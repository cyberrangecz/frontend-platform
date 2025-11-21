import { AbstractPhaseTypeEnum } from '../enums/abstract-phase-type.enum';
import { InfoPhase } from './info-phase/info-phase';
import { AccessPhase } from './access-phase/access-phase';
import { TrainingPhase } from './training-phase/training-phase';
import { QuestionnairePhase } from './questionnaire-phase/questionnaire-phase';

export abstract class Phase {
    id!: number;
    title!: string;
    order!: number;
    type!: AbstractPhaseTypeEnum;
    isUnsaved!: boolean;
    valid = true;

    public get isLoaded(): boolean {
        return (
            (this as unknown as InfoPhase).content !== undefined ||
            (this as unknown as AccessPhase).cloudContent !== undefined ||
            (this as unknown as AccessPhase).localContent !== undefined ||
            (this as unknown as TrainingPhase).currentTask.content !==
                undefined ||
            (this as unknown as QuestionnairePhase).questions !== undefined
        );
    }
}
