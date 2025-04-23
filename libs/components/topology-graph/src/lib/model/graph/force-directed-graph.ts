import { EventEmitter } from '@angular/core';
import * as d3 from 'd3';
import {
    Link,
    LinkTypeEnum,
    Node,
    NodePhysicalRoleEnum,
    RouterNode,
    SwitchNode,
} from '@crczp/topology-graph-model';

/**
 * Model of force directed graph-visual. Used for displaying graph-visual visualization and user interaction with it.
 * Uses D3 and needs to get nodes, links and options (window size) on creation.
 * D3 also does not support hierarchical graphs and it would be complicated to create new graph-visual for every subnetwork
 * so this class implements multiple methods that fakes hierarchical structure and expanding/collapsing networks by
 * removing and adding links and nodes and using forces in cooperation with structured model of nodes.
 * This way, multi-layered hierarchies are supported.
 */
export class ForceDirectedGraph {
    public ticker: EventEmitter<d3.Simulation<Node, Link>> = new EventEmitter();
    public simulation: d3.Simulation<any, any>;

    public nodes: Node[];
    public links: Link[];

    private nonActiveNodes: Node[];
    private nonActiveLinks: Link[];

    private width: number;
    private height: number;

    private locked = true;

    constructor(nodes, links, options: { width; height }) {
        this.nodes = nodes;
        this.links = links;

        this.nonActiveLinks = [];
        this.nonActiveNodes = [];

        this.width = options.width;
        this.height = options.height;
        this.initSimulation();
    }

    /**
     * Initializes graph-visual with nodes provided by upper layer.
     */
    private initNodes() {
        if (!this.simulation) {
            throw new Error('simulation was not initialized yet');
        }

        // Forces for repulsion between nodes to minimize crossing
        this.simulation
            .nodes(this.nodes)
            .force(
                'charge',
                d3.forceManyBody().strength(-5000).distanceMax(150)
            );
    }

    /**
     * Initializes graph-visual with links provided by upper layers and sets default forces.
     */
    private initLinks() {
        if (!this.simulation) {
            throw new Error('simulation was not initialized yet');
        }

        // This sets different default length of links and strength of this force for router nodes and host nodes
        this.simulation.force(
            'links',
            d3
                .forceLink(Array.from(this.links))
                .id((d) => d['id'])
                .distance((d) => {
                    if (d.type === LinkTypeEnum.InternetworkingOverlay) {
                        return 400;
                    } else {
                        return 150;
                    }
                })
                .strength((d) => {
                    if (d.type === LinkTypeEnum.InternetworkingOverlay) {
                        return 0.5;
                    } else {
                        return 0.7;
                    }
                })
        );
    }

    /**
     * Initializes simulation with forces and other parameters. Prepares it for user interaction.
     */
    initSimulation() {
        if (!this.simulation) {
            this.simulation = d3.forceSimulation();

            this.initNodes();
            this.initLinks();
            this.setOnTickLocked();

            this.selfOrganizeAndStop();
            this.turnOffInitialForces();
        }
    }

    getGraphWidth(): number {
        return this.width;
    }

    getGraphHeight(): number {
        return this.height;
    }

    /**
     * Applies forces to center graph and updates width and weight in components that are using it
     * @param options window width and height
     */
    onResize(options) {
        this.width = options.width;
        this.height = options.height;
        this.simulation.force(
            'center',
            d3.forceCenter(this.width / 2, this.height / 2)
        );

        if (this.locked) {
            this.setOnTickLocked();
        } else {
            this.setOnTickUnlocked();
        }

        this.selfOrganizeAndStop();
        this.turnOffResizeForces();
        this.simulation.restart();
    }

    /**
     * Creates and sets on tick event for d3 simulation
     */
    private setOnTickLocked() {
        const ticker = this.ticker;
        const nodes = this.nodes;
        const width = this.width;
        const height = this.height;

        this.simulation.on('tick', function () {
            // prevents revealing nodes outside of the graph window
            nodes.forEach((d) => {
                d.x = Math.max(50, Math.min(width - 50, d.x));
                d.y = Math.max(50, Math.min(height - 50, d.y));
            });
            ticker.emit(this);
        });
    }

