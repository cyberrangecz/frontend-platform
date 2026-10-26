import { AccessLevelUpdateDTO } from './access/access-level-update-dto';
import { AssessmentLevelUpdateDTO } from './assessment/assessment-level-update-dto';
import { InfoLevelUpdateDTO } from './info/info-level-update-dto';
import { TrainingLevelUpdateDto } from './training/training-level-update-dto';

/**
 * A level as written inside a training definition request. It carries an id only when the backend
 * issued it; a level without one is created.
 */
export type LevelUpdateDTO =
    | InfoLevelUpdateDTO
    | AccessLevelUpdateDTO
    | TrainingLevelUpdateDto
    | AssessmentLevelUpdateDTO;
