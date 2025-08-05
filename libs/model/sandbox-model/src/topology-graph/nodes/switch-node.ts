/**
 * Switch node. Has different behaviour than host node. Has set of children (sub network).
 * Can have two types - cloud if sub network is hidden or switch if sub network is revealed.
 */

import { HostNode } from './host-node';
import { GraphNode } from './graph-node';

export class SwitchNode extends GraphNode {
    /**
     * Classless inter-domain routing
     */
    cidr: string;

    /**
     * All nodes in the switch subnetwork
     */
    children: GraphNode[];

    /**
     * True if subnetwork can be expanded, false otherwise
     */
    public hasExpandableSubnetwork(): boolean {
        return (
            this.children &&
            this.children.length > 0 &&
            this.children.some((child) => child instanceof HostNode)
        );
    }
}
