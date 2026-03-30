import { Component, computed, DestroyRef, inject, input, OnInit, output, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatTooltip } from '@angular/material/tooltip';
import { Topology } from '@crczp/sandbox-model';
import { TopologyApi } from '@crczp/sandbox-api';
import { ErrorHandlerService } from '@crczp/utils';
import { MatIcon } from '@angular/material/icon';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LogoSpinnerComponent } from '../../logo-spinner/logo-spinner.component';
import { TopologyComponent } from '../topology-component/topology-component';

type SandboxInstanceSource = { instanceId: string };
type SandboxDefinitionSource = { definitionId: number };
export type TopologySource = SandboxInstanceSource | SandboxDefinitionSource;

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
    /** When provided (e.g. for managed runs), sent as X-Training-Access-Token to sandbox-service so topology is allowed. */
    accessToken = input<string>();
    levelLoading = input(false);
    standalone = input(false);

    hasInstance = computed(
        () => !!(this.id() as SandboxInstanceSource).instanceId,
    );
    getAccessFile = output<void>();

    destroyRef = inject(DestroyRef);
    api = inject(TopologyApi);
    errorService = inject(ErrorHandlerService);

    topology = signal<Topology>(null);
    topologyLoading = signal<boolean>(false);

    ngOnInit(): void {
        this.topologyLoading.set(true);
        const source = this.id();
        const topologyObservable =
            'instanceId' in source
                ? this.api.getTopologyBySandboxInstanceId(
                      source.instanceId,
                      this.accessToken(),
                  )
                : this.api.getTopologyBySandboxDefinitionId(
                      source.definitionId,
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
