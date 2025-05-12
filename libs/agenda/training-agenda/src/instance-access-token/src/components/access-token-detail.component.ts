import { ChangeDetectionStrategy, Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TrainingInstance } from '@crczp/training-model';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { TRAINING_INSTANCE_DATA_ATTRIBUTE_NAME } from '../../../index';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Displays access token of training instance for presentational purposes (to display on projector etc.)
 */
@Component({
    selector: 'crczp-access-token-detail',
    templateUrl: './access-token-detail.component.html',
    styleUrls: ['./access-token-detail.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AccessTokenDetailComponent {
    trainingInstance$: Observable<TrainingInstance>;

    constructor(private activeRoute: ActivatedRoute) {
        this.trainingInstance$ = this.activeRoute.data.pipe(
            takeUntilDestroyed(),
            map((data) => data[TRAINING_INSTANCE_DATA_ATTRIBUTE_NAME]),
        );
    }
}
