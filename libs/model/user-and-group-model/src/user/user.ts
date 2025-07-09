import {UserRole} from '../role/user-role';

export class User {
    id!: number;
    login!: string;
    name!: string;
    /**
     * Icon in base64 format
     */
    picture!: string;
    nameWithAcademicTitles!: string;
    mail!: string;
    issuer?: string;
    groupIds: number[] = [];
    roles: UserRole[] = [];
}
