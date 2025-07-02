import {PlayerDataDTO} from '../../dto/clustering/player-data-dto';
import {PlayerData} from '../../../model/clustering/player-data';

/**
 * @dynamic
 */
export class PlayerDataMapper {
    static fromDTOs(dtos: PlayerDataDTO[]): PlayerData[] {
        return dtos.map((dto) => PlayerDataMapper.fromDTO(dto));
    }

    private static fromDTO(dto: PlayerDataDTO): PlayerData {
        const player = new PlayerData();
        player.id = dto.id;
        player.name = dto.name ? dto.name : 'Unknown';
        player.picture = dto.picture;
        player.avatarColor = dto.avatar_color;
        player.trainingRunId = dto.training_run_id;
        player.trainingTime = dto.training_time / 1000;
        player.trainingScore = dto.training_score;
        player.assessmentScore = dto.assessment_score;
        player.finished = dto.finished;
        return player;
    }
}
