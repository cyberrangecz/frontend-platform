import {GraphNodeType} from "./graph-node-type";
import {NodePort} from "./node-port";

/**
 * Abstract node used in graph-visual. Has attributes used for D3 simulation and SVG drawing (x,y, etc.)
 */
export abstract class GraphNode {

    /**
     * Unique name of the node
     */
    name: string;

    /**
     * Type of the node (Router, Computer, Switch, ...)
     */
    nodeType: GraphNodeType = GraphNodeType.Switch

    /**
     * All ports associated with the node
     */
    nodePorts: NodePort[] = []

    public toString = (): string => {
        let result = 'Name: ' + this.name + '\n';
        result += 'Physical role: ' + this.nodeType + '\n';
        let counter = 1;
        this.nodePorts.forEach((ports) => {
            result += '\nPort ' + counter + '\n';
            result += ports;
            counter++;
        });
        return result;
    };
}
