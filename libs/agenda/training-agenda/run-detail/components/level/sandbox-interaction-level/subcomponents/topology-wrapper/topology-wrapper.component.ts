import {Component, DestroyRef, EventEmitter, inject, Input, OnInit, Output} from '@angular/core';
import {async, Observable, of} from 'rxjs';
import {TopologyErrorService} from '@crczp/topology-graph';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {TrainingErrorHandler} from '@crczp/training-agenda';

@Component({
    selector: 'crczp-topology-wrapper',
    templateUrl: './topology-wrapper.component.html',
    styleUrl: './topology-wrapper.component.css',
})
export class TopologyWrapperComponent implements OnInit {
    private topologyErrorService = inject(TopologyErrorService);
    private errorHandler = inject(TrainingErrorHandler);

    @Input() loading: Observable<boolean> = of(false);
    @Input() sandboxInstanceId!: string;
    @Input() sandboxDefinitionId!: number;
    @Output() getAccessFile = new EventEmitter<void>();

    destroyRef = inject(DestroyRef);

    ngOnInit(): void {
        this.subscribeToTopologyErrorHandler();
    }

    private subscribeToTopologyErrorHandler() {
        this.topologyErrorService.error$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
            next: (event) => this.errorHandler.emit(event.err, event.action),
            error: (err) => this.errorHandler.emit(err, 'There is a problem with topology error handler.'),
        });
    }

    protected readonly async = async;
}
