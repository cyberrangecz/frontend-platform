import { LevelUpdateDTO } from '../level/level-update-dto';

/**
 * Training definition fields and its complete ordered level list, written in one request.
 * The state is not part of it; it changes through its own endpoint.
 */
export class TrainingDefinitionUpdateDTO {
    title: string;
    description?: string;
    prerequisites: string[];
    outcomes: string[];
    version: number;
    levels: LevelUpdateDTO[];
}
