import { Component, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GraphNode, GraphNodeLink } from '@crczp/sandbox-model';
import { TopologyComponent } from '@crczp/topology-graph';
import { SentinelLayout1Component } from '@sentinel/layout/layout1';
import { TopologyApi } from '../../../../../libs/api/sandbox-api/src/api/topology/topology-api.service';

@Component({
    selector: 'crczp-topology-example',
    imports: [CommonModule, TopologyComponent, SentinelLayout1Component],
    templateUrl: './topology-example.html',
    styleUrl: './topology-example.scss',
    providers: [TopologyApi],
})
export class TopologyExample {
    presetNodes = signal<GraphNode[]>([]);
    presetLinks = signal<GraphNodeLink[]>([]);
}
