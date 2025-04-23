import { MicroserviceRoleDTO } from './microservice-role-dto';

export class MicroserviceCreateDTO {
    name: string;
    endpoint: string;
    roles: MicroserviceRoleDTO[];
}
