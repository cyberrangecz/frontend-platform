import { PlayerTableDataDTO } from '../../dto/table/player-table-data-dto';
import { PlayerTableData } from '../../../model/table/player-table-data';
import { LevelTableDataMapper } from './level-table-data-mapper';

/**
 * @dynamic
 */
export class PlayerTableDataMapper {
    static fromDTOs(dtos: PlayerTableDataDTO[]): PlayerTableData[] {
        return dtos.map((dto) => PlayerTableDataMapper.fromDTO(dto));
    }

    private static fromDTO(dto: PlayerTableDataDTO): PlayerTableData {
        const player: PlayerTableData = new PlayerTableData();
        player.id = dto.id;
        player.name = dto.name;
        player.picture = dto.picture;
        player.avatarColor = dto.avatar_color;
        player.trainingRunId = dto.training_run_id;
        player.trainingTime = dto.training_time / 1000;
        player.assessmentScore = dto.assessment_score;
        player.finished = dto.finished;
        player.levels = LevelTableDataMapper.fromDTOs(dto.levels);
        player.totalScore = dto.assessment_score + dto.training_score;
        player.checked = false;

        return player;
    }
}
