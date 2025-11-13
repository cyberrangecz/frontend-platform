import {
    Component,
    DestroyRef,
    EventEmitter,
    inject,
    Input,
    OnInit,
    Output,
} from '@angular/core';
import { Observable, of } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import {
    TopologyComponent,
    TopologySplitViewSynchronizerService,
} from '@crczp/topology-graph';
import { HostNode, RouterNode, Subnet, Topology } from '@crczp/sandbox-model';

@Component({
    selector: 'crczp-topology-wrapper',
    templateUrl: './topology-wrapper.component.html',
    styleUrl: './topology-wrapper.component.css',
    imports: [AsyncPipe, MatButton, MatTooltip, TopologyComponent],
})
export class TopologyWrapperComponent implements OnInit {
    @Input() loading: Observable<boolean> = of(false);
    @Input() sandboxInstanceId!: string;
    @Input() sandboxDefinitionId!: number;
    @Output() getAccessFile = new EventEmitter<void>();
    destroyRef = inject(DestroyRef);

    topology!: Topology;

    topologyScale = 5;
    prevScale = -1;

    synchronizerService = inject(TopologySplitViewSynchronizerService);

    ngOnInit(): void {
        this.generateRandomTopology();
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
                        `${r + 1} Subnet ${s + 1}`,
                        '255.255.255.0/24',
                        numHosts,
                        baseIp
                    )
                );
            }

            routers.push({
                name: `Router ${r + 1}`,
                osType: 'windows',
                guiAccess: true,
                subnets: subnets,
            });
        }

        this.topology = {
            routers: routers,
        };
    }

    private createHostNodes(
        num: number,
        baseIp: string,
        subnet: string
    ): HostNode[] {
        const hosts: HostNode[] = [];
        for (let i = 0; i < num; i++) {
            hosts.push({
                name: `${subnet} ${i + 1}`,
                osType: 'LINUX',
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
