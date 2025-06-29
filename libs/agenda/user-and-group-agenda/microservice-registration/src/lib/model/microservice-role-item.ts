import { MicroserviceRole } from '@crczp/user-and-group-model';

/**
 * Input form of microservice-registration role
 */
export class MicroserviceRoleItem {
    role: MicroserviceRole;
    valid: boolean;
}
