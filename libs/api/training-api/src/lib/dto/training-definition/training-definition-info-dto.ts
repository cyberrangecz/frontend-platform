import { TrainingDefinitionDTO } from './training-definition-dto';

export class TrainingDefinitionInfoDTO {
    id: number;
    title: string;
    state: TrainingDefinitionDTO.StateEnum;
}