    private setOnTickUnlocked() {
        const ticker = this.ticker;
        this.simulation.on('tick', function () {
            ticker.emit(this);
        });
    }

    /**
     * Forces for default position of graph-visual
     */
    initPosition() {
        this.simulation
            .force('collide', d3.forceCollide(75))
            .force('center', d3.forceCenter(this.width / 2, this.height / 2));

        this.simulation.restart();
        this.simulation.alphaTarget(0.3);

        this.selfOrganizeAndStop();
        this.turnOffInitialForces();
    }

    lock() {
        this.locked = true;
        this.setOnTickLocked();
    }

    unlock() {
        this.locked = false;
        this.setOnTickUnlocked();
    }

    /**
     * Graph is let to reorganize after applying forces and forces are turned off so its static when user interacts with nodes.
     */
    private selfOrganizeAndStop() {
        for (let i = 0; i < Math.min(this.nodes.length * 50, 100); i++) {
            this.simulation.tick();
        }
        this.simulation.stop();
    }

    /**
     * Essentially the same as selfOrganizeAndStop but for subnet opening.
     * Difference is a lower time to organize because this way transitions and animation are smoother
     */
    private selfOrganizeSubnetAndStop() {
        const iterations = Math.min(this.nodes.length * 3, 10);
        this.simulation.tick(iterations);
        this.simulation.stop();
    }

    turnOffForces() {
        this.simulation
            .force('links', null)
            .force('collide', null)
            .force('center', null)
            .force('charge', null)
            .force('x', null)
            .force('y', null)
            .restart();
    }

    /**
     * Turning forces off after reorganization of graph-visual.
     */
    private turnOffInitialForces() {
        this.simulation
            .force('links', null)
            .force('collide', null)
            .force('center', null)
            .force('charge', null)
            .restart();
    }

    private turnOffSubnetRevealForces() {
        this.simulation.force('links', null).force('collide', null).restart();
    }

    private turnOffResizeForces() {
        this.simulation.force('center', null).restart();
    }

    /**
     * Adding subnetwork of router node to graph-visual (called by Node itself when changing state)
     * @param {RouterNode} node which sub networking is to be added.
     */
    addSubnetwork(node: SwitchNode) {
        // fixes position of the parent node
        node.fx = node.x;
        node.fy = node.y;

        this.addSubnetworkNodes(node);
        this.subnetNodesForce(node);
        const linksToAdd = this.findSubnetLinksToAdd(node);
        this.addLinks(linksToAdd);
        this.subnetLinksForce(linksToAdd);

        this.selfOrganizeSubnetAndStop();
        this.turnOffSubnetRevealForces();
    }

    /**
     * Adding nodes of subnetwork to graph-visual. Used when revealing subnetwork.
     * Children nodes are add to active nodes and removed from non-active
     * @param {parent} parent node of subnetwork
     */
    private addSubnetworkNodes(parent: SwitchNode) {
        const nodes = parent.children.filter(
            (node) => !(node instanceof RouterNode)
        );
        for (let i = nodes.length - 1; i >= 0; i--) {
            const children = nodes[i];
            const nonActiveIndex = this.nonActiveNodes.indexOf(children);
            if (nonActiveIndex > -1) {
                this.nonActiveNodes.splice(nonActiveIndex, 1);
            }
            children.x = Math.max(
                150,
                Math.min(
                    this.width - 80,
                    this.calculateChildXPosition(parent, i)
                )
            );
            children.y = Math.max(
                150,
                Math.min(
                    this.height - 80,
                    this.calculateChildYPosition(parent, i)
                )
            );
            this.nodes.push(children);
        }
    }

    /**
     * Adding links to graph.
     * Links are add to active links array and removed from non-active
     * @param {Link[]} links to be add
     */
    private addLinks(links: Link[]) {
        for (let i = links.length - 1; i >= 0; i--) {
            const nonActiveIndex = this.nonActiveLinks.indexOf(links[i]);
            if (nonActiveIndex > -1) {
                this.nonActiveLinks.splice(nonActiveIndex, 1);
            }
            this.links.push(links[i]);
        }
    }

