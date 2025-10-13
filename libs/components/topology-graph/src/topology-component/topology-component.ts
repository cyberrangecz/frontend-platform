import { Component, inject, Input, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTab, MatTabGroup, MatTabLabel } from '@angular/material/tabs';
import { TopologyGraph } from './topology-graph/topology-graph';
import { MatTooltip } from '@angular/material/tooltip';
import { ConsoleTab } from '../model/model';
import { ConsoleView } from '../console/console-view.component';
import { Topology } from '@crczp/sandbox-model';
import { ResizeEvent, SentinelResizeDirective } from '@sentinel/common/resize';
import { TopologySplitViewSynchronizerService } from './divider-position/topology-split-view-synchronizer.service';
import { TopologyNodeSvgService } from './topology-graph/services/topology-svg-generator.service';
import { TopologyIconsService } from './topology-graph/services/topology-icons.service';

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
        SentinelResizeDirective,
    ],
    providers: [TopologyIconsService, TopologyNodeSvgService],
    templateUrl: './topology-component.html',
    styleUrl: './topology-component.scss',
})
export class TopologyComponent {
    @Input({ required: true }) topology: Topology;

    selectedIndex = signal(0);
    topologyHeight = signal(500);
    synchronizerService = inject(TopologySplitViewSynchronizerService);
    collapsed = false;
    protected tabs = signal<ConsoleTab[]>([]);
    protected readonly window = window;

    constructor() {
        this.synchronizerService.topologyCollapsed$.subscribe(
            (collapsed) => (this.collapsed = collapsed)
        );
    }

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

    onResize($event: ResizeEvent) {
        if (this.collapsed) return;
        this.topologyHeight.set($event.height);
    }

    mouseDown(event: MouseEvent): void {
        const mouseUp = () => {
            document.removeEventListener('mousemove', mouseMove);
            document.removeEventListener('mouseup', mouseUp);
        };

        const mouseMove = (event: MouseEvent) => {
            this.synchronizerService.emitPositionChange(event.movementX);
        };

        document.addEventListener('mouseup', mouseUp);
        document.addEventListener('mousemove', mouseMove);
        event.preventDefault();
        event.stopPropagation();
    }
}
