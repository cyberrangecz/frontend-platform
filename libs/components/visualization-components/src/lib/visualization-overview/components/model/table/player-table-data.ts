import { LevelTableData } from './level-table-data';

export class PlayerTableData {
    id: number;
    name: string;
    picture: string;
    avatarColor: string;
    trainingRunId: number;
    trainingTime: number;
    trainingScore: number;
    assessmentScore: number;
    finished: boolean;
    levels: LevelTableData[];

    totalScore?: number;
    checked?: boolean;
}
