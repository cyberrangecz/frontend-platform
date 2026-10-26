import { Component, inject, OnInit, signal, ChangeDetectionStrategy } from '@angular/core';

import { ConnectionParams, ConsoleView } from './console-view.component';
import { ActivatedRoute } from '@angular/router';
import { Routing } from '@crczp/routing-commons';

@Component({
    selector: 'crczp-console-wrapper',
    imports: [ConsoleView],
    templateUrl: './console-fullscreen-wrapper.component.html',
    changeDetection: ChangeDetectionStrategy.OnPush,
    styleUrl: './console-fullscreen-wrapper.component.scss',
})
export class ConsoleFullscreenWrapperComponent implements OnInit {
    connectionParams = signal<ConnectionParams | null>(null);
    private activatedRoute = inject(ActivatedRoute);

    ngOnInit(): void {
        this.activatedRoute.params.subscribe(() => {
            const inGui = this.activatedRoute.snapshot.queryParams['inGui'];
            const sandboxUuid =
                Routing.Utils.extractVariable<'console/sandbox-instance/:sandboxInstanceId/console/:nodeId'>(
                    'sandboxInstanceId',
                    this.activatedRoute.snapshot,
                );
            const nodeId =
                Routing.Utils.extractVariable<'console/sandbox-instance/:sandboxInstanceId/console/:nodeId'>(
                    'nodeId',
                    this.activatedRoute.snapshot,
                );
            this.connectionParams.set({
                sandboxUuid: sandboxUuid,
                nodeName: nodeId,
                withGui: inGui?.toString().toLowerCase() === 'true',
            });
        });
    }
}
