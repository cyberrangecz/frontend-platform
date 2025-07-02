import {Injectable} from '@angular/core';
import {Link, Node} from '@crczp/topology-graph-model';
import {HttpClient, HttpHeaders, HttpParams} from '@angular/common/http';
import {BehaviorSubject, Observable, of, zip} from 'rxjs';
import {map, switchMap, tap} from 'rxjs/operators';
import {TopologyMapper} from './topology-mapper.service';
import {TopologyDTO} from '../model/DTO/topology-dto.model';
import {TopologyLoadingService} from './topology-loading.service';
import {TopologyErrorService} from './topology-error.service';
import {ConsoleDTO} from '../model/DTO/console-dto.model';
import {TopologyError} from '../model/others/topology-error.model';
import {GuacamoleTokenDTO} from '../model/DTO/guacamole-token-dto.model';
import {GuacamoleIdentifierDTO} from '../model/DTO/guacamole-identifier-dto.model';
import {UserInterface} from '../model/enums/user-interface-enum';
import {HostDTO} from '../model/DTO/host-dto.model';
import {ManDTO} from '../model/DTO/man-dto.model';
import {ConsoleUrlMapper} from '../mappers/console-url-mapper';
import {ConsoleUrl} from '../model/others/console-url';
import {Settings} from '@crczp/common';

/**
 * Service for getting JSON data about topology of network and parsing them to model suitable for visualization
 * Creates hierarchical model inside nodes elements but returns it as flat array because hierarchical graph-visual are not supported
 * by D3 and it would cause problems. This way we can remain hierarchical structure inside model and
 * implement functions needed for visualization  in our own way.
 */

@Injectable()
export class TopologyApi {
    private readonly GUAC_AUTH = 'GUAC_AUTH';

    private consolesSubject$: BehaviorSubject<ConsoleUrl[]> =
        new BehaviorSubject([]);
    consoles$: Observable<ConsoleUrl[]> = this.consolesSubject$.asObservable();

    constructor(
        private http: HttpClient,
        private topologySerializer: TopologyMapper,
        private loadingService: TopologyLoadingService,
        private errorService: TopologyErrorService,
        private settings: Settings
    ) {}

    getTopologyBySandboxInstanceId(
        sandboxUuid: string
    ): Observable<{ nodes: Node[]; links: Link[] }> {
        const url = `${this.settings.SANDBOX_BASE_PATH}sandboxes/${sandboxUuid}/topology`;
        return this.getTopology(url);
    }

    getTopologyBySandboxDefinitionId(
        sandboxDefinitionsId: number
    ): Observable<{ nodes: Node[]; links: Link[] }> {
        const url = `${this.settings.SANDBOX_BASE_PATH}definitions/${sandboxDefinitionsId}/topology`;
        return this.getTopology(url);
    }

    /**
     * Sends HTTP request and parses data for topology model
     * @returns {Observable<{nodes: Node[], links: Link[]}>} Observable of topology model
     * Caller needs to subscribe for it.
     */
    getTopology(url: string): Observable<{ nodes: Node[]; links: Link[] }> {
        this.loadingService.setIsLoading(true);
        return this.http.get<TopologyDTO>(url).pipe(
            map((response) =>
                this.topologySerializer.mapTopologyFromDTO(response)
            ),
            tap(
                (_) => this.loadingService.setIsLoading(false),
                (err) => {
                    const errorMessage = new TopologyError(
                        err,
                        'Loading topology'
                    );
                    this.errorService.emitError(errorMessage);
                    this.loadingService.setIsLoading(false);
                }
            )
        );
    }

    /**
     * Sends http request to get url of virtual machine console (terminal) for remote access
     * @param sandboxUuid id of sandbox in which the vm exists
     * @param vmName name of the vm to remotely access
     */
    getVMConsoleUrl(sandboxUuid: string, vmName: string): Observable<string> {
        return this.http
            .get<ConsoleDTO>(
                `${this.settings.SANDBOX_BASE_PATH}sandboxes/${sandboxUuid}/vms/${vmName}/console`
            )
            .pipe(
                map((resp) => resp.url),
                tap({
                    error: (err) => {
                        const errorMessage = new TopologyError(
                            err,
                            'Loading VM console'
                        );
                        this.errorService.emitError(errorMessage);
                    },
                })
            );
    }

    /**
     * Retrieves urls for spice consoles for all hosts and routers in a topology.
     * @param sandboxUuid id of sandbox in which hosts and routers exist
     */
    getVMConsolesUrl(sandboxUuid: string): Observable<ConsoleUrl[]> {
        return this.http
            .get(
                `${this.settings.SANDBOX_BASE_PATH}sandboxes/${sandboxUuid}/consoles`
            )
            .pipe(
                map((resp) => ConsoleUrlMapper.fromJSON(resp)),
                tap({
                    next: (val) => this.consolesSubject$.next(val),
                    error: (err) => {
                        this.errorService.emitError(
                            new TopologyError(
                                err,
                                'Loading URLs for VM consoles'
                            )
                        );
                    },
                })
            );
    }

