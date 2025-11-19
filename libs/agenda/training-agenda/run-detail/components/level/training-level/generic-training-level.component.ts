import { DestroyRef } from '@angular/core';
import { Observable, of, skipWhile, switchMap } from 'rxjs';
import { filter, map, take } from 'rxjs/operators';
import { Hint, TrainingLevel, TrainingPhase } from '@crczp/training-model';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractTrainingRunService } from '../../../services/training-run/abstract-training-run.service';
import { AbstractTrainingLevelService } from '../../../services/training-run/level/access/training/abstract-training-level.service';

export abstract class GenericTrainingLevelComponent {
    isLoading$: Observable<boolean>;
    protected readonly of = of;
    private shouldScrollAfterViewCheck = false;

    protected constructor(
        protected readonly runService: AbstractTrainingRunService,
        protected readonly trainingLevelService: AbstractTrainingLevelService,
        protected readonly destroyRef: DestroyRef,
    ) {
        this.registerViewCheckHook(() => {
            if (this.shouldScrollAfterViewCheck) {
                this.scrollToBottom();
                this.shouldScrollAfterViewCheck = false;
            }
        });
    }

    abstract get hints$(): Observable<Hint[]>;
    abstract get levelContent$(): Observable<string>;

    get isSolutionRevealed$(): Observable<boolean> {
        return this.runService.runInfo$
            .observeProperty()
            .displayedLevel.$()
            .pipe(
                map(
                    (level) =>
                        (level instanceof TrainingLevel &&
                            (level as TrainingLevel).solutionRevealed()) ||
                        (level instanceof TrainingPhase &&
                            (level as TrainingPhase).solutionRevealed()),
                ),
            );
    }

    get solutionContent$(): Observable<string> {
        return this.isSolutionRevealed$.pipe(
            skipWhile((isRevealed) => !isRevealed),
            switchMap(() =>
                this.runService.runInfo$
                    .observeProperty()
                    .displayedLevel.$()
                    .pipe(
                        map((level) => {
                            if (level instanceof TrainingLevel) {
                                return (level as TrainingLevel).solution;
                            } else if (level instanceof TrainingPhase) {
                                return (level as TrainingPhase).currentTask
                                    .solution;
                            } else {
                                return '';
                            }
                        }),
                    ),
            ),
        );
    }

    onAnswerSubmitted(answer: string): void {
        this.trainingLevelService.submitAnswer(answer);
    }

    abstract revealHint(hint: Hint): void;

    revealSolution(): void {
        this.isSolutionRevealed$
            .pipe(
                filter((isRevealed) => isRevealed),
                take(1),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe(() => {
                this.shouldScrollAfterViewCheck = true;
            });
        this.trainingLevelService.revealSolution();
    }

    abstract registerViewCheckHook(viewCheckHook: () => void): void;

    private scrollToBottom(): void {
        window.scrollTo({
            left: 0,
            top: document.body.scrollHeight,
            behavior: 'smooth',
        });
    }
}
