import {PlayerLevelDataDTO} from '../../dto/clustering/player-level-data-dto';
import {PlayerLevelData} from '../../../model/clustering/player-level-data';

/**
 * @dynamic
 */
export class PlayerLevelDataMapper {
    static fromDTOs(dtos: PlayerLevelDataDTO[]): PlayerLevelData[] {
        return dtos.map((dto) => PlayerLevelDataMapper.fromDTO(dto));
    }

    private static fromDTO(dto: PlayerLevelDataDTO): PlayerLevelData {
        const player = new PlayerLevelData();
        player.id = dto.id;
        player.name = dto.name ? dto.name : 'Unknown';
        player.picture = dto.picture;
        player.avatarColor = dto.avatar_color;
        player.trainingRunId = dto.training_run_id;
        player.trainingTime = dto.training_time / 1000;
        player.participantLevelScore = dto.participant_level_score;
        player.finished = dto.finished;
        return player;
    }
}
