import { Component, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTab, MatTabGroup, MatTabLabel } from '@angular/material/tabs';
import { TopologyGraph } from './topology-graph/topology-graph';
import { MatTooltip } from '@angular/material/tooltip';
import { ConsoleTab } from '../model/model';
import { ConsoleView } from '../console/console-view.component';
import { Topology } from '@crczp/sandbox-model';

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
    @Input({ required: true }) topology: Topology;

    selectedIndex = signal(0);

    protected tabs = signal<ConsoleTab[]>([]);

    handleOpenConsole($event: ConsoleTab): void {
        this.tabs.update((tabs) => [...tabs, $event]);
        this.selectedIndex.set(this.tabs().length - 1);
    }

    trackTab(index: number, tab: ConsoleTab): string {
        return tab.ip + '_' + index;
    }

    closeTab(index: number): void {
        this.tabs.update((tabs) => tabs.filter((_, i) => i !== index));
    }
}
