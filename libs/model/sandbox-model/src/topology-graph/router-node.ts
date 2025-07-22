import {GraphNode} from './graph-node';

/**
 * Node of type router
 */
export class RouterNode extends GraphNode {

    /**
     * Classless inter-domain routing
     */
    cidr: string;
    osType: string;
    guiAccess: boolean;
    
}
