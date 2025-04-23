/**
 * Node of type host (desktop, server, mobile etc)
 */
import { Connectable } from './connectable';
import { Node } from './node';

export class HostNode extends Node implements Connectable {
    consoleUrl: string;
    osType: string;
    guiAccess: boolean;
    containers: string[];

    constructor() {
        super();
    }

    public toString = (): string => {
        let result = 'Name: ' + this.name + '\n';
        result += 'Physical role: ' + this.physicalRole + '\n';
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
