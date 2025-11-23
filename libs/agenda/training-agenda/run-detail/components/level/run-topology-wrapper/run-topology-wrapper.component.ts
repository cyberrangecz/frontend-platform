import {
    Component,
    ElementRef,
    inject,
    OnDestroy,
    OnInit,
    Renderer2,
    signal,
} from '@angular/core';
import { AbstractTrainingRunService } from '../../../services/training-run/abstract-training-run.service';
import { AsyncPipe } from '@angular/common';
import {
    TopologySynchronizerService,
    TopologyWrapperComponent,
} from '@crczp/topology-graph';
import { SshAccessService } from '../../../services/training-run/ssh/ssh-acess.service';
import { MatIcon } from '@angular/material/icon';

@Component({
    selector: 'crczp-run-topology-wrapper',
    imports: [AsyncPipe, TopologyWrapperComponent, MatIcon],
    templateUrl: './run-topology-wrapper.component.html',
    styleUrl: './run-topology-wrapper.component.scss',
})
export class RunTopologyWrapperComponent implements OnInit, OnDestroy {
    protected readonly runService = inject(AbstractTrainingRunService);
    protected readonly sshAccessService = inject(SshAccessService);
    protected readonly topologyService = inject(TopologySynchronizerService);
    protected readonly collapsed = signal<boolean>(false);

    private readonly renderer = inject(Renderer2);
    private readonly elementRef = inject(ElementRef);

    private ancestorPaddedContent: HTMLElement | null = null;
    private originalPaddingRight: string = '';

    constructor() {
        this.topologyService.topologyCollapsed$.subscribe((collapsed) =>
            this.collapsed.set(collapsed),
        );
    }

    ngOnInit(): void {
        this.ancestorPaddedContent = this.findAncestorByClass(
            this.elementRef.nativeElement,
            'padded-content',
        );

        if (this.ancestorPaddedContent) {
            this.originalPaddingRight =
                this.ancestorPaddedContent.style.paddingRight;

            this.renderer.setStyle(
                this.ancestorPaddedContent,
                'padding-right',
                '0',
            );
        }
    }

    ngOnDestroy(): void {
        if (this.ancestorPaddedContent) {
            this.renderer.setStyle(
                this.ancestorPaddedContent,
                'padding-right',
                this.originalPaddingRight || null,
            );
        }
    }

    protected onAccessFileRequested(): void {
        this.sshAccessService.getAccessFile(
            this.runService.runInfo.sandboxInstanceId,
        );
    }

    private findAncestorByClass(
        element: HTMLElement,
        className: string,
    ): HTMLElement | null {
        let currentElement = element.parentElement;

        while (currentElement) {
            if (currentElement.classList.contains(className)) {
                return currentElement;
            }
            currentElement = currentElement.parentElement;
        }

        return null;
    }
}
