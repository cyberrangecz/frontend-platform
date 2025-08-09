import { inject, Injectable } from '@angular/core';
import { PortalConfig } from '@crczp/utils';
import { EMPTY, Observable } from 'rxjs';
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

    getTopologyBySandboxInstanceId(sandboxUuid: string): Observable<Topology> {
        const url = `${this.settings.basePaths.sandbox}/sandboxes/${sandboxUuid}/topology`;
        return this.getTopology(url);
    }

    getTopologyBySandboxDefinitionId(
        sandboxDefinitionsId: number
    ): Observable<Topology> {
        const url = `${this.settings.basePaths.sandbox}/definitions/${sandboxDefinitionsId}/topology`;
        return this.getTopology(url);
    }

    /**
     * Sends http request to authenticate user in guacamole and create Guacamole quick connection to the remote host
     * @param sandboxUuid id of sandbox in which the vm exists
     * @param vmIp ip address of the vm to remotely access
     * @param vmOsType vm's OS type of the host node
     * @param userInterface type of the user interface which should be used to open remote connection
     */
    establishGuacamoleConnection(): Observable<string> {
        return EMPTY;
    }

    /**
     * Sends HTTP request and parses data for topology model
     * @returns {Observable<{nodes: GraphNode[], links: Link[]}>} Observable of topology model
     * Caller needs to subscribe for it.
     */
    private getTopology(url: string): Observable<Topology> {
        return this.httpService
            .get<TopologyDTO>(url, 'Fetching Topology')
            .withReceiveMapper(topologyMapper)
            .execute();
    }
}
