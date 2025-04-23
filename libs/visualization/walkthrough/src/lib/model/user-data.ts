import { Event } from './event';
import { User } from './user';

export class UserData {
    user!: User;
    points!: number;
    events!: Event[];
}
