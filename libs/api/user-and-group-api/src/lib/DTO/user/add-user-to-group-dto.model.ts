export class AddUsersToGroupDTO {
    group_id!: number;
    ids_of_groups_of_imported_users: number = [];
    ids_of_users_to_be_add: number = [];
}
