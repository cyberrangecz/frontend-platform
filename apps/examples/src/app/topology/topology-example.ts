import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopologyComponent } from '@crczp/topology-graph';
import { SentinelLayout1Component } from '@sentinel/layout/layout1';
import { TopologyApi } from '@crczp/sandbox-api';
import { HostNode, Subnet, Topology } from '@crczp/sandbox-model';

@Component({
    selector: 'crczp-topology-example',
    imports: [CommonModule, TopologyComponent, SentinelLayout1Component],
    templateUrl: './topology-example.html',
    styleUrl: './topology-example.scss',
    providers: [TopologyApi],
})
export class TopologyExample {
    //GPT generated example topology
    readonly exampleTopology: Topology = {
        routers: [
            // Router 1 - New York Data Center
            {
                name: 'Router 1 - New York',
                osType: 'linux',
                guiAccess: true,
                subnets: [
                    this.createSubnet(
                        'Subnet 1 - NY',
                        '255.255.255.0',
                        10,
                        '192.168.1'
                    ),
                    this.createSubnet(
                        'Subnet 2 - NY',
                        '255.255.255.0',
                        10,
                        '192.168.2'
                    ),
                    this.createSubnet(
                        'Subnet 3 - NY',
                        '255.255.255.0',
                        10,
                        '192.168.3'
                    ),
                ],
            },

            // Router 2 - Los Angeles Data Center
            {
                name: 'Router 2 - Los Angeles',
                osType: 'linux',
                guiAccess: true,
                subnets: [
                    this.createSubnet(
                        'Subnet 1 - LA',
                        '255.255.255.0',
                        4,
                        '192.169.1'
                    ),
                    this.createSubnet(
                        'Subnet 2 - LA',
                        '255.255.255.0',
                        16,
                        '192.169.2'
                    ),
                ],
            },

            // Router 3 - Branch Office
            {
                name: 'Router 3 - Branch Office',
                osType: 'linux',
                guiAccess: true,
                subnets: [
                    this.createSubnet(
                        'Subnet 1 - Branch',
                        '255.255.255.0',
                        3,
                        '192.170.1'
                    ),
                ],
            },

            // Router 4 - Cloud Service
            {
                name: 'Router 4 - Cloud Service',
                osType: 'linux',
                guiAccess: true,
                subnets: [
                    this.createSubnet(
                        'Subnet 1 - Cloud',
                        '255.255.255.0',
                        5,
                        '192.171.1'
                    ),
                    this.createSubnet(
                        'Subnet 2 - Cloud',
                        '255.255.255.0',
                        10,
                        '192.171.2'
                    ),
                    this.createSubnet(
                        'Subnet 3 - Cloud',
                        '255.255.255.0',
                        2,
                        '192.171.3'
                    ),
                    this.createSubnet(
                        'Subnet 4 - Cloud',
                        '255.255.255.0',
                        20,
                        '192.171.4'
                    ),
                ],
            },

            // Router 5 - Experimental Network
            {
                name: 'Router 5 - Experimental Network',
                osType: 'Linux',
                guiAccess: true,
                subnets: [
                    this.createSubnet(
                        'Subnet 1 - Experimental',
                        '255.255.255.0',
                        10,
                        '192.172.1'
                    ),
                    this.createSubnet(
                        'Subnet 2 - Experimental',
                        '255.255.255.0',
                        2,
                        '192.172.2'
                    ),
                ],
            },
        ],
    };

    private createHostNodes(num: number, baseIp: string): HostNode[] {
        const hosts: HostNode[] = [];
        for (let i = 0; i < num; i++) {
            hosts.push({
                name: `host-${baseIp}-${i}`,
                osType: 'Linux', // Example OS type
                guiAccess: true,
                ip: `${baseIp}.${i + 1}`,
            });
        }
        return hosts;
    }

    private createSubnet(
        name: string,
        mask: string,
        numHosts: number,
        baseIp: string
    ): Subnet {
        return {
            name,
            mask,
            hosts: this.createHostNodes(numHosts, baseIp),
        };
    }
}
