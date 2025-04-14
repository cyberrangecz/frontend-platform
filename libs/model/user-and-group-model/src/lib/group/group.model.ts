/**
 * Internal model a group
 */
import { UserRole } from '../role/user-role';
import { User } from '../user/user';

export class Group {
    id!: number;
    name!: string;
    description!: string;
    roles: UserRole[] = [];
    members: User[] = [];
    expirationDate!: Date;
    canBeDeleted!: boolean;

    /**
     * Gets expiration date in UTC format
     */
    getExpirationDateUTC(): Date {
        return new Date(
            Date.UTC(this.expirationDate.getFullYear(), this.expirationDate.getMonth(), this.expirationDate.getDate()),
        );
    }
}
