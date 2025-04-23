import { QuestionDTO } from './question-dto';
import { PhaseRelationDTO } from './phase-relation-dto';
import { AbstractPhaseDTO } from '../abstract-phase-dto';

export class QuestionnairePhaseUpdateDTO {
    id: number;
    phase_type: AbstractPhaseDTO.PhaseTypeEnum = 'QUESTIONNAIRE';
    order: number;
    title: string;
    questions: QuestionDTO[];
    phase_relations: PhaseRelationDTO[];
}
