import { CommonModule } from '@angular/common';
import {
    AfterViewInit,
    Component,
    effect,
    ElementRef,
    HostListener,
    inject,
    input,
    signal,
    ViewChild,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTab, MatTabGroup, MatTabLabel } from '@angular/material/tabs';
import { MatTooltip } from '@angular/material/tooltip';
import { Router } from '@angular/router';
import { Routing } from '@crczp/routing-commons';
import { Topology } from '@crczp/sandbox-model';
import { SentinelResizeDirective } from '@sentinel/common/resize';
import { filter, map, Observable, Subject } from 'rxjs';
import { ConsoleView } from '../console/console-view.component';
import { TopologyIconsService } from './topology-graph/services/topology-icons.service';
import { TopologyNodeSvgService } from './topology-graph/services/topology-svg-generator.service';
import {
    OpenConsoleEvent,
    TopologyGraph,
} from './topology-graph/topology-graph';
import { TopologySynchronizerService } from './topology-synchronizer.service';

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
    protected focusSubject = new Subject<number>();

    constructor() {
        this.synchronizerService.topologyCollapsed$.subscribe(
            (collapsed) => (this.collapsed = collapsed),
        );

        this.synchronizerService.drag$.subscribe((delta) => {
            if (this.topologyTabsDiv) {
                const currentWidth =
                    this.topologyTabsDiv.nativeElement.clientWidth;
                const newWidth = currentWidth - delta;
                this.synchronizerService.emitTopologyWidthChange(newWidth);
            }
        });

        this.synchronizerService.topologyDimensions$.subscribe(
            ({ width, height }) => {
                if (this.topologyTabsDiv) {
                    this.topologyTabsDiv.nativeElement.style.width = `${width}px`;
                    this.topologyTabsDiv.nativeElement.style.height = `${height}px`;
                }
            },
        );

        effect(() => {
            this.focusSubject.next(this.selectedIndex() - 1);
        });
    }

    @HostListener('window:resize')
    onWindowResize(): void {
        this.updateTopologyDimensions();
    }

    @HostListener('window:keydown', ['$event'])
    onKeyDown(event: KeyboardEvent): void {
        if (event.ctrlKey && event.altKey && !event.shiftKey) {
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
            if (this.standalone()) {
                this.synchronizerService.emitTopologyWidthChange(
                    this.topologyTabsDiv.nativeElement.parentElement.offsetWidth,
                );
            }
            this.synchronizerService.emitTopologyHeightChange(
                this.topologyTabsDiv.nativeElement.parentElement.offsetHeight,
            );
        }
    }

    handleTabMiddleClick($event: PointerEvent, index: number): void {
        if ($event.button === 1 /* middle click */) {
            this.closeTab(index);
            $event.preventDefault();
            $event.stopPropagation();
        }
    }

    protected getConsoleFocus$($index: number): Observable<void> {
        return this.focusSubject.asObservable().pipe(
            filter((index) => index === $index),
            map(() => void 0),
        );
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
