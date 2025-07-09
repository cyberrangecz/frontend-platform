import {UserForGroupsDTO} from '../user/user-for-groups-dto.model';

export class CreateGroupDTO {
    description: string;
    group_ids_of_imported_users: number[];
    name: string;
    users: UserForGroupsDTO[];
    expiration_date: string;
}
