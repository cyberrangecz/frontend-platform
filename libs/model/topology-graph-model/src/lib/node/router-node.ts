import {Connectable} from './connectable';
import {Node} from './node';

/**
 * Node of type router
 */
export class RouterNode extends Node implements Connectable {
    /**
     * URL for remote access
     */
    consoleUrl: string;

    /**
     * Classless inter-domain routing
     */
    cidr: string;
    osType: string;
    guiAccess: boolean;

    constructor() {
        super();
    }
}
