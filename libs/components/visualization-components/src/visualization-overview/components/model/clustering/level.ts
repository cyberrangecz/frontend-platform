import {LevelTypeEnum} from './enums/level-type.enum';
import {PlayerLevelData} from './player-level-data';

export class Level {
    id: number;
    order: number;
    levelType: LevelTypeEnum;

    title: string;
    estimatedTime: number;
    maxAchievableScore: number;
    maxParticipantScore: number;
    maxParticipantTime: number;
    averageTime: number;
    averageScore: number;
    playerLevelData: PlayerLevelData[];
}
