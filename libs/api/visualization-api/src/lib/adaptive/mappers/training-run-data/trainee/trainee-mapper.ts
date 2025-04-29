import { Trainee } from '../../../model/trainee';
import { AdaptiveTraineeDTO } from '../../../dto/adaptive-trainee-d-t-o';

export class TraineeMapper {
    static fromDTO(dto: AdaptiveTraineeDTO): Trainee {
        const trainee = new Trainee();
        trainee.id = dto.user_ref_id;
        trainee.login = dto.sub;
        trainee.name = `${dto.given_name} ${dto.family_name}`;
        trainee.picture = dto.picture;
        trainee.mail = dto.mail;
        return trainee;
    }
}
