import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
    input,
    OnChanges,
    SimpleChanges,
} from '@angular/core';
import { Observable } from 'rxjs';
import { AsyncPipe } from '@angular/common';
import { search } from '@codemirror/search';
import { StageAdapter } from '../../../model/adapters/stage-adapter';
import { LogView } from '@crczp/components';
import { AllocationRequestDetailComponent } from '../../allocation-request-detail.component';
import { OutputsService } from '../../../services/state/detail/outputs.service';
import { takeUntilDestroyed, toObservable } from '@angular/core/rxjs-interop';

@Component({
    selector: 'crczp-allocation-stage-detail',
    templateUrl: './allocation-stage-detail.component.html',
    styleUrls: ['./allocation-stage-detail.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [AsyncPipe, LogView],
})
export class AllocationStageDetailComponent implements OnChanges {
    stage = input.required<StageAdapter>();
    height = input<CSSStyleDeclaration['height']>('100%');
    outputs$: Observable<string>;
    destroyRef = inject(DestroyRef);
    stage$ = toObservable(this.stage);
    protected readonly search = search;
    private readonly outputServicesDict = inject(
        AllocationRequestDetailComponent.STAGE_LOG_SERVICES_TOKEN,
    );

    ngOnChanges(changes: SimpleChanges): void {
        if (
            this.stage() &&
            'stage' in changes &&
            changes['stage'].firstChange
        ) {
            this.outputs$ = this.outputServicesDict[
                this.stage().type
            ].log$.pipe(takeUntilDestroyed(this.destroyRef));
            this.startPollingOutputs(
                this.outputServicesDict[this.stage().type],
            );
        }
    }

    startPollingOutputs(service: OutputsService) {
        service
            .pollUntilComplete(this.stage$, this.stage().requestId)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe();
    }
}
