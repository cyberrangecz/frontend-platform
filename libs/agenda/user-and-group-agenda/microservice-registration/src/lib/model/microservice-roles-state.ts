import { MicroserviceRole } from '@crczp/user-and-group-model';

/**
 * State of edited microservice-registration roles
 */
export class MicroserviceRolesState {
    roles: MicroserviceRole[];
    isAdded?: boolean;
    isRemoved?: boolean;
    roleIndex?: number;
    validity: boolean;
}
