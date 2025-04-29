import { UserEventDTO } from './user-event-dto';
import { UserRefDTO } from '@crczp/training-api';

export interface UserDataDTO {
    user: UserRefDTO;
    events: UserEventDTO[];
}
