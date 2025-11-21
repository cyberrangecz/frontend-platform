import { of } from 'rxjs';
import { AbstractAccessLevelService } from '../../../services/training-run/level/access/abstract-access-level.service';
import { AbstractTrainingRunService } from '../../../services/training-run/abstract-training-run.service';

export abstract class GenericAccessLevelComponent {
    protected readonly of = of;

    protected constructor(
        protected readonly runService: AbstractTrainingRunService,
        protected readonly accessLevelService: AbstractAccessLevelService,
    ) {}

    /**
     * Calls service to check whether the passkey is correct
     */
    onAnswerSubmitted(answer: string): void {
        this.accessLevelService.submitAnswer(answer);
    }
}
