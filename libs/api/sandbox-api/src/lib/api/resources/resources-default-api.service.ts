import { SandboxResourcesDTO } from './../../DTOs/sandbox-resources/sandbox-resources-dto';
import { Observable } from 'rxjs';
import { SandboxApiConfigService } from '../../others/sandbox-api-config.service';
import { Injectable } from '@angular/core';
import { ResourcesApi } from './resources-api.service';
import { HttpClient } from '@angular/common/http';
import { ResourcesMapper } from '../../mappers/sandbox-resources/resources-mapper';
import { HardwareUsage, Resources } from '@crczp/sandbox-model';
import { map } from 'rxjs/operators';
import { HardwareUsageDTO } from '../../DTOs/sandbox-instance/hardware-usage-dto';
import { HardwareUsageMapper } from '../../mappers/sandbox-instance/hardware-usage-mapper';

/**
 * Default implementation of service abstracting http communication with resources endpoints.
 */
@Injectable()
export class ResourceDefaultApi extends ResourcesApi {
    private readonly resourcesUriExtension = 'info';
    private readonly limitsUriExtension = 'limits';
    private readonly resourcesEndpointUri : string;
    private readonly limitsEndpointUri: string;

    constructor(
        private http: HttpClient,
        private context: SandboxApiConfigService,
    ) {
        super();
        if (this.context.config === undefined || this.context.config === null) {
            throw new Error(
                'SandboxApiConfig is null or undefined. Please provide it in forRoot() method of SandboxApiModule' +
                    ' or provide own implementation of API services',
            );
        }
        this.resourcesEndpointUri = this.context.config.sandboxRestBasePath + this.resourcesUriExtension;
        this.limitsEndpointUri = this.context.config.sandboxRestBasePath + this.limitsUriExtension;
    }

    /**
     * Sends http request to retrieve all resources
     */
    getResources(): Observable<Resources> {
        return this.http
            .get<SandboxResourcesDTO>(`${this.resourcesEndpointUri}`)
            .pipe(map((response) => ResourcesMapper.fromDTO(response)));
    }

    /**
     * Sends http request to retrieve resources limits
     */
    getLimits(): Observable<HardwareUsage> {
        return this.http
            .get<HardwareUsageDTO>(`${this.limitsEndpointUri}`)
            .pipe(map((response) => HardwareUsageMapper.fromDTO(response)));
    }
}
