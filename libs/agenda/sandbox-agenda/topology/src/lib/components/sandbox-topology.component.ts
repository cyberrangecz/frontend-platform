import {ChangeDetectionStrategy, Component, DestroyRef, HostListener, inject, OnInit} from '@angular/core';
import {ActivatedRoute} from '@angular/router';
import {SandboxDefinition, SandboxInstance} from '@crczp/sandbox-model';
import {TopologyErrorService, TopologyGraphModule} from '@crczp/topology-graph';
import {Observable} from 'rxjs';
import {map, tap} from 'rxjs/operators';
import {
    SANDBOX_DEFINITION_DATA_ATTRIBUTE_NAME,
    SANDBOX_INSTANCE_DATA_ATTRIBUTE_NAME,
    SandboxErrorHandler,
} from '@crczp/sandbox-agenda';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {AsyncPipe} from "@angular/common";

/**
 * Smart component of sandbox instance topology page
 */
@Component({
    selector: 'crczp-sandbox-instance-topology',
    templateUrl: './sandbox-topology.component.html',
    styleUrls: ['./sandbox-topology.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        TopologyGraphModule,
        AsyncPipe
    ]
})
export class SandboxTopologyComponent implements OnInit {
    private activeRoute = inject(ActivatedRoute);
    private topologyErrorService = inject(TopologyErrorService);
    private errorHandler = inject(SandboxErrorHandler);

    sandboxInstance$: Observable<SandboxInstance>;
    sandboxDefinition$: Observable<SandboxDefinition>;
    topologyWidth: number;
    topologyHeight: number;
    sandboxId: number;
    destroyRef = inject(DestroyRef);

    ngOnInit(): void {
        this.sandboxInstance$ = this.activeRoute.data.pipe(
            takeUntilDestroyed(this.destroyRef),
            map((data) => data[SANDBOX_INSTANCE_DATA_ATTRIBUTE_NAME]),
            tap((data) => (this.sandboxId = data?.id)),
        );
        this.sandboxDefinition$ = this.activeRoute.data.pipe(
            takeUntilDestroyed(this.destroyRef),
            map((data) => data[SANDBOX_DEFINITION_DATA_ATTRIBUTE_NAME]),
        );
        this.calculateTopologySize();
        this.subscribeToTopologyErrorHandler();
    }

    @HostListener('window:resize', ['$event'])
    // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-unused-vars
    onResize(event): void {
        this.calculateTopologySize();
    }

    private calculateTopologySize() {
        this.topologyWidth = window.innerWidth - 325;
        this.topologyHeight = window.innerHeight - 260;
    }

    private subscribeToTopologyErrorHandler() {
        this.topologyErrorService.error$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (event) => this.errorHandler.emit(event.err, event.action),
            error: (err) => this.errorHandler.emit(err, 'There is a problem with topology error handler.'),
        });
    }
}
