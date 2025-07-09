import {
    ChangeDetectorRef,
    Component,
    ElementRef,
    EventEmitter,
    inject,
    Input,
    OnChanges,
    OnDestroy,
    OnInit,
    Output,
    SimpleChanges,
    ViewChild
} from '@angular/core';
import {ForceDirectedGraph} from '../../model/graph/force-directed-graph';
import {D3Service} from '../../services/d3.service';
import {HostNode, Link, Node, NodePhysicalRoleEnum, RouterNode, SwitchNode,} from '@crczp/topology-graph-model';
import {GraphEventService} from '../../services/graph-event.service';
import {GraphEventTypeEnum} from '../../model/enums/graph-event-type-enum';
import {Subscription} from 'rxjs';
import {GraphEvent} from '../../model/events/graph-event';
import {GraphLockService} from '../../services/graph-lock.service';

/**
 * Visual component used to display graph-visual. Size of window is set and nodes and links are bound to the model
 */
@Component({
    selector: 'crczp-graph',
    templateUrl: './graph-visual.component.html',
    styleUrls: ['./graph-visual.component.css'],
    standalone: false
})
export class GraphVisualComponent implements OnInit, OnChanges, OnDestroy {
    @Input() nodes: (HostNode | RouterNode)[];
    @Input() links: Link[];
    @Input() width: number;
    @Input() height: number;
    @Input() zoom: number;
    @Input() draggedNode: Node;
    @Input() cloudSandboxInstance: boolean;
    @Input() isConsoleReady: boolean;
    @Output() polling: EventEmitter<boolean> = new EventEmitter();
    @Output() loadConsoles: EventEmitter<string> = new EventEmitter();
    @Output() showContainers: EventEmitter<boolean> = new EventEmitter();
    @ViewChild('svg') graphSvg: ElementRef<SVGElement>;
    graph: ForceDirectedGraph;
    /**
     * true if in locked canvas mode (fixed size) , false otherwise
     */
    lockedCanvas: boolean;
    defaultWidth: number;
    defaultHeight: number;
    private d3Service = inject(D3Service);
    private graphEventService = inject(GraphEventService);
    private graphLockService = inject(GraphLockService);
    private ref = inject(ChangeDetectorRef);
    private _graphEventSubscription: Subscription;
    private _graphLockSubscription: Subscription;
    private _d3ResizeSubscription: Subscription;

    /**
     * Size of window of displayed SVG
     * @returns {{width: number; height: number}} option parameters - windows size
     */
    get options() {
        if (this.lockedCanvas) {
            return {
                width: this.defaultWidth * this.zoom,
                height: this.defaultHeight * this.zoom,
            };
        } else {
            return {
                width: this.width * this.zoom,
                height: this.height * this.zoom,
            };
        }
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('width' in changes || 'height' in changes || 'zoom' in changes) {
            this.defaultWidth = this.width;
            this.defaultHeight = this.height;
            if (this.graphSvg) {
                this.graphSvg.nativeElement.setAttribute(
                    'viewBox',
                    `0 0 ${this.width * this.zoom} ${this.height * this.zoom}`
                );
            }
            if (this.graph) {
                this.graph.onResize(this.options);
            }
        }
    }

    /**
     * Creates graph visualization and subscribes for its ticks
     */
    ngOnInit() {
        this.defaultWidth = this.width;
        this.defaultHeight = this.height;

        this.graph = this.d3Service.createForceDirectedGraph(
            this.nodes,
            this.links,
            this.options
        );
        this.lockedCanvas = this.graphLockService.getLocked();

        this.subscribeGraphEvents();
        this.subscribeGraphLock();
        this.subscribeD3GraphResize();
        this.subscribeGraphTicker();

        // collapse all subnets on start only if they are larger than 12
        if (this.graph.nodes.length > 12) {
            this.graphEventService.collapseAll();
        }
        this.graph.initPosition();
    }

    onPollingStateChange(event: boolean): void {
        this.polling.emit(event);
    }

    onLoadConsoles(event: string): void {
        this.loadConsoles.emit(event);
    }

    onShowContainers(event: boolean): void {
        this.showContainers.emit(event);
    }

    /**
     * Unsubscribe observables on end of component
     */
    ngOnDestroy(): void {
        if (this._graphEventSubscription) {
            this._graphEventSubscription.unsubscribe();
        }
        if (this._graphLockSubscription) {
            this._graphLockSubscription.unsubscribe();
        }
        if (this._d3ResizeSubscription) {
            this._d3ResizeSubscription.unsubscribe();
        }
    }

