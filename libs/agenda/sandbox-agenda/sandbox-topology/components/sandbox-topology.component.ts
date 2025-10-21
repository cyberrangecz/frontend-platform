import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import { TopologySource, TopologyWrapperComponent } from '@crczp/topology-graph';
import { Routing } from '@crczp/routing-commons';
import { LogoSpinnerComponent } from '@crczp/components';
import { ErrorHandlerService } from '@crczp/utils';
import { ActivatedRoute } from '@angular/router';

/**
 * Smart component of sandbox instance topology page
 */
@Component({
    selector: 'crczp-sandbox-instance-topology',
    templateUrl: './sandbox-topology.component.html',
    styleUrls: ['./sandbox-topology.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [TopologyWrapperComponent, LogoSpinnerComponent],
})
export class SandboxTopologyComponent {
    destroyRef = inject(DestroyRef);
    idData = signal<TopologySource | null>(null);
    private readonly route = inject(ActivatedRoute);
    private readonly errorService = inject(ErrorHandlerService);

    constructor() {
        const sandboxInstanceId = Routing.Utils.extractVariable(
            'sandboxInstanceId',
            this.route.snapshot
        );
        const definitionId = Routing.Utils.extractVariable(
            'definitionId',
            this.route.snapshot
        );
        if (!sandboxInstanceId && !definitionId) {
            this.errorService.emitFrontendErrorNotification(
                'Sandbox instance ID or definition ID is missing',
                'Topology component'
            );
        } else {
            this.idData.set(
                sandboxInstanceId
                    ? {
                          instanceId: sandboxInstanceId,
                      }
                    : {
                          definitionId: Number.parseInt(definitionId),
                      }
            );
        }
    }
}
