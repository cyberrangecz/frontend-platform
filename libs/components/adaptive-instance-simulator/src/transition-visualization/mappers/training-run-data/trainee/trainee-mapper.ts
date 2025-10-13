import {TraineeDTO} from '../../../dto/trainee-dto';
import {TrainingUser} from "@crczp/training-model";

export class TraineeMapper {
    static fromDTO(dto: TraineeDTO): TrainingUser {
        const trainee = new TrainingUser();
        trainee.id = dto.user_ref_id;
        trainee.login = dto.sub;
        trainee.name = `${dto.given_name} ${dto.family_name}`;
        trainee.picture = dto.picture;
        trainee.mail = dto.mail;
        return trainee;
    }
}
