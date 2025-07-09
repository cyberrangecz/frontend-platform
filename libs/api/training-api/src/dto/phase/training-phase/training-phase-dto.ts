import {AbstractPhaseDTO} from '../abstract-phase-dto';
import {TaskDTO} from './task-dto';
import {DecisionMatrixRowDTO} from './decision-matrix-row-dto';
import {MitreTechniqueDTO} from '../../mitre-techniques/mitre-technique-dto';

export interface TrainingPhaseDTO extends AbstractPhaseDTO {
    allowed_wrong_answers: number;
    allowed_commands: number;
    estimated_duration: number;
    tasks: TaskDTO[];
    decision_matrix: DecisionMatrixRowDTO[];
    task?: TaskDTO;
    mitre_techniques: MitreTechniqueDTO[];
    expected_commands: string[];
}
