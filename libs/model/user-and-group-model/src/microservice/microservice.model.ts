import {MicroserviceRole} from './microservice-role.model';

/**
 * Internal model of microservice
 */
export class Microservice {
    id?: number;
    name: string;
    endpoint: string;
    roles: MicroserviceRole[];
    valid = false

    /**
     * True if microservice has default role, false otherwise
     */
    hasDefaultRole(): boolean {
        return this.roles.some((role) => role.default);
    }

    constructor(name: string, endpoint: string, roles: MicroserviceRole[]) {
        this.name = name;
        this.endpoint = endpoint;
        this.roles = roles;
    }
}
