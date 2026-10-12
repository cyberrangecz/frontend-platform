import {TrainingDefinitionDTOStateEnum} from './training-definition-dto';

export class TrainingDefinitionInfoDTO {
    id: number;
    title: string;
    state: TrainingDefinitionDTOStateEnum;
}
