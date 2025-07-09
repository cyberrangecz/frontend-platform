import {SimulationLinkDatum} from 'd3';
import {LinkTypeEnum} from '../enums/link-type-enum';
import {NodePort} from '../node-port/node-port';
import {Node} from '../node/node';

/**
 * Class representing link between two nodes (connected to two ports) in a network topology
 * Class extends D3 interface necessary to connect the class with Node class in the D3 force simulation
 */
export class Link implements SimulationLinkDatum<Node> {
    /**
     * Id of link
     */
    id: number;

    /**
     * Source node from where the link starts
     */
    source: Node;

    /**
     * Target node where the link ends
     */
    target: Node;

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
