import { TimelinePlayer } from './timeline-player';

export class TimelineData {
    estimatedTime: number;
    maxScoreOfLevels: number[];
    maxParticipantTime: number;
    averageTime: number;
    playerData: TimelinePlayer[];
}
