import { GroupDTO } from '../DTO/group/group-dto.model';
import { RoleDTO, UserDTO } from '@sentinel/auth';
import { MicroserviceDTO } from '../DTO/microservice/microservice-dto';

export type GroupSort = keyof GroupDTO;
export type RoleSort = keyof RoleDTO;
export type MicroserviceSort = keyof MicroserviceDTO;
export type UserSort = keyof UserDTO;
