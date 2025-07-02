import {NodePhysicalRoleEnum} from '../enums/node-physical-role-enum';
import {NodePort} from '../node-port/node-port';
import {INode} from './inode';

/**
 * Abstract node used in graph-visual. Has attributes used for D3 simulation and SVG drawing (x,y, etc.)
 */
export abstract class Node implements INode {
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
    fx?: number | null;
    fy?: number | null;

    physicalRole: NodePhysicalRoleEnum;

    /**
     * Unique name of the node
     */
    name: string;

    /**
     * All ports associated with the node
     */
    nodePorts: NodePort[];

    public toString = (): string => {
        let result = 'Name: ' + this.name + '\n';
        result += 'Physical role: ' + this.physicalRole + '\n';
        let counter = 1;
        this.nodePorts.forEach((ports) => {
            result += '\nPort ' + counter + '\n';
            result += ports;
            counter++;
        });
        return result;
    };
}
