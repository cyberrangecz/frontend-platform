/**
 * Node of type host (desktop, server, mobile etc)
 */
import { GraphNode } from './graph-node';

export class HostNode extends GraphNode {
    consoleUrl: string;
    osType: string;
    guiAccess: boolean;
    containers: string[];

    constructor() {
        super();
    }

    public override toString = (): string => {
        let result = 'Name: ' + this.name + '\n';
        result += 'Physical role: ' + this.nodeType + '\n';
        let counter = 1;
        this.nodePorts.forEach((ports) => {
            result += '\nPort ' + counter + '\n';
            result += ports;
            counter++;
        });
        if (this.containers.length > 1) {
            result += '\nAvailable containers:';
            for (let i = 0; i < this.containers.length; i++) {
                result += '\n' + this.containers[i];
            }
        }
        return result;
    };
}
