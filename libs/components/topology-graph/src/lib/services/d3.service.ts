import {Injectable} from '@angular/core';
import {ForceDirectedGraph} from '../model/graph/force-directed-graph';
import {Link, Node, NodePhysicalRoleEnum, RouterNode, SwitchNode,} from '@crczp/topology-graph-model';
import * as d3 from 'd3';
import {GraphLockService} from './graph-lock.service';
import {Observable, Subject} from 'rxjs';
import {DraggedNodeService} from './dragged-node.service';

/**
 * Service used for interaction between D3 library events and visual components through directives.
 */
@Injectable()
export class D3Service {
    private _resizeEventSubject: Subject<{ x: number; y: number }> =
        new Subject<{ x: number; y: number }>();
    resizeEvent: Observable<{ x: number; y: number }> =
        this._resizeEventSubject.asObservable();

    constructor(
        private draggedNodeService: DraggedNodeService,
        private graphLockService: GraphLockService
    ) {}

    /**
     * Applies dragging from D3 library on selected node.
     * If selected node is router it recalculates position for its subnetwork recursively.
     * @param element selected by user
     * @param {Node} node selected node
     * @param {ForceDirectedGraph} graph
     */
    applyDraggableBehaviour(element, node: Node, graph: ForceDirectedGraph) {
        const d3element = d3.select(element);
        const lockService = this.graphLockService;
        const resizeEventSubject = this._resizeEventSubject;
        const dragService = this.draggedNodeService;

        // drag started by user
        function started(event) {
            dragService.emitNodeTouchedEvent(node);
            // since d3 v4.13.0 default propagation to parent needs to be stopped
            event.sourceEvent.stopPropagation();
            if (!event.active) {
                graph.simulation.alphaTarget(0.3).restart();
            }

            node.fx = node.x;
            node.fy = node.y;

            // starting dragging on all children nodes for moving subnetworks as a whole
            if (
                node instanceof SwitchNode &&
                node.physicalRole === NodePhysicalRoleEnum.Switch
            ) {
                dragStartedSubnetwork(node);
            }

            event.on('drag', dragged).on('end', ended);

            // recursive function to start dragging on all nodes in parent subnetwork
            function dragStartedSubnetwork(router) {
                for (const child of router.children) {
                    child.fx = child.x;
                    child.fy = child.y;

                    if (
                        child instanceof SwitchNode &&
                        node.physicalRole === NodePhysicalRoleEnum.Switch
                    ) {
                        dragStartedSubnetwork(child);
                    }
                }
            }

            // node is dragged, its position is recalculated here
            function dragged(event) {
                dragService.emitNodeDragStartedEvent(node);
                if (lockService.getLocked()) {
                    // prevents dragging outside the window
                    node.fx = Math.max(
                        50,
                        Math.min(graph.getGraphWidth() - 50, event.x)
                    );
                    node.fy = Math.max(
                        50,
                        Math.min(graph.getGraphHeight() - 50, event.y)
                    );

                    // detects if parent node is on the border of window and stops dragging of subnet
                    const onBorder =
                        node.fx <= 50 ||
                        node.fx >= graph.getGraphWidth() - 50 ||
                        node.fy <= 50 ||
                        node.fy >= graph.getGraphHeight() - 50;
                    // calculation made also on children nodes to maintain distances inside subnetwork
                    if (
                        !onBorder &&
                        node instanceof SwitchNode &&
                        node.physicalRole === NodePhysicalRoleEnum.Switch
                    ) {
                        draggedSubnetwork(node);
                    }
                } else {
                    node.fx = event.x;
                    node.fy = event.y;

                    const outside =
                        node.fx <= 50 ||
                        node.fx >= graph.getGraphWidth() - 50 ||
                        node.fy <= 50 ||
                        node.fy >= graph.getGraphHeight() - 100;

                    // event to resize the window in unlocked mode
                    if (outside) {
                        resizeEventSubject.next({ x: node.fx, y: node.fy });
                    }
                    if (
                        node instanceof SwitchNode &&
                        node.physicalRole === NodePhysicalRoleEnum.Switch
                    ) {
                        draggedSubnetwork(node);
                    }
                }

                //  recursive function to recalculate position of all nodes in parent subnetwork
                function draggedSubnetwork(router) {
                    // TODO decide whether this is expected behaviour?
                    const draggedNodes = router.children.filter(
                        (node) =>
                            !(node instanceof RouterNode) &&
                            !(node.physicalRole === NodePhysicalRoleEnum.Router)
                    );

                    for (const child of draggedNodes) {
                        if (lockService.getLocked()) {
                            // prevents dragging outside the window
                            child.fx = Math.max(
                                50,
                                Math.min(
                                    graph.getGraphWidth() - 50,
                                    event.x + (child.x - node.x)
                                )
                            );
                            child.fy = Math.max(
                                50,
                                Math.min(
                                    graph.getGraphHeight() - 50,
                                    event.y + (child.y - node.y)
                                )
                            );
                        } else {
                            child.fx = event.x + (child.x - node.x);
                            child.fy = event.y + (child.y - node.y);
                        }
                        if (
                            child instanceof SwitchNode &&
                            node.physicalRole === NodePhysicalRoleEnum.Switch
                        ) {
                            draggedSubnetwork(child);
                        }
                    }
                }
            }

            // dragging is stopped by user
            function ended(event) {
                dragService.emitNodeDragEndedEvent();

                if (!event.active) {
                    graph.simulation.alphaTarget(0).restart();
                }
                node.fx = null;
                node.fy = null;

                // clear children nodes attributes
                if (
                    node instanceof SwitchNode &&
                    node.physicalRole === NodePhysicalRoleEnum.Switch
                ) {
                    dragEndSubnetwork(node);
                }

                // recursively clean attributes of all nodes in parent's subnetwork
                function dragEndSubnetwork(router) {
                    for (const child of router.children) {
                        child.fx = null;
                        child.fy = null;

                        if (
                            child instanceof SwitchNode &&
                            node.physicalRole === NodePhysicalRoleEnum.Switch
                        ) {
                            dragEndSubnetwork(child);
                        }
                    }
                }
            }
        }

        // initiate chain of functions responsible for dragging behaviour
        d3element.call(d3.drag().on('start', started));
    }

    /**
     * creates force directed graph-visual object on startup
     * @param {Node[]} nodes every node of graph-visual
     * @param {Link[]} links every link of graph-visual
     * @param {{width; height}} options width and height of svg
     * @returns {ForceDirectedGraph} created object of D3 graph-visual
     */
    createForceDirectedGraph(
        nodes: Node[],
        links: Link[],
        options: { width; height }
    ) {
        return new ForceDirectedGraph(nodes, links, options);
    }
}
