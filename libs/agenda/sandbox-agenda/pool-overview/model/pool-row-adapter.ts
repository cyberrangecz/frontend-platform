import {Pool, Resources} from '@crczp/sandbox-model';

export class PoolRowAdapter extends Pool {
    title: string;
    createdByName: string;
    resourcesUtilization: string;
    instancesUtilization: number;
    vcpuUtilization: number;
    ramUtilization: number;
    networkUtilization: number;
    portUtilization: number;
    sandboxDefinitionNameAndRevision: string;
    resources?: Resources;
}
