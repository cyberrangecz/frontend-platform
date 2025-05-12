import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { take } from 'rxjs/operators';
import { TRAINING_RUN_DATA_ATTRIBUTE_NAME } from '../../../index';
import { TrainingDefinitionApi } from '@crczp/training-api';
import { SentinelControlItem } from '@sentinel/components/controls';
import { MitreTechniquesOverviewService } from '../service/mitre-techniques.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'crczp-training-run-results',
    templateUrl: './training-run-results.component.html',
    styleUrls: ['./training-run-results.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Component displaying visualization of training run results
 */
export class TrainingRunResultsComponent implements OnInit {
    hasReferenceSolution$: Observable<boolean>;
    destroyRef = inject(DestroyRef);

    constructor(
        private activatedRoute: ActivatedRoute,
        private trainingDefinitionApi: TrainingDefinitionApi,
        private service: MitreTechniquesOverviewService,
    ) {
    }

    ngOnInit(): void {
        this.loadVisualizationInfo();
    }

    /**
     * Resolves controls action and calls appropriate handler
     * @param control selected control emitted by controls component
     */
    onControlsAction(control: SentinelControlItem): void {
        control.result$.pipe(take(1)).subscribe();
    }

    /**
     * Gets asynchronous data for visualizations
     */
    loadVisualizationInfo(): void {
        this.activatedRoute.data
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
                (data) =>
                    (this.hasReferenceSolution$ = this.trainingDefinitionApi.hasReferenceSolution(
                        data[TRAINING_RUN_DATA_ATTRIBUTE_NAME].trainingDefinitionId,
                    )),
            );
    }
}
