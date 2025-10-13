import {TrainingUser} from '@crczp/training-model';
import {UserRefDTO} from '../../dto/user/user-ref-dto';

/**
 * @dynamic
 */
export class UserMapper {
    static fromDTO(dto: UserRefDTO): TrainingUser {
        return {
            id: dto.user_ref_id,
            login: dto.sub,
            name: `${dto.given_name} ${dto.family_name}`,
            picture: dto.picture,
            mail: dto.mail,
        };
    }

    static fromDTOs(dtos: UserRefDTO[]): TrainingUser[] {
        return dtos.map((dto) => UserMapper.fromDTO(dto));
    }
}
