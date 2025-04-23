import { UserEventDTO } from './user-event-dto';
import { UserDTO } from './user-dto';

export interface UserDataDTO {
    user: UserDTO;
    events: UserEventDTO[];
}
