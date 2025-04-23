import { Injectable } from '@angular/core';
import {
    HostNode,
    Link,
    LinkTypeEnum,
    Node,
    NodePhysicalRoleEnum,
    NodePort,
    RouterNode,
    SpecialNode,
    SwitchNode,
} from '@crczp/topology-graph-model';
import { TopologyDTO } from '../model/DTO/topology-dto.model';
import { PortDTO } from '../model/DTO/port-dto.model';
import { RouterDTO } from '../model/DTO/router-dto.model';
import { SwitchDTO } from '../model/DTO/switch-dto.model';
import { HostDTO } from '../model/DTO/host-dto.model';
import { LinkDTO } from '../model/DTO/link-dto.model';
import { SpecialNodeDTO } from '../model/DTO/special-node-dto.model';

/**
 * Maps DTOs to internal model
 * Creates hierarchical model inside nodes elements but returns it as flat array because hierarchical graph-visual are not supported
 * by D3 and it would cause problems. This way we can remain hierarchical structure inside model and
 * implement functions needed for visualization  in our own way.
 */
@Injectable()
export class TopologyMapper {
    linksCounter: number;

    mapTopologyFromDTO(topology: TopologyDTO): {
        nodes: Node[];
        links: Link[];
    } {
        this.linksCounter = 0;
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

    private mapNodesFromDTO(topologyDTO: TopologyDTO): Node[] {
        const result: Node[] = [];
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

    private mapLinksFromDTO(topologyDTO: TopologyDTO, nodes: Node[]): Link[] {
        const links: Link[] = [];
        topologyDTO.links.forEach((link) =>
            links.push(this.mapLinkFromDTO(link, nodes))
        );
        return links;
    }

    private mapPortsFromDTO(topologyDTO: TopologyDTO): NodePort[] {
        const ports: NodePort[] = [];
        topologyDTO.ports.forEach((portDTO) =>
            ports.push(this.mapPortFromDTO(portDTO))
        );
        return ports;
    }

    private createHierarchicalStructure(nodes: Node[], links: Link[]) {
        const switches: SwitchNode[] = this.findSwitchesInNodes(nodes);
        switches.forEach((switchNode) => {
            switchNode.children = this.findChildrenOfNode(switchNode, links);
        });
    }

    private findChildrenOfNode(switchNode: SwitchNode, links: Link[]): Node[] {
        const children: Node[] = [];
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

    private mapPortFromDTO(portDTO: PortDTO): NodePort {
        const result = new NodePort();
        result.name = portDTO.name;
        result.nodeName = portDTO.parent;
        result.ip = portDTO.ip;
        result.mac = portDTO.mac;
        return result;
    }

    private mapRouterFromDTO(routerDTO: RouterDTO): RouterNode {
        const result = new RouterNode();
        result.cidr = routerDTO.cidr;
        result.name = routerDTO.name;
        result.osType = routerDTO.os_type;
        result.guiAccess = routerDTO.gui_access;
        result.physicalRole = NodePhysicalRoleEnum.Router;
        return result;
    }

    private mapSwitchFromDTO(switchDTO: SwitchDTO): SwitchNode {
        const result = new SwitchNode();
        result.cidr = switchDTO.cidr;
        result.name = switchDTO.name;
        result.physicalRole = NodePhysicalRoleEnum.Switch;
        return result;
    }

    private mapHostFromDTO(hostDTO: HostDTO): HostNode {
        const result = new HostNode();
        result.name = hostDTO.name;
        result.osType = hostDTO.os_type;
        result.guiAccess = hostDTO.gui_access;
        result.containers = hostDTO.containers;
        result.physicalRole = NodePhysicalRoleEnum.Desktop;
        return result;
    }

    private mapSpecialNodeFromDTO(specialNodeDTO: SpecialNodeDTO): SpecialNode {
        const result = new SpecialNode();
        result.name = specialNodeDTO.name;
        if (result.name === NodePhysicalRoleEnum.Internet) {
            result.physicalRole = NodePhysicalRoleEnum.Internet;
        }
        return result;
    }

    private mapLinkFromDTO(linkDTO: LinkDTO, nodes: Node[]): Link {
        const result = new Link();
        result.id = this.linksCounter;
        this.linksCounter++;
        const nodeA = this.findNodeByPort(nodes, linkDTO.port_a);
        const nodeB = this.findNodeByPort(nodes, linkDTO.port_b);
        result.portA = this.findPortByName(nodeA.nodePorts, linkDTO.port_a);
        result.portB = this.findPortByName(nodeB.nodePorts, linkDTO.port_b);
        result.source = nodeA;
        result.target = nodeB;
        result.type = this.resolveLinkType(result);
        return result;
    }

    private pairNodesWithPorts(nodes: Node[], ports: NodePort[]) {
        nodes.forEach(
            (node) => (node.nodePorts = this.findPortsOfNode(node, ports))
        );
    }

    private findPortsOfNode(node: Node, ports: NodePort[]): NodePort[] {
        return ports.filter((port) => port.nodeName === node.name);
    }

    private findNodeByPort(nodes: Node[], portName: string): Node {
        return nodes.find((node) =>
            node.nodePorts.some((port) => port.name === portName)
        );
    }

    private findPortByName(ports: NodePort[], name: string): NodePort {
        return ports.find((port) => port.name === name);
    }

    private resolveLinkType(link: Link): LinkTypeEnum {
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

    private findSwitchesInNodes(nodes: Node[]): SwitchNode[] {
        return nodes.filter(
            (node) => node instanceof SwitchNode
        ) as SwitchNode[];
    }
}
