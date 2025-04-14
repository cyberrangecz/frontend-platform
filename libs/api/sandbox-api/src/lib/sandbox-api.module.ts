import { VMImagesDefaultApi } from './api/vm-images/vm-images-default-api.service';
import { ResourceDefaultApi } from './api/resources/resources-default-api.service';
import { CommonModule } from '@angular/common';
import { ModuleWithProviders, NgModule, Optional, SkipSelf } from '@angular/core';
import { SandboxDefinitionApi } from './api/definition/sandbox-definition-api.service';
import { SandboxDefinitionDefaultApi } from './api/definition/sandbox-definition-default-api.service';
import { SandboxInstanceApi } from './api/instance/sandbox-instance-api.service';
import { SandboxInstanceDefaultApi } from './api/instance/sandbox-instance-default-api.service';
import { PoolDefaultApi } from './api/pool/pool-default-api.service';
import { PoolApi } from './api/pool/pool.api.service';
import { AllocationRequestsApi } from './api/request/allocation/allocation-requests-api.service';
import { SandboxApiConfigService } from './others/sandbox-api-config.service';
import { SandboxConfig } from './others/sandbox-config';
import { AllocationRequestsDefaultApi } from './api/request/allocation/allocation-requests-default-api.service';
import { CleanupRequestsApi } from './api/request/cleanup/cleanup-requests.api.service';
import { CleanupRequestsDefaultApi } from './api/request/cleanup/cleanup-requests-default-api.service';
import { SandboxAllocationUnitsApi } from './api/sandbox-allocation-units/sandbox-allocation-units-api.service';
import { SandboxAllocationUnitsDefaultApi } from './api/sandbox-allocation-units/sandbox-allocation-units-default-api.service';
import { ResourcesApi } from './api/resources/resources-api.service';
import { VMImagesApi } from './api/vm-images/vm-images-api.service';

@NgModule({
    declarations: [],
    imports: [CommonModule],
    providers: [
        SandboxApiConfigService,
        { provide: SandboxInstanceApi, useClass: SandboxInstanceDefaultApi },
        { provide: SandboxDefinitionApi, useClass: SandboxDefinitionDefaultApi },
        { provide: PoolApi, useClass: PoolDefaultApi },
        { provide: AllocationRequestsApi, useClass: AllocationRequestsDefaultApi },
        { provide: CleanupRequestsApi, useClass: CleanupRequestsDefaultApi },
        { provide: SandboxAllocationUnitsApi, useClass: SandboxAllocationUnitsDefaultApi },
        { provide: ResourcesApi, useClass: ResourceDefaultApi },
        { provide: VMImagesApi, useClass: VMImagesDefaultApi },
    ],
})
export class SandboxApiModule {
    constructor(@Optional() @SkipSelf() parentModule: SandboxApiModule) {
        if (parentModule) {
            throw new Error('SandboxApiModule is already loaded. Import it only once in single module hierarchy.');
        }
    }

    static forRoot(config: SandboxConfig): ModuleWithProviders<SandboxApiModule> {
        return {
            ngModule: SandboxApiModule,
            providers: [{ provide: SandboxConfig, useValue: config }],
        };
    }
}
