import { Observable, of } from 'rxjs';
import { AbstractAccessLevelService } from '../../../services/training-run/level/access/abstract-access-level.service';
import { map } from 'rxjs/operators';
import { AccessLevel } from '@crczp/training-model';
import { AbstractTrainingRunService } from '../../../services/training-run/abstract-training-run.service';

export abstract class GenericAccessLevelComponent {
    protected readonly of = of;

    protected constructor(
        protected readonly runService: AbstractTrainingRunService,
        protected readonly accessLevelService: AbstractAccessLevelService,
    ) {}

    protected get levelContent$(): Observable<string> {
        return this.runService.runInfo$.pipe(
            map((runInfo) => {
                if (runInfo.localEnvironment) {
                    return (runInfo.currentLevel as AccessLevel).localContent;
                }
                return (runInfo.currentLevel as AccessLevel).cloudContent;
            }),
        );
    }

    /**
     * Calls service to check whether the passkey is correct
     */
    onAnswerSubmitted(answer: string): void {
        this.accessLevelService.submitAnswer(answer);
    }
}
