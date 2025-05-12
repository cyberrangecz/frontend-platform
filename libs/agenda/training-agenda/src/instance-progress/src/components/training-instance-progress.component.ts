import { ChangeDetectionStrategy, Component, DestroyRef, inject, Input, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TrainingInstance } from '@crczp/training-model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TRAINING_INSTANCE_DATA_ATTRIBUTE_NAME } from '../../../index';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Component displaying progress visualization
 */
@Component({
    selector: 'crczp-training-instance-progress',
    templateUrl: './training-instance-progress.component.html',
    styleUrls: ['./training-instance-progress.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingInstanceProgressComponent implements OnInit {
    @Input() trainingInstance$: Observable<TrainingInstance>;
    destroyRef = inject(DestroyRef);

    constructor(private activeRoute: ActivatedRoute) {
    }

    ngOnInit(): void {
        this.trainingInstance$ = this.activeRoute.data.pipe(
            takeUntilDestroyed(this.destroyRef),
            map((data) => data[TRAINING_INSTANCE_DATA_ATTRIBUTE_NAME]),
        );
    }
}
