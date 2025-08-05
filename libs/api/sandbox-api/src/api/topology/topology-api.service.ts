import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, EMPTY, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { PortalConfig } from '@crczp/utils';
import { withCache } from '@ngneat/cashew';
import { TopologyGraphMapper } from '../../mappers/topology/topology-mapper.service';
import { GraphNode, GraphNodeLink, SandboxConsole } from '@crczp/sandbox-model';
import { TopologyDTO } from '../../dto/topology/topology-dto.model';

/**
 * Service for getting JSON data about topology of network and parsing them to model suitable for visualization
 * Creates hierarchical model inside nodes elements but returns it as flat array because hierarchical graph-visual are not supported
 * by D3 and it would cause problems. This way we can remain hierarchical structure inside model and
 * implement functions needed for visualization  in our own way.
 */

@Injectable()
export class TopologyApi {
    private readonly http = inject(HttpClient);
    private settings = inject(PortalConfig);

    private consolesSubject$: BehaviorSubject<SandboxConsole[]> =
        new BehaviorSubject([]);
    consoles$: Observable<SandboxConsole[]> =
        this.consolesSubject$.asObservable();

    getTopologyBySandboxInstanceId(
        sandboxUuid: string
    ): Observable<{ nodes: GraphNode[]; links: GraphNodeLink[] }> {
        const url = `${this.settings.basePaths.sandbox}/sandboxes/${sandboxUuid}/topology`;
        return this.getTopology(url);
    }

    getTopologyBySandboxDefinitionId(
        sandboxDefinitionsId: number
    ): Observable<{ nodes: GraphNode[]; links: GraphNodeLink[] }> {
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
    private getTopology(
        url: string
    ): Observable<{ nodes: GraphNode[]; links: GraphNodeLink[] }> {
        return this.http
            .get<TopologyDTO>(url, {
                context: withCache({
                    storage: 'localStorage',
                    ttl: 7.2e6, // 2h
                }),
            })
            .pipe(
                map((response) =>
                    TopologyGraphMapper.mapTopologyFromDTO(response)
                )
            );
    }
}