    /**
     * Resolves received graph event and calls appropriate methods of graph-visual model
     * @param {GraphEventTypeEnum} event received event from service
     */
    private resolveGraphEvent(event: GraphEvent) {
        switch (event.message) {
            case GraphEventTypeEnum.ExpandAllSubnets: {
                this.expandAllSubnetworks();
                break;
            }
            case GraphEventTypeEnum.CollapseAllSubnets: {
                this.collapseAllSubnetworks();
                break;
            }
            case GraphEventTypeEnum.HideSubnet: {
                this.graph.removeSubnetwork(event.payload);
                break;
            }
            case GraphEventTypeEnum.RevealSubnet: {
                this.graph.addSubnetwork(event.payload);
                break;
            }
            case GraphEventTypeEnum.BalloonTreeLayout: {
                this.graph.balloonTreeLayout();
                break;
            }
            case GraphEventTypeEnum.FitToScreen: {
                this.graph.fitToScreen();
                break;
            }
            case GraphEventTypeEnum.TurnOffForces: {
                this.graph.turnOffForces();
                break;
            }
        }
    }

    /**
     * Expand every subnetwork in graph
     */
    private expandAllSubnetworks() {
        this.graph.nodes.forEach((node) => {
            if (
                node instanceof SwitchNode &&
                node.physicalRole === NodePhysicalRoleEnum.Cloud
            ) {
                this.expandSubnetworkOfNode(node);
            }
        });
    }

    /**
     * Recursively expands subnetworks of node
     * @param {SwitchNode} node which subnetworks should be expanded
     */
    private expandSubnetworkOfNode(node: SwitchNode) {
        if (node.hasExpandableSubnetwork()) {
            node.changeSwitchPhysicalRole();
            this.graph.addSubnetwork(node);
            node.children.forEach((d) => {
                if (
                    d instanceof SwitchNode &&
                    d.physicalRole === NodePhysicalRoleEnum.Cloud
                ) {
                    this.expandSubnetworkOfNode(d);
                }
            });
        }
    }

    /**
     * Collapses every subnetwork in a graph
     */
    private collapseAllSubnetworks() {
        this.graph.getSwitchNodes(this.graph.nodes).forEach((node) => {
            if (
                node instanceof SwitchNode &&
                node.physicalRole === NodePhysicalRoleEnum.Switch
            ) {
                this.collapseSubnetworkOfNode(node);
            }
        });
    }

    /**
     * Recursively collapses subnetworks of node.
     * @param {RouterNode} node which subnetworks should be collapsed
     */
    private collapseSubnetworkOfNode(node: SwitchNode) {
        if (node.hasExpandableSubnetwork()) {
            node.changeSwitchPhysicalRole();
            node.children.forEach((d) => {
                if (
                    d instanceof SwitchNode &&
                    d.physicalRole === NodePhysicalRoleEnum.Switch
                ) {
                    this.collapseSubnetworkOfNode(d);
                }
            });
            this.graph.removeSubnetwork(node);
        }
    }

    /**
     * Subscribes to graph events
     */
    private subscribeGraphEvents() {
        this._graphEventSubscription =
            this.graphEventService.graphEvent.subscribe({
                next: (event) => {
                    this.resolveGraphEvent(event);
                },
            });
    }

    /**
     * Subscribes to graph ticker
     */
    private subscribeGraphTicker() {
        this.graph.ticker.subscribe(() => {
            this.ref.markForCheck();
        });
    }

    /**
     * Subscribes for graph lock/unlock event
     */
    private subscribeGraphLock() {
        this._graphLockSubscription =
            this.graphLockService.lockedEvent.subscribe((value) => {
                this.lockedCanvas = value;
                if (this.lockedCanvas) {
                    this.graph.lock();
                    this.width = this.defaultWidth;
                    this.height = this.defaultHeight;

                    this.graph.onResize(this.options);
                } else {
                    this.graph.unlock();
                    this.graph.onResize(this.options);
                }
            });
    }

    /**
     * Subscribes for resize event when a node is dragged outside the window
     */
    private subscribeD3GraphResize() {
        this._d3ResizeSubscription = this.d3Service.resizeEvent.subscribe(
            (value) => {
                if (this.width < value.x) {
                    this.width = value.x + 500;
                }
                if (this.height < value.y) {
                    this.height = value.y + 500;
                }
            }
        );
    }
}
