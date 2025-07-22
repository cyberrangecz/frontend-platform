import {GraphNode} from './graph-node';

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

}
