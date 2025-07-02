import {
    AfterViewInit,
    Component,
    ElementRef,
    EventEmitter,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    Output,
    SimpleChanges,
    ViewChild,
} from '@angular/core';
import {Link, Node} from '@crczp/topology-graph-model';
import {TopologyApi} from '../services/topology-api.service';
import {DraggedNodeService} from '../services/dragged-node.service';
import {BehaviorSubject, EMPTY, Observable, takeWhile} from 'rxjs';
import {SandboxService} from '../services/sandbox.service';
import {TopologyLoadingService} from '../services/topology-loading.service';
import {GraphEventService} from '../services/graph-event.service';
import {catchError, map, take} from 'rxjs/operators';
import {ResourcePollingService} from '../services/resource-polling.service';
import {ConsoleUrl} from '../model/others/console-url';
import {Settings} from '@crczp/common';

/**
 * Main component of the graph-visual topology application.
 * On start it loads topology and decorators and store results in nodes and links attributes which are later
 * used to construct and draw graph-visual of topology. Data can be also reloaded periodically or manually by user.
 * Loaded data attribute is used for marking if getting data from server and parsing was already finished and
 * its safe to construct graph-visual.
 */
@Component({
    selector: 'crczp-topology-graph',
    standalone: false,
    templateUrl: './topology-graph.component.html',
    styleUrl: './topology-graph.component.css',
})
export class TopologyGraphComponent
    implements OnInit, OnChanges, OnDestroy, AfterViewInit
{
    @Input() sandboxUuid: string;
    @Input() sandboxDefinitionId: number;
    @Output() topologyLoadEmitter: EventEmitter<boolean> = new EventEmitter();

    @ViewChild('topologyContent') topologyContent: ElementRef<HTMLDivElement>;
    nodes: Node[];
    links: Link[];
    draggedNode: Node;
    isLoading$: Observable<boolean>;
    consoles$: Observable<ConsoleUrl[]>;
    isConsoleReady$: Observable<boolean>;
    dataLoaded: boolean;
    showLegendContainers = false;
    isError = false;
    zoom = 1;
    protected readonly Math = Math;
    private pollingSubject$: BehaviorSubject<boolean> = new BehaviorSubject(
        true
    );
    polling$: Observable<boolean> = this.pollingSubject$.asObservable();
    private _nodeDraggedSubscription;
    private _nodeDragEndedSubscription;

    constructor(
        private loadingService: TopologyLoadingService,
        private topologyLoaderService: TopologyApi,
        protected graphEventService: GraphEventService,
        private sandboxService: SandboxService,
        private topologyApiService: TopologyApi,
        private draggedNodeService: DraggedNodeService,
        private resourcePollingService: ResourcePollingService,
        private settings: Settings
    ) {}

    /**
     * Loads first topology and decorators and subscribes for periodical refresh of decorators and decorator reload requests.
     */
    ngOnInit(): void {
        this.subscribeLoading();
        this.loadTopology();
        this.subscribeDragNodeEvents();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('sandboxUuid' in changes) {
            this.sandboxService.setSandboxInstanceId(this.sandboxUuid);
        }
        if ('sandboxDefinitionId' in changes) {
            this.sandboxService.setSandboxDefinitionId(
                this.sandboxDefinitionId
            );
        }
    }

    ngAfterViewInit(): void {
        if (this.sandboxUuid) {
            this.topologyApiService
                .getVMConsolesUrl(this.sandboxUuid)
                .pipe(take(1))
                .subscribe();
            this.consoles$ = this.topologyApiService.consoles$;
        }
    }

    onPollingStateChange(event: boolean): void {
        this.pollingSubject$.next(event);
    }

    onLoadConsoles(event: string): void {
        this.fetchConsoles();
        this.isConsoleReady$ = this.consoles$.pipe(
            map((consoles) => {
                if (consoles.length > 0) {
                    return (
                        consoles.find((console) => console.name == event) !==
                        undefined
                    );
                }
            })
        );
    }

    onShowContainers(event: boolean): void {
        setTimeout(() => (this.showLegendContainers = event), 100);
    }

    fetchConsoles(): void {
        const observable$: Observable<ConsoleUrl[]> =
            this.topologyApiService.getVMConsolesUrl(this.sandboxUuid);
        this.resourcePollingService
            .startPolling(
                observable$,
                this.settings.POLLING_PERIOD_SHORT,
                this.settings.RETRY_COUNT,
                true
            )
            .pipe(
                takeWhile(() => this.pollingSubject$.getValue()),
                catchError(() => EMPTY)
            )
            .subscribe();
    }

    /**
     * Reloads topology and its decorators.
     */
    reloadTopology() {
        this.isError = false;
        this.loadTopology();
    }

    /**
     * Calls topology loader service and updates attributes based on result
     */
    loadTopology() {
        this.dataLoaded = false;
        let topologyRequest;
        if (this.sandboxUuid) {
            topologyRequest =
                this.topologyLoaderService.getTopologyBySandboxInstanceId(
                    this.sandboxUuid
                );
        } else if (this.sandboxDefinitionId) {
            topologyRequest =
                this.topologyLoaderService.getTopologyBySandboxDefinitionId(
                    this.sandboxDefinitionId
                );
        }
        topologyRequest.subscribe(
            (data) => {
                this.nodes = data.nodes;
                this.links = data.links;
                this.dataLoaded = true;
                this.topologyLoadEmitter.emit(true);
            },
            (err) => {
                this.isError = true;
            }
        );
    }

    isCloudSandboxInstance(): boolean {
        return this.sandboxUuid !== undefined && this.sandboxUuid !== null;
    }

    /**
     * Unsubscribe from observables at the end of this component
     */
    ngOnDestroy() {
        if (this._nodeDraggedSubscription) {
            this._nodeDraggedSubscription.unsubscribe();
        }
        if (this._nodeDragEndedSubscription) {
            this._nodeDragEndedSubscription.unsubscribe();
        }
    }

    getTopologyHeight(): number {
        return this.topologyContent.nativeElement.offsetHeight - 6;
    }

    getTopologyWidth(): number {
        return this.topologyContent.nativeElement.offsetWidth - 32;
    }

    private subscribeDragNodeEvents() {
        this._nodeDraggedSubscription =
            this.draggedNodeService.onNodeDragStarted.subscribe((node) => {
                this.draggedNode = node;
            });
        this._nodeDragEndedSubscription =
            this.draggedNodeService.onNodeDragEnded.subscribe((node) => {
                this.draggedNode = null;
            });
    }

    private subscribeLoading() {
        this.isLoading$ = this.loadingService.isLoading$;
    }
}
