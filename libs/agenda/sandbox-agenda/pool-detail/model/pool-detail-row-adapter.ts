import { AbstractSandbox } from './abstract-sandbox';

export class PoolDetailRowAdapter {
    id: number;
    unitId: number;
    name: string;
    comment: string;
    lock: string;
    created: string;
    createdBy: string;
    state: string;
    stages: string[];
    sandboxData: AbstractSandbox;
}
