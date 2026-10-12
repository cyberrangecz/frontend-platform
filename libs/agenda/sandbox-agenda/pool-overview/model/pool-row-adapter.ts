import {Pool, Resources} from '@crczp/sandbox-model';
import {Observable} from 'rxjs';

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
    resources$: Observable<Resources>;
}