    /**
     * Removes subnetwork of router node to graph-visual (called by Node itself when changing state)
     * @param {SwitchNode} node which sub network is to be removed.
     */
    removeSubnetwork(node: SwitchNode) {
        this.removeLinks(
            this.findSubnetLinksToRemove(
                node.children.filter((node) => !(node instanceof RouterNode))
            )
        );
        this.removeSubnetworkNodes(
            node.children.filter((node) => !(node instanceof RouterNode))
        );
    }

    /**
     * Removes nodes from active array and adds them to non-active
     * @param {Node[]} nodes set of nodes to be removed
     */
    private removeSubnetworkNodes(nodes: Node[]) {
        this.simulation.stop();
        for (let i = nodes.length - 1; i >= 0; i--) {
            const activeIndex = this.nodes.indexOf(nodes[i]);
            if (activeIndex > -1) {
                this.nodes.splice(activeIndex, 1);
            }
            this.nonActiveNodes.push(nodes[i]);
        }
    }

    /**
     * Removes links from active array and adds them to non-active
     * @param {Link[]} links set of links to be removed
     */
    private removeLinks(links: Link[]) {
        this.simulation.stop();
        for (let i = links.length - 1; i >= 0; i--) {
            const activeIndex = this.links.indexOf(links[i]);
            if (activeIndex > -1) {
                this.links.splice(activeIndex, 1);
            }
            this.nonActiveLinks.push(links[i]);
        }
    }

    /**
     * Helper method to find all links connected to nodes which are going to be removed
     * @param {Node[]} nodes set of nodes which links should be removed
     * @returns {Link[]} set of links which were selected to be removed
     */
    private findSubnetLinksToRemove(nodes: Node[]): Link[] {
        const result = [];
        this.links.forEach((l) => {
            if (nodes.includes(l.source) || nodes.includes(l.target)) {
                result.push(l);
            }
        });
        return result;
    }

    /**
     * Helper method to find all previously deleted links that should be added back to graph-visual after adding new nodes
     * @param {SwitchNode} parent parent of nodes which links should be added back to the graph-visual
     * @returns {Link[]} set of links which were selected to be added back to the graph-visual
     */
    private findSubnetLinksToAdd(parent: SwitchNode): Link[] {
        const nodes = parent.children.filter(
            (node) => !(node instanceof RouterNode)
        );
        const result: Link[] = [];
        this.nonActiveLinks.forEach((l) => {
            if (
                (nodes.includes(l.source) && parent === l.target) ||
                (nodes.includes(l.target) && parent === l.source)
            ) {
                result.push(l);
            }
        });

        return result;
    }

    /**
     * Simple algorithm to calculate optimal x coordinate of child node after revealing subnet
     * @param {Node} parent parent node of sub network
     * @param {number} i index of child node - can be used for improving calculation of position when multiple
     * children should be revealed (better results than just force collide)
     * @returns {number} x coordinate of child node
     */
    private calculateChildXPosition(parent: SwitchNode, i: number): number {
        // if parent is in the right side of graph-visual
        if (parent.x >= this.width / 2) {
            // if there are any nodes on right side of my parent
            if (parent.x < this.getLargestNodeXPositionInGraph() - 75) {
                return parent.x - 50 * ++i;
            }
            return parent.x + 50 * ++i;
            // if parent is in the left side of graph-visual
        } else {
            // if parent is the most-right located node
            if (parent.x >= this.getLargestNodeXPositionInGraph() - 75) {
                return parent.x + 50 * ++i;
            }
            return parent.x - 50 * ++i;
        }
    }

