import {
    Component,
    DestroyRef,
    inject,
    input,
    OnInit,
    output,
    signal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { TopologyComponent } from '../index';
import { Topology } from '@crczp/sandbox-model';
import { TopologyApi } from '@crczp/sandbox-api';
import { ErrorHandlerService } from '@crczp/utils';
import { LogoSpinnerComponent } from '@crczp/components';
import { MatIcon } from '@angular/material/icon';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

export type TopologySource = { instanceId: string } | { definitionId: number };

@Component({
    selector: 'crczp-topology-wrapper',
    templateUrl: './topology-wrapper.component.html',
    styleUrl: './topology-wrapper.component.css',
    imports: [
        MatButton,
        MatTooltip,
        TopologyComponent,
        LogoSpinnerComponent,
        MatIcon,
    ],
})
export class TopologyWrapperComponent implements OnInit {
    id = input.required<TopologySource>();
    levelLoading = input(false);
    standalone = input(false);

    getAccessFile = output<void>();

    destroyRef = inject(DestroyRef);
    api = inject(TopologyApi);
    errorService = inject(ErrorHandlerService);

    topology = signal<Topology>(null);
    topologyLoading = signal<boolean>(false);

    ngOnInit(): void {
        this.topologyLoading.set(true);
        const topologyObservable =
            'instanceId' in this.id()
                ? this.api.getTopologyBySandboxInstanceId(
                      this.id()['instanceId'],
                  )
                : this.api.getTopologyBySandboxDefinitionId(
                      this.id()['definitionId'],
                  );

        topologyObservable.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (topology) => this.topology.set(topology),
            error: (error) => {
                this.errorService.emitFrontendErrorNotification(
                    "Topology component couldn't be loaded. See console for more details.",
                    'Topology component',
                );
                console.error(error);
            },
            complete: () => {
                this.topologyLoading.set(false);
            },
        });
    }

    getSandboxId(): string | undefined {
        if ('instanceId' in this.id()) {
            return this.id()['instanceId'];
        }
        return undefined;
    }
}
