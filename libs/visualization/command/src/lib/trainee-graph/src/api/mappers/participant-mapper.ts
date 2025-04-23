import { ParticipantDTO } from '../dto/participant-dto';
import { Participant } from '../../model/participant';

/**
 * @dynamic
 */
export class ParticipantMapper {
    static fromDTOs(dtos: ParticipantDTO[]): Participant[] {
        return dtos.map((dto) => ParticipantMapper.fromDTO(dto));
    }

    static fromDTO(dto: ParticipantDTO): Participant {
        const result = new Participant();
        result.userRefId = dto.user_ref_id;
        result.sub = dto.sub;
        result.fullName = dto.full_name;
        result.familyName = dto.family_name;
        result.givenName = dto.given_name;
        result.iss = dto.iss;
        return result;
    }
}
