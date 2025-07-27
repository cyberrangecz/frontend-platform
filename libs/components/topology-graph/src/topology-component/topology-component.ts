import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTab, MatTabGroup, MatTabLabel } from '@angular/material/tabs';
import { TopologyGraph } from './topology-graph/topology-graph';
import { MatTooltip } from '@angular/material/tooltip';
import { ConsoleTab } from '../model/model';
import { GraphNode, GraphNodeLink } from '@crczp/sandbox-model';
import { ConsoleView } from '../console/console-view.component';

@Component({
    selector: 'crczp-topology',
    imports: [
        CommonModule,
        MatTab,
        MatTabGroup,
        TopologyGraph,
        MatTooltip,
        ConsoleView,
        MatTabLabel,
    ],
    templateUrl: './topology-component.html',
    styleUrl: './topology-component.scss',
})
export class TopologyComponent {
    @Input({ required: true }) nodes: GraphNode[];
    @Input({ required: true }) links: GraphNodeLink[];

    selectedIndex = signal(0);

    protected tabs = signal<ConsoleTab[]>([]);

    handleOpenConsole($event: ConsoleTab) {
        this.tabs.update((tabs) => [...tabs, $event]);
        this.selectedIndex.set(this.tabs().length - 1);
    }
}
