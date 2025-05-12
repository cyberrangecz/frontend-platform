import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Observable } from 'rxjs';
import { TrainingDefinitionApi } from '@crczp/training-api';
import { TRAINING_INSTANCE_DATA_ATTRIBUTE_NAME } from '../../../index';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Component displaying training instance results visualizations
 */
@Component({
    selector: 'crczp-training-instance-results',
    templateUrl: './training-instance-results.component.html',
    styleUrls: ['./training-instance-results.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingInstanceResultsComponent implements OnInit {
    hasReferenceSolution$: Observable<boolean>;
    destroyRef = inject(DestroyRef);

    constructor(
        private activeRoute: ActivatedRoute,
        private trainingDefinitionApi: TrainingDefinitionApi,
    ) {
    }

    ngOnInit(): void {
        this.activeRoute.data
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(
                (data) =>
                    (this.hasReferenceSolution$ = this.trainingDefinitionApi.hasReferenceSolution(
                        data[TRAINING_INSTANCE_DATA_ATTRIBUTE_NAME].trainingDefinition.id,
                    )),
            );
    }
}
