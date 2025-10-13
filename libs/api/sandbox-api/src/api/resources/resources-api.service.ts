import { Observable } from 'rxjs';
import { HardwareUsage, Resources } from '@crczp/sandbox-model';
import { HardwareUsageDTO } from '../../dto/sandbox-instance/hardware-usage-dto';
import { map } from 'rxjs/operators';
import { ResourcesMapper } from '../../mappers/sandbox-resources/resources-mapper';
import { HardwareUsageMapper } from '../../mappers/sandbox-instance/hardware-usage-mapper';
import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { PortalConfig } from '@crczp/utils';
import { SandboxResourcesDTO } from '../../dto/sandbox-resources/sandbox-resources-dto';

/**
 * Service abstracting http communication with resources endpoints.
 */
@Injectable()
export class ResourcesApi {
    private readonly http = inject(HttpClient);

    private readonly resourcesEndpointUri: string;
    private readonly limitsEndpointUri: string;

    constructor() {
        const baseUrl = inject(PortalConfig).basePaths.sandbox;
        this.resourcesEndpointUri = `${baseUrl}/info`;
        this.limitsEndpointUri = `${baseUrl}/limits`;
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
