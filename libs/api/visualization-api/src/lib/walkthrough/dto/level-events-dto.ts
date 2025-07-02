import {UserDataDTO} from './user-data-dto';

export interface LevelEventsDTO {
    level_id: number;
    title: string;
    users: UserDataDTO[];
}
