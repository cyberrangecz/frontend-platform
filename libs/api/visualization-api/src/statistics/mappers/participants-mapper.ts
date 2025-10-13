import {LevelsMapper} from './levels-mapper';
import {ParticipantStatistics} from '@crczp/visualization-model';
import {ParticipantStatisticsDTO} from '../dtos';

export class ParticipantsMapper {
    static fromDTOs(dtos: ParticipantStatisticsDTO[], instanceId: number): ParticipantStatistics[] {
        return dtos.map((dto) => this.fromDTO(dto, instanceId));
    }

    static fromDTO(dto: ParticipantStatisticsDTO, instanceId: number): ParticipantStatistics {
        const participant = new ParticipantStatistics();
        participant.userRefId = dto.user_ref_id;
        participant.userName = dto.user_name;
        participant.levels = LevelsMapper.fromDTOs(dto.levels);
        participant.instanceId = instanceId;
        return participant;
    }
}
