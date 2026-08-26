import { Component, DestroyRef, inject, input, OnInit, signal } from '@angular/core';
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
    imports: [TopologyComponent, LogoSpinnerComponent, MatIcon],
})
export class TopologyWrapperComponent implements OnInit {
    id = input.required<TopologySource>();
    levelLoading = input(false);
    standalone = input(false);

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
