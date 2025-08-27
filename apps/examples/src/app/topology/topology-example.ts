import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopologyComponent } from '@crczp/topology-graph';
import { SentinelLayout1Component } from '@sentinel/layout/layout1';
import { TopologyApi } from '@crczp/sandbox-api';
import { HostNode, RouterNode, Subnet, Topology } from '@crczp/sandbox-model';
import { FormsModule } from '@angular/forms';

@Component({
    selector: 'crczp-topology-example',
    imports: [
        CommonModule,
        TopologyComponent,
        SentinelLayout1Component,
        FormsModule,
    ],
    templateUrl: './topology-example.html',
    styleUrl: './topology-example.scss',
    providers: [TopologyApi],
})
export class TopologyExample implements OnInit {
    topology!: Topology;

    topologyScale = 5;
    prevScale = -1;

    ngOnInit(): void {
        // this.generateRandomTopology();

        const host = {
            name: 'Laptop',
            ip: '192.168.10.45',
            osType: 'windows',
            guiAccess: true,
        };

        const subnet = {
            name: 'LAN',
            cidr: '192.168.10.0/24',
            hosts: [host],
        };

        const exampleRouter = {
            name: 'Home router',
            osType: 'linux',
            guiAccess: true,
            subnets: [subnet],
        };

        this.topology = {
            routers: [exampleRouter],
        };
    }

    generateRandomTopology(): void {
        if (this.prevScale === this.topologyScale) {
            return;
        }
        const scale = this.topologyScale;

        const numRouters =
            Math.floor(Math.random() * Math.max(2, Math.round(scale / 2))) + 1;

        const routers: RouterNode[] = [];

        for (let r = 0; r < numRouters; r++) {
            const numSubnets =
                Math.floor(
                    Math.random() * Math.max(2, Math.round(scale / 1.5))
                ) + 1;

            const subnets: Subnet[] = [];

            for (let s = 0; s < numSubnets; s++) {
                const numHosts =
                    Math.floor(
                        Math.random() * Math.max(4, Math.round(scale * 1.5))
                    ) + 1;

                const subnetId = (r + 1) * 100 + (s + 1);
                const baseIp = `192.${Math.floor(subnetId / 100)}.${
                    subnetId % 100
                }`;

                subnets.push(
                    this.createSubnet(
                        `Router ${r + 1} Subnet ${s + 1}`,
                        '255.255.255.0/24',
                        numHosts,
                        baseIp
                    )
                );
            }

            routers.push({
                name: `Router ${r + 1}`,
                osType: 'linux',
                guiAccess: true,
                subnets: subnets,
            });
        }

        this.topology = {
            routers: routers,
        };
    }

    onSliderChange(): void {
        this.generateRandomTopology();
    }

    private createHostNodes(
        num: number,
        baseIp: string,
        subnet: string
    ): HostNode[] {
        const hosts: HostNode[] = [];
        for (let i = 0; i < num; i++) {
            hosts.push({
                name: `${subnet} host: ${i + 1}`,
                osType: 'Linux',
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
            cidr: mask,
            hosts: this.createHostNodes(numHosts, baseIp, name),
        };
    }
}
