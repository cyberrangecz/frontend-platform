/**
 * Switch node. Has different behaviour than host node. Has set of children (sub network).
 * Can have two types - cloud if sub network is hidden or switch if sub network is revealed.
 */

import {NodePhysicalRoleEnum} from '../enums/node-physical-role-enum';
import {HostNode} from './host-node';
import {INode} from './inode';
import {Node} from './node';

export class SwitchNode extends Node {
    /**
     * Classless inter-domain routing
     */
    cidr: string;

    /**
     * All nodes in the switch subnetwork
     */
    children: INode[];

    constructor() {
        super();
    }

    /**
     * Changes switch physical role (Router -> Cloud or Cloud -> Router)
     * Router is role for revealed subnet
     * Cloud is role for hidden subnet
     */
    public changeSwitchPhysicalRole(): void {
        if (this.physicalRole === NodePhysicalRoleEnum.Switch) {
            this.physicalRole = NodePhysicalRoleEnum.Cloud;
        } else if (this.physicalRole === NodePhysicalRoleEnum.Cloud) {
            this.physicalRole = NodePhysicalRoleEnum.Switch;
        }
    }

    /**
     * True if subnetwork can be expanded, false otherwise
     */
    public hasExpandableSubnetwork(): boolean {
        return this.children && this.children.length > 0 && this.children.some((child) => child instanceof HostNode);
    }
}