    /**
     * Sends http request to authenticate user in guacamole and create Guacamole quick connection to the remote host
     * @param sandboxUuid id of sandbox in which the vm exists
     * @param vmIp ip address of the vm to remotely access
     * @param vmOsType vm's OS type of the host node
     * @param userInterface type of the user interface which should be used to open remote connection
     */
    establishGuacamoleRemoteConnection(
        sandboxUuid: string,
        vmIp: string,
        vmOsType: string,
        userInterface: UserInterface
    ): Observable<string> {
        return zip(this.getGuacamoleToken(), this.getManIp(sandboxUuid)).pipe(
            switchMap((resp) => {
                if (window.localStorage.getItem(this.GUAC_AUTH) !== null) {
                    window.localStorage.removeItem(this.GUAC_AUTH);
                }
                window.localStorage.setItem(
                    this.GUAC_AUTH,
                    JSON.stringify(resp[0])
                );
                return this.createGuacamoleQuickConnection(
                    resp[0].authToken,
                    vmIp,
                    vmOsType,
                    resp[1].ip,
                    userInterface
                );
            }),
            tap({
                error: (err) => {
                    const errorMessage = new TopologyError(
                        err,
                        'Authenticate Apache`s Guacamole user.'
                    );
                    this.errorService.emitError(errorMessage);
                },
            })
        );
    }

    /**
     * Sends http request to perform an action on a virtual machine
     * @param sandboxUuid id of sandbox in which the vm exists
     * @param vmName name of the vm on which to perform the action
     * @param action action to be performed
     */
    performVMAction(
        sandboxUuid: string,
        vmName: string,
        action: string
    ): Observable<any> {
        return this.http
            .patch(
                `${this.settings.SANDBOX_BASE_PATH}sandboxes/${sandboxUuid}/vms/${vmName}`,
                {
                    action: action,
                }
            )
            .pipe(
                tap({
                    error: (err) => {
                        const errorMessage = new TopologyError(
                            err,
                            'Performing VM action: ' + action
                        );
                        this.errorService.emitError(errorMessage);
                    },
                })
            );
    }

    private getGuacamoleToken() {
        const body = new URLSearchParams();
        body.set('username', this.settings.GUACAMOLE_CONFIG.USERNAME);
        body.set('password', this.settings.GUACAMOLE_CONFIG.PASSWORD);
        return this.http.post<GuacamoleTokenDTO>(
            `${this.settings.SANDBOX_BASE_PATH}api/tokens`,
            body.toString(),
            {
                headers: new HttpHeaders({
                    'Content-Type': ' application/x-www-form-urlencoded',
                }),
            }
        );
    }

    private getVmInfo(
        sandboxUuid: string,
        vmName: string
    ): Observable<HostDTO> {
        return this.http
            .get<HostDTO>(
                `${this.settings.SANDBOX_BASE_PATH}sandboxes/${sandboxUuid}/vms/${vmName}`
            )
            .pipe(
                tap({
                    error: (err) => {
                        const errorMessage = new TopologyError(
                            err,
                            'Get VMs info.'
                        );
                        this.errorService.emitError(errorMessage);
                    },
                })
            );
    }

    private getManIp(sandboxUuid: string): Observable<ManDTO> {
        return this.http
            .get<ManDTO>(
                `${this.settings.SANDBOX_BASE_PATH}sandboxes/${sandboxUuid}/man-out-port-ip`
            )
            .pipe(
                tap({
                    error: (err) => {
                        const errorMessage = new TopologyError(
                            err,
                            'Get VMs info.'
                        );
                        this.errorService.emitError(errorMessage);
                    },
                })
            );
    }

    private getQuickConnectURI(
        vmIp: string,
        vmOsType: string,
        manIp: string,
        userInterface: UserInterface
    ): Observable<URLSearchParams> {
        const body = new URLSearchParams();
        switch (userInterface) {
            case UserInterface.CLI:
                body.set(
                    'uri',
                    `ssh://${vmIp}/?guacd-hostname=${manIp}&guacd-port=4822`
                );
                break;
            case UserInterface.GUI:
                if (vmOsType === 'linux') {
                    body.set(
                        'uri',
                        `vnc://${vmIp}:5900/?guacd-hostname=${manIp}&guacd-port=4822`
                    );
                } else {
                    body.set(
                        'uri',
                        `rdp://${vmIp}:3389/?guacd-hostname=${manIp}&guacd-port=4822`
                    );
                }
        }
        return of(body);
    }

    private createGuacamoleQuickConnection(
        token: string,
        vmIp: string,
        vmOsType: string,
        manIp: string,
        userInterface: UserInterface
    ) {
        return this.getQuickConnectURI(
            vmIp,
            vmOsType,
            manIp,
            userInterface
        ).pipe(
            switchMap((urlSearchParams) => {
                // eslint-disable-next-line max-len
                return this.http
                    .post<GuacamoleIdentifierDTO>(
                        `${this.settings.SANDBOX_BASE_PATH}api/session/ext/quickconnect/create`,
                        urlSearchParams.toString(),
                        {
                            headers: new HttpHeaders({
                                'Content-Type':
                                    ' application/x-www-form-urlencoded',
                            }),
                            params: new HttpParams().set('token', token),
                        }
                    )
                    .pipe(map((resp) => resp.identifier));
            }),
            tap({
                error: (err) => {
                    const errorMessage = new TopologyError(
                        err,
                        'Creating Guacamole quick connection.'
                    );
                    this.errorService.emitError(errorMessage);
                },
            })
        );
    }
}
