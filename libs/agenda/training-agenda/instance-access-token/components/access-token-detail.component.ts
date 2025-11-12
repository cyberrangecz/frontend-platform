import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { TrainingInstance } from '@crczp/training-model';
import { Observable } from 'rxjs';
import { filter, map } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AsyncPipe, TitleCasePipe } from '@angular/common';

/**
 * Displays access token of training instance for presentational purposes (to display on projector etc.)
 */
@Component({
    selector: 'crczp-access-token-detail',
    templateUrl: './access-token-detail.component.html',
    styleUrls: ['./access-token-detail.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [AsyncPipe, TitleCasePipe],
})
export class AccessTokenDetailComponent {
    trainingInstance$: Observable<TrainingInstance>;
    private activeRoute = inject(ActivatedRoute);

    private readonly destroyRef = inject(DestroyRef);

    constructor() {
        this.trainingInstance$ = this.activeRoute.data.pipe(
            takeUntilDestroyed(this.destroyRef),
            filter((data) => !!data[TrainingInstance.name]),
            map((data) => data[TrainingInstance.name]),
        );
    }
}
