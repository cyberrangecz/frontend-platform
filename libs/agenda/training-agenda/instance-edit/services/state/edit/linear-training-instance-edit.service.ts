import { inject, Injectable } from '@angular/core';
import { CommonTrainingInstanceEditService } from './common-training-instance-edit.service';
import { LinearTrainingDefinitionApi, LinearTrainingInstanceApi } from '@crczp/training-api';
import { PoolApi, SandboxDefinitionApi } from '@crczp/sandbox-api';
import { Router } from '@angular/router';
import { ErrorHandlerService, NotificationService, PortalConfig } from '@crczp/utils';
import { Routing } from '@crczp/routing-commons';

/**
 * Basic implementation of layer between component and API service.
 */
@Injectable()
export class LinearTrainingInstanceEditService extends CommonTrainingInstanceEditService {
    constructor() {
        super(
            inject(LinearTrainingInstanceApi),
            inject(LinearTrainingDefinitionApi),
            inject(PoolApi),
            inject(SandboxDefinitionApi),
            inject(Router),
            inject(ErrorHandlerService),
            inject(NotificationService),
            inject(PortalConfig),
            (id: number) =>
                Routing.RouteBuilder.linear_instance.instanceId(id).edit.build()
        );
    }
}
