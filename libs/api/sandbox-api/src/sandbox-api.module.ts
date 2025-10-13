import { CommonModule } from '@angular/common';
import { inject, NgModule } from '@angular/core';
import { SandboxDefinitionApi } from './api/definition/sandbox-definition-api.service';
import { SandboxInstanceApi } from './api/instance/sandbox-instance-api.service';
import { PoolApi } from './api/pool/pool.api.service';
import { AllocationRequestsApi } from './api/request/allocation-requests-api.service';
import { CleanupRequestsApi } from './api/request/cleanup-requests.api.service';
import { SandboxAllocationUnitsApi } from './api/sandbox-allocation-units/sandbox-allocation-units-api.service';
import { ResourcesApi } from './api/resources/resources-api.service';
import { VMImagesApi } from './api/vm-images/vm-images-api.service';
import { TopologyApi } from './api/topology/topology-api.service';

@NgModule({
    declarations: [],
    imports: [CommonModule],
    providers: [
        {provide: SandboxInstanceApi, useClass: SandboxInstanceDefaultApi},
        {provide: SandboxDefinitionApi, useClass: SandboxDefinitionDefaultApi},
        {provide: PoolApi, useClass: PoolDefaultApi},
        {provide: AllocationRequestsApi, useClass: AllocationRequestsDefaultApi},
        {provide: CleanupRequestsApi, useClass: CleanupRequestsDefaultApi},
        {provide: SandboxAllocationUnitsApi, useClass: SandboxAllocationUnitsDefaultApi},
        {provide: ResourcesApi, useClass: ResourceDefaultApi},
        {provide: VMImagesApi, useClass: VMImagesDefaultApi},
    ],
})
export class SandboxApiModule {
    constructor() {
        const parentModule = inject(SandboxApiModule, {
            optional: true,
            skipSelf: true,
        });

        if (parentModule) {
            throw new Error(
                'SandboxApiModule is already loaded. Import it only once in single module hierarchy.',
            );
        }
    }
}
