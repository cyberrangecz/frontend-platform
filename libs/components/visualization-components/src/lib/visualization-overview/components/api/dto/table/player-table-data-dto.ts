import { LevelTableDataDTO } from './level-table-data-dto';

export class PlayerTableDataDTO {
    id: number;
    name: string;
    picture: string;
    avatar_color: string;
    training_run_id: number;
    training_time: number;
    training_score: number;
    assessment_score: number;
    finished: boolean;
    levels: LevelTableDataDTO[];
}
