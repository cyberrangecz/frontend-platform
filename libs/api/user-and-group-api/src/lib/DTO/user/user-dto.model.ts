import { RoleDTO } from '../role/role-dto';

export class UserDTO {
    full_name: string;
    given_name: string;
    family_name: string;
    iss?: string;
    id: number;
    user_ref_id: number;
    sub: string;
    picture: string;
    mail: string;
    roles: RoleDTO[];
}
