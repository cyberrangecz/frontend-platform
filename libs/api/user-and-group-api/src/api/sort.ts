import { GroupDTO } from '../DTO/group/group-dto.model';
import { RoleDTO, UserDTO } from '@sentinel/auth';
import { MicroserviceDTO } from '../DTO/microservice/microservice-dto';
import { SnakeToCamelCase } from '@crczp/api-common';

export type GroupSort = SnakeToCamelCase<keyof GroupDTO>;
export type RoleSort = SnakeToCamelCase<keyof RoleDTO>;
export type MicroserviceSort = SnakeToCamelCase<keyof MicroserviceDTO>;
export type UserSort = SnakeToCamelCase<keyof UserDTO>;
