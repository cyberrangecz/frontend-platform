import { UserDTO } from '../dto/user-dto';
import { User } from '../model/user';

export class UserMapper {
    static fromDTO(dto: UserDTO): User {
        const user: User = new User();
        user.userRefId = dto.user_ref_id;
        user.iss = dto.iss;
        user.mail = dto.mail;
        user.picture = dto.picture;
        user.sub = dto.sub;
        user.familyName = dto.family_name;
        user.fullName = dto.full_name.replace('"', '');
        user.givenName = dto.given_name;
        return user;
    }
}