    /**
     * Simple algorithm to calculate optimal y coordinate of child node after revealing subnet
     * @param {RouterNode} parent parent node of sub network
     * @param {number} i index of child node - can be used for improving calculation of position when multiple
     * children should be revealed (better results than just force collide)
     * @returns {number} y coordinate of child node
     */
    private calculateChildYPosition(parent: SwitchNode, i: number): number {
        // if parent is in the lower part of graph-visual
        if (parent.y >= this.height / 2) {
            // if there are any nodes below my parent
            if (parent.y < this.getLargestNodeYPositionInGraph() - 75) {
                return parent.y - 50;
            }
            return parent.y + 50;
            // if parent is in the upper part of graph-visual
        } else {
            // if parent is the lowest node
            if (parent.y >= this.getLargestNodeYPositionInGraph() - 75) {
                return parent.y + 50;
            }
            return parent.y - 50;
        }
    }

    /**
     * Calculates y coordinate of lowest router node in the graph-visual
     * @returns {number} y coordinate
     */
    private getLargestNodeYPositionInGraph() {
        const nodes = this.nodes.filter(
            (node) =>
                node.physicalRole === NodePhysicalRoleEnum.Router ||
                node.physicalRole === NodePhysicalRoleEnum.Switch ||
                node.physicalRole === NodePhysicalRoleEnum.Cloud
        );
        if (nodes.length > 0) {
            return nodes.reduce((prev, cur) => (prev.y > cur.y ? prev : cur)).y;
        } else {
            return 0;
        }
    }

    /**
     * Calculates x coordinate of most left-positioned router node in the graph-visual
     * @returns {number} x coordinate
     */
    private getLargestNodeXPositionInGraph() {
        const nodes = this.nodes.filter(
            (node) =>
                node.physicalRole === NodePhysicalRoleEnum.Router ||
                node.physicalRole === NodePhysicalRoleEnum.Switch ||
                node.physicalRole === NodePhysicalRoleEnum.Cloud
        );
        if (nodes.length > 0) {
            return nodes.reduce((prev, cur) => (prev.x > cur.x ? prev : cur)).x;
        } else {
            return 0;
        }
    }

    /**
     * This method applies forces to subnet for better positioning of revealed nodes.
     * @param {SwitchNode} parent router node which subnet is revealed
     */
    private subnetNodesForce(parent: SwitchNode) {
        this.simulation
            .nodes(this.nodes)
            .force(
                'collide',
                d3
                    .forceCollide((d, i, nodes) => {
                        const node = nodes[i] as Node;
                        if (parent.children.indexOf(node) === -1) {
                            return 0;
                        } else {
                            return 50;
                        }
                    })
                    .strength(1)
            )
            .alphaTarget(0.3)
            .restart();
    }

    /**
     * This method applies forces to subnet links for better position of revealed host nodes by
     * maintaining link distance between router and hosts
     * @param {Link[]} links links in new subnet
     */
    private subnetLinksForce(links: Link[]) {
        this.simulation
            .force(
                'links',
                d3
                    .forceLink(Array.from(this.links))
                    .id((d) => d['id'])
                    .distance(150)
                    .strength((d) => {
                        if (links.indexOf(d) === -1) {
                            return 0;
                        } else {
                            return 1;
                        }
                    })
            )
            .alphaTarget(0.3)
            .restart();
    }

    getSwitchNodes(nodes: Node[]): SwitchNode[] {
        return nodes.filter(
            (node) =>
                node instanceof SwitchNode &&
                node.physicalRole === NodePhysicalRoleEnum.Switch
        ) as SwitchNode[];
    }

    /* -----------------------LAYOUTS----------------------- */

    fitToScreen() {}

    balloonTreeLayout() {
        this.simulation
            .force('charge', d3.forceManyBody().strength(-5000))
            .force(
                'links',
                d3
                    .forceLink(Array.from(this.links))
                    .id((d) => d['id'])
                    .distance((d) => {
                        if (d.type === LinkTypeEnum.InternetworkingOverlay) {
                            return 400;
                        } else {
                            return 150;
                        }
                    })
                    .strength((d) => {
                        if (d.type === LinkTypeEnum.InternetworkingOverlay) {
                            return 1;
                        } else {
                            return 1;
                        }
                    })
            )
            .force('center', d3.forceCenter(this.width / 2, this.height / 2))
            .restart();
        this.selfOrganizeAndStop();
        this.turnOffInitialForces();
    }
}
