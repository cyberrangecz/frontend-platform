import { TraineeDTO } from '../dto/trainee-dto';
import { Trainee } from '../../model/trainee';

/**
 * @dynamic
 */
export class TraineeMapper {
    static fromDTOs(dtos: TraineeDTO[]): Trainee[] {
        return dtos.map((dto) => TraineeMapper.fromDTO(dto));
    }

    static fromDTO(dto: TraineeDTO): Trainee {
        const result = new Trainee();
        result.userRefId = dto.user_ref_id;
        result.sub = dto.sub;
        result.fullName = dto.full_name;
        result.givenName = dto.given_name;
        result.familyName = dto.family_name;
        result.iss = dto.iss;
        return result;
    }
}
