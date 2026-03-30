import { inject, Injectable } from '@angular/core';
import { PortalConfig } from '@crczp/utils';
import { Observable } from 'rxjs';
import { Topology } from '@crczp/sandbox-model';
import { CRCZPHttpService } from '@crczp/api-common';
import { topologyMapper } from '../../mappers/topology/topology-mapper';
import { TopologyDTO } from '../../dto/topology/topology-dto.model';

/**
 * Service for getting JSON data about topology of network and parsing them to model suitable for visualization
 * Creates hierarchical model inside nodes elements but returns it as flat array because hierarchical graph-visual are not supported
 * by D3 and it would cause problems. This way we can remain hierarchical structure inside model and
 * implement functions needed for visualization  in our own way.
 */
@Injectable()
export class TopologyApi {
    private readonly httpService = inject(CRCZPHttpService);
    private settings = inject(PortalConfig);

    /**
     * Retrieves topology by sandbox instance id.
     * When accessToken is provided (e.g. for managed runs), sends it as X-Training-Access-Token so sandbox-service can allow access.
     * @param sandboxUuid sandbox instance UUID
     * @param accessToken optional training instance access token (for managed runs where sandbox was allocated by Admin)
     */
    getTopologyBySandboxInstanceId(
        sandboxUuid: string,
        accessToken?: string,
    ): Observable<Topology> {
        const url = `${this.settings.basePaths.sandbox}/sandboxes/${sandboxUuid}/topology`;
        return this.getTopology(url, accessToken);
    }

    /**
     * Retrieves topology by sandbox definition id
     * @param {number} sandboxDefinitionsId id of sandbox definition
     */
    getTopologyBySandboxDefinitionId(
        sandboxDefinitionsId: number,
    ): Observable<Topology> {
        const url = `${this.settings.basePaths.sandbox}/definitions/${sandboxDefinitionsId}/topology`;
        return this.getTopology(url);
    }

    /**
     * Sends HTTP request and parses data for topology model.
     * When accessToken is provided, adds X-Training-Access-Token header (for managed runs).
     */
    private getTopology(url: string, accessToken?: string): Observable<Topology> {
        let request = this.httpService
            .get<TopologyDTO>(url, 'Fetching Topology')
            .withReceiveMapper(topologyMapper)
            .withCache('2h');
        if (accessToken) {
            request = request.withHeaders({
                'X-Training-Access-Token': accessToken,
            });
        }
        return request.execute();
    }
}
