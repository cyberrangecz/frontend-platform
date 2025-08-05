import { NodePort } from './node-port';
import { LinkTypeEnum } from '../enums/link-type-enum';
import { GraphNode } from '../nodes/graph-node';

/**
 * Class representing link between two nodes (connected to two ports) in a network topology
 */
export class GraphNodeLink {
    /**
     * Id of link
     */
    id: number;

    /**
     * Source node from where the link starts
     */
    source: GraphNode;

    /**
     * Target node where the link ends
     */
    target: GraphNode;

    /**
     * Port into which the link is connected on source node
     */
    portA: NodePort;

    /**
     * Port into which the link is connected on target node
     */
    portB: NodePort;

    /**
     * Type of link
     */
    type: LinkTypeEnum;
}
