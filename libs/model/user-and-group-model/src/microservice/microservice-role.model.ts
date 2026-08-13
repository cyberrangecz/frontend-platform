/**
 * Internal model of microservice role
 */
export class MicroserviceRole {
    default: boolean;
    description: string;
    type: string;

    constructor(type = '', description = '', isDefault = false) {
        this.type = type;
        this.description = description;
        this.default = isDefault;
    }
}
