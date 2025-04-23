import {
    Component,
    EventEmitter,
    Input,
    OnDestroy,
    OnInit,
    Output,
} from '@angular/core';
import {
    HostNode,
    Node,
    NodePhysicalRoleEnum,
    RouterNode,
    SwitchNode,
} from '@crczp/topology-graph-model';
import { GraphEventService } from '../../services/graph-event.service';
import { ICONS_PATH } from '../../icons-path';
import { Dimensions } from '../../model/others/dimensions';

/**
 * Visual component used for displaying nodes of the graph-visual and its decorators. Binds to node model.
 */
@Component({
    selector: '[nodeVisual]',
    templateUrl: './graph-node-visual.component.html',
    styleUrls: ['./graph-node-visual.component.css'],
    standalone: false
})
export class GraphNodeVisualComponent implements OnDestroy, OnInit {
    private readonly DEFAULT_NODE_WIDTH = 92;
    private readonly DEFAULT_NODE_HEIGHT = 70;

    @Input() node: Node;
    @Input() zoom: number;
    @Input() cloudSandboxInstance: boolean;
    @Input() graphSize: Dimensions;
    @Input() isConsoleReady: boolean;
    @Output() polling: EventEmitter<boolean> = new EventEmitter();
    @Output() loadConsoles: EventEmitter<string> = new EventEmitter();
    @Output() showContainers: EventEmitter<boolean> = new EventEmitter();

    iconsPath = ICONS_PATH;
    hasContextMenu: boolean;
    width: number;
    height: number;
    labels = [];
    subnetSize = 0;
    hasContainers = false;

    private _decoratorEventSubscription;

    constructor(private graphEventService: GraphEventService) {}

    /**
     * Sets width and height of node based on amount of node's attributes to be shown and calculates text labels and its position
     */
    ngOnInit(): void {
        // unknown status decorator is created because node class is resolved from it
        this.width = this.calculateNodeWidth();
        this.height = this.calculateNodeHeight();
        this.subnetSize = this.getChildrenCount();
        this.initLabels();
        this.initContainers();
        this.hasContextMenu =
            this.node instanceof HostNode || this.node instanceof RouterNode;
    }

    /**
     * Changing node sub network state(collapsed or revealed) if node is of type Router. Reloads decorator for all children nodes
     */
    onDoubleClick() {
        if (
            this.node instanceof SwitchNode &&
            this.node.hasExpandableSubnetwork()
        ) {
            this.changeSubnetworkState(this.node);
        }
    }

    onPollingStateChange(event: boolean): void {
        this.polling.emit(event);
    }

    onLoadConsoles(event: string): void {
        this.loadConsoles.emit(event);
    }

    /**
     * Changes subnetwork state (Revealed -> Hidden, Hidden -> Revealed) and sends requests to graph to delete hidden nodes and links
     * @param {SwitchNode} node which state should be changed
     */
    private changeSubnetworkState(node: SwitchNode) {
        if (node.hasExpandableSubnetwork()) {
            node.changeSwitchPhysicalRole();
            if (node.physicalRole === NodePhysicalRoleEnum.Cloud) {
                if (node.children != null && node.children.length > 0) {
                    node.children.forEach((d) => {
                        if (
                            d instanceof SwitchNode &&
                            d.physicalRole === NodePhysicalRoleEnum.Switch
                        ) {
                            this.changeSubnetworkState(d);
                        }
                    });
                }
                this.graphEventService.hideSubnet(node);
            } else if (node.physicalRole === NodePhysicalRoleEnum.Switch) {
                this.graphEventService.revealSubnet(node);
            }
        }
    }

    /**
     * Decides whether subnet is hidden or expanded
     * @returns {boolean} true if hidden, false otherwise
     */
    isSubnetHidden(): boolean {
        return (
            this.node instanceof SwitchNode &&
            this.node.physicalRole === NodePhysicalRoleEnum.Cloud
        );
    }

    /**
     * Method for calculating width of node based on length of strings to be shown
     * @returns {number} calculated width of node
     */
    private calculateNodeWidth(): number {
        return this.DEFAULT_NODE_WIDTH;
    }

    /**
     * Calculates node height based on amount of text to be shown
     * @returns {number} calculated height of node
     */
    private calculateNodeHeight(): number {
        return this.DEFAULT_NODE_HEIGHT;
    }

    private getChildrenCount(): number {
        if (
            this.node instanceof SwitchNode &&
            this.node.hasExpandableSubnetwork()
        ) {
            return this.node.children.filter((node) => node instanceof HostNode)
                .length;
        }
    }

    /**
     * Calculates labels and position of text based on node attributes.
     */
    private initLabels() {
        // initial position - in lower middle part of node
        const xPosition = 0;
        let yPosition = this.height / -2 + 50;

        if (this.node.nodePorts[0].ip != null) {
            this.labels.push({
                x: xPosition,
                y: yPosition,
                text: this.node.nodePorts[0].ip,
            });
            yPosition += 12;
        }
        if (this.node.name != null) {
            this.labels.push({
                x: xPosition,
                y: yPosition,
                text: this.node.name,
            });
        }
    }

    private initContainers() {
        this.hasContainers =
            this.node instanceof HostNode && this.node.containers.length > 0;

        //if at least one node has visible containers, we want to emit the info for the legend
        if (this.hasContainers) {
            this.showContainers.emit(true);
        }
    }

    ngOnDestroy(): void {
        if (this._decoratorEventSubscription) {
            this._decoratorEventSubscription.unsubscribe();
        }
    }
}
