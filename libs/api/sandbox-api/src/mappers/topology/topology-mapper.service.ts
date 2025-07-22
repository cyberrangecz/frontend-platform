import {
    GraphNode,
    GraphNodeType,
    HostNode,
    Link,
    LinkTypeEnum,
    NodePort,
    RouterNode,
    SpecialNode,
    SwitchNode,
} from '@crczp/topology-graph-model';
import {TopologyDTO} from '../../../../../temp/model/DTO/topology-dto.model';
import {PortDTO} from '../../../../../temp/model/DTO/port-dto.model';
import {RouterDTO} from '../../../../../temp/model/DTO/router-dto.model';
import {SwitchDTO} from '../../../../../temp/model/DTO/switch-dto.model';
import {HostDTO} from '../../../../../temp/model/DTO/host-dto.model';
import {LinkDTO} from '../../../../../temp/model/DTO/link-dto.model';
import {SpecialNodeDTO} from '../../../../../temp/model/DTO/special-node-dto.model';

/**
 * Maps DTOs to internal model
 * Creates hierarchical model inside nodes elements but returns it as flat array because hierarchical graph-visual are not supported
 * by D3 and it would cause problems. This way we can remain hierarchical structure inside model and
 * implement functions needed for visualization  in our own way.
 */
export class TopologyGraphMapper {

    public static mapTopologyFromDTO(topology: TopologyDTO): {
        nodes: GraphNode[];
        links: Link[];
    } {
        const ports = this.mapPortsFromDTO(topology);
        const nodes = this.mapNodesFromDTO(topology);
        this.pairNodesWithPorts(nodes, ports);
        const links = this.mapLinksFromDTO(topology, nodes);
        this.createHierarchicalStructure(nodes, links);
        return {
            nodes: nodes,
            links: links,
        };
    }

    private static mapNodesFromDTO(topologyDTO: TopologyDTO): GraphNode[] {
        const result: GraphNode[] = [];
        topologyDTO.hosts.forEach((hostDTO) =>
            result.push(this.mapHostFromDTO(hostDTO))
        );

        topologyDTO.switches.forEach((switchDTO) =>
            result.push(this.mapSwitchFromDTO(switchDTO))
        );

        topologyDTO.routers.forEach((routerDTO) =>
            result.push(this.mapRouterFromDTO(routerDTO))
        );

        if (topologyDTO.special_nodes) {
            topologyDTO.special_nodes.forEach((specialNodeDTO) =>
                result.push(this.mapSpecialNodeFromDTO(specialNodeDTO))
            );
        }

        return result;
    }

    private static mapLinksFromDTO(topologyDTO: TopologyDTO, nodes: GraphNode[]): Link[] {
        const links: Link[] = [];
        let linksCounter = 0;

        topologyDTO.links.forEach((link) =>
            links.push(this.mapLinkFromDTO(link, nodes, linksCounter++))
        );
        return links;
    }

    private static mapPortsFromDTO(topologyDTO: TopologyDTO): NodePort[] {
        const ports: NodePort[] = [];
        topologyDTO.ports.forEach((portDTO) =>
            ports.push(this.mapPortFromDTO(portDTO))
        );
        return ports;
    }

    private static createHierarchicalStructure(nodes: GraphNode[], links: Link[]) {
        const switches: SwitchNode[] = this.findSwitchesInNodes(nodes);
        switches.forEach((switchNode) => {
            switchNode.children = this.findChildrenOfNode(switchNode, links);
        });
    }

    private static findChildrenOfNode(switchNode: SwitchNode, links: Link[]): GraphNode[] {
        const children: GraphNode[] = [];
        const nodeLinks = links.filter(
            (link) =>
                link.source.name === switchNode.name ||
                link.target.name === switchNode.name
        );

        nodeLinks.forEach((link) => {
            if (link.source.name === switchNode.name) {
                children.push(link.target);
            } else {
                children.push(link.source);
            }
        });

        return children;
    }

    private static mapPortFromDTO(portDTO: PortDTO): NodePort {
        const result = new NodePort();
        result.name = portDTO.name;
        result.nodeName = portDTO.parent;
        result.ip = portDTO.ip;
        result.mac = portDTO.mac;
        return result;
    }

    private static mapRouterFromDTO(routerDTO: RouterDTO): RouterNode {
        const result = new RouterNode();
        result.cidr = routerDTO.cidr;
        result.name = routerDTO.name;
        result.osType = routerDTO.os_type;
        result.guiAccess = routerDTO.gui_access;
        result.nodeType = GraphNodeType.Router;
        return result;
    }

    private static mapSwitchFromDTO(switchDTO: SwitchDTO): SwitchNode {
        const result = new SwitchNode();
        result.cidr = switchDTO.cidr;
        result.name = switchDTO.name;
        result.nodeType = GraphNodeType.Switch;
        return result;
    }

    private static mapHostFromDTO(hostDTO: HostDTO): HostNode {
        const result = new HostNode();
        result.name = hostDTO.name;
        result.osType = hostDTO.os_type;
        result.guiAccess = hostDTO.gui_access;
        result.containers = hostDTO.containers;
        result.physicalRole = GraphNodeType.Desktop;
        return result;
    }

    private static mapSpecialNodeFromDTO(specialNodeDTO: SpecialNodeDTO): SpecialNode {
        const result = new SpecialNode();
        result.name = specialNodeDTO.name;
        if (result.name === GraphNodeType.Internet) {
            result.nodeType = GraphNodeType.Internet;
        }
        return result;
    }

    private static mapLinkFromDTO(linkDTO: LinkDTO, nodes: GraphNode[], linkId: number): Link {
        const result = new Link();
        result.id = linkId;
        const nodeA = this.findNodeByPort(nodes, linkDTO.port_a);
        const nodeB = this.findNodeByPort(nodes, linkDTO.port_b);
        result.portA = this.findPortByName(nodeA.nodePorts, linkDTO.port_a);
        result.portB = this.findPortByName(nodeB.nodePorts, linkDTO.port_b);
        result.source = nodeA;
        result.target = nodeB;
        result.type = this.resolveLinkType(result);
        return result;
    }

    private static pairNodesWithPorts(nodes: GraphNode[], ports: NodePort[]) {
        nodes.forEach(
            (node) => (node.nodePorts = this.findPortsOfNode(node, ports))
        );
    }

    private static findPortsOfNode(node: GraphNode, ports: NodePort[]): NodePort[] {
        return ports.filter((port) => port.nodeName === node.name);
    }

    private static findNodeByPort(nodes: GraphNode[], portName: string): GraphNode {
        return nodes.find((node) =>
            node.nodePorts.some((port) => port.name === portName)
        );
    }

    private static findPortByName(ports: NodePort[], name: string): NodePort {
        return ports.find((port) => port.name === name);
    }

    private static resolveLinkType(link: Link): LinkTypeEnum {
        if (
            (link.source instanceof RouterNode ||
                link.source instanceof SwitchNode) &&
            (link.target instanceof RouterNode ||
                link.target instanceof SwitchNode)
        ) {
            return LinkTypeEnum.InternetworkingOverlay;
        }
        return LinkTypeEnum.InterfaceOverlay;
    }

    private static findSwitchesInNodes(nodes: GraphNode[]): SwitchNode[] {
        return nodes.filter(
            (node) => node instanceof SwitchNode
        ) as SwitchNode[];
    }
}
