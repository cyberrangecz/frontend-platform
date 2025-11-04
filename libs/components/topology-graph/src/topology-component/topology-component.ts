import {
    AfterViewInit,
    Component,
    ElementRef,
    HostListener,
    inject,
    input,
    signal,
    ViewChild,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTab, MatTabGroup, MatTabLabel } from '@angular/material/tabs';
import {
    OpenConsoleEvent,
    TopologyGraph,
} from './topology-graph/topology-graph';
import { MatTooltip } from '@angular/material/tooltip';
import { ConsoleView } from '../console/console-view.component';
import { Topology } from '@crczp/sandbox-model';
import { SentinelResizeDirective } from '@sentinel/common/resize';
import { TopologySynchronizerService } from './divider-position/topology-synchronizer.service';
import { TopologyNodeSvgService } from './topology-graph/services/topology-svg-generator.service';
import { TopologyIconsService } from './topology-graph/services/topology-icons.service';
import { MatIcon } from '@angular/material/icon';
import { Routing } from '@crczp/routing-commons';
import { Router } from '@angular/router';

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
        MatIcon,
    ],
    providers: [TopologyIconsService, TopologyNodeSvgService],
    templateUrl: './topology-component.html',
    styleUrl: './topology-component.scss',
})
export class TopologyComponent implements AfterViewInit {
    topology = input.required<Topology>();
    sandboxUuid = input<string>(undefined);
    standalone = input<boolean>(false);

    selectedIndex = signal(0);
    synchronizerService = inject(TopologySynchronizerService);
    router = inject(Router);

    collapsed = false;

    @ViewChild('topologyTabsDiv') topologyTabsDiv: ElementRef<HTMLDivElement>;

    protected tabs = signal<OpenConsoleEvent[]>([]);
    protected readonly window = window;

    constructor() {
        this.synchronizerService.topologyCollapsed$.subscribe(
            (collapsed) => (this.collapsed = collapsed),
        );
    }

    @HostListener('window:keydown', ['$event'])
    onKeyDown(event: KeyboardEvent): void {
        if (event.ctrlKey && event.altKey) {
            const totalTabs = this.tabs().length + 1;
            if (event.key === 'ArrowRight') {
                this.selectedIndex.update((index) => (index + 1) % totalTabs);
                event.preventDefault();
                event.stopPropagation();
            } else if (event.key === 'ArrowLeft') {
                this.selectedIndex.update((index) =>
                    index === 0 ? totalTabs - 1 : index - 1,
                );
                event.preventDefault();
                event.stopPropagation();
            }
        }
    }

    handleOpenConsole($event: OpenConsoleEvent): void {
        if (!this.sandboxUuid()) {
            console.warn(
                'TopologyComponent: sandboxUuid is not set, cannot open console',
            );
            return;
        }
        if ($event.inNewWindow) {
            this.openConsoleInNewWindow($event.nodeId, $event.inGui);
        } else {
            this.tabs.update((tabs) => [...tabs, $event]);
            this.selectedIndex.set(this.tabs().length);
        }
    }

    ngAfterViewInit(): void {
        this.updateTopologyDimensions();
    }

    closeTab(index: number): void {
        this.tabs.update((tabs) => tabs.filter((_, i) => i !== index));
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

    updateTopologyDimensions() {
        if (this.collapsed) return;
        if (this.topologyTabsDiv) {
            this.synchronizerService.emitTopologyWidthChange(
                this.topologyTabsDiv.nativeElement.clientWidth,
            );
            this.synchronizerService.emitTopologyHeightChange(
                this.topologyTabsDiv.nativeElement.clientHeight - 49,
            );
        }
    }

    handleTabClick($event: PointerEvent, index: number): void {
        if ($event.button === 1 /* middle click */) {
            this.closeTab(index);
            $event.preventDefault();
            $event.stopPropagation();
        }
    }

    private openConsoleInNewWindow(nodeId: string, inGui: boolean): void {
        const url = this.router.serializeUrl(
            this.router.createUrlTree(
                [
                    Routing.RouteBuilder.console.sandbox_instance
                        .sandboxInstanceId(this.sandboxUuid())
                        .console.nodeId(nodeId)
                        .build(),
                ],
                {
                    queryParams: {
                        inGui,
                        hideSidebar: true,
                    },
                },
            ),
        );
        console.info('Opening console in new window:', url);
        window.open(url, '_blank');
    }
}
