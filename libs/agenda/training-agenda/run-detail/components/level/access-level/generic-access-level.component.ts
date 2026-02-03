import { combineLatest, of } from 'rxjs';
import { AbstractAccessLevelService } from '../../../services/training-run/level/access/abstract-access-level.service';
import { AbstractTrainingRunService } from '../../../services/training-run/abstract-training-run.service';
import { signal } from '@angular/core';
import { map } from 'rxjs/operators';

export abstract class GenericAccessLevelComponent {
    protected readonly of = of;

    protected readonly isLoading = signal(false);

    protected constructor(
        protected readonly runService: AbstractTrainingRunService,
        protected readonly accessLevelService: AbstractAccessLevelService,
    ) {
        combineLatest([
            this.runService.isLoading$,
            this.accessLevelService.isLoading$,
        ])
            .pipe(
                map(
                    ([isSubmittingAnswer, isLoadingLevel]) =>
                        isSubmittingAnswer || isLoadingLevel,
                ),
            )
            .subscribe((loading) => this.isLoading.set(loading));
    }

    /**
     * Calls service to check whether the passkey is correct
     */
    onAnswerSubmitted(answer: string): void {
        this.accessLevelService.submitAnswer(answer);
    }
}
