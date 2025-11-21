import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    inject,
    OnInit,
    signal,
} from '@angular/core';
import { SentinelUser } from '@sentinel/layout';
import { SentinelAuthService } from '@sentinel/auth';
import { AbstractTrainingRunService } from '../services/training-run/abstract-training-run.service';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AbstractLevelComponent } from './level/abstract-level.component';
import { SentinelStepperComponent } from '@sentinel/components/stepper';
import { isLoading } from '@sentinel/common/utils';
import { AsyncPipe } from '@angular/common';
import { SshAccessService } from '../services/training-run/ssh/ssh-acess.service';
import { tap } from 'rxjs/operators';

@Component({
    selector: 'crczp-training-run',
    templateUrl: './training-run.component.html',
    styleUrls: ['./training-run.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [AbstractLevelComponent, SentinelStepperComponent, AsyncPipe],
    providers: [SshAccessService],
})
/**
 * Main component of trainees training. Displays window with current level of a training and navigation to the next.
 * Optionally displays stepper with progress of the training and timer counting time from the start of a training.
 */
export class TrainingRunComponent implements OnInit {
    readonly user = signal<SentinelUser>(undefined);

    protected readonly shouldHideActiveLevel = signal<boolean>(false);
    protected readonly isLoading = isLoading;
    protected readonly trainingRunService = inject(AbstractTrainingRunService);
    protected readonly sshAccessService = inject(SshAccessService);
    private readonly destroyRef = inject(DestroyRef);
    private auth = inject(SentinelAuthService);

    ngOnInit(): void {
        this.auth.activeUser$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe((user) => this.user.set(user));

        this.trainingRunService.runInfo$
            .observeProperty()
            .isBacktracked.$()
            .subscribe((shouldHide) =>
                this.shouldHideActiveLevel.set(shouldHide),
            );
    }

    /**
     * Jump to training run level.
     * @param index of desired level
     */
    activeStepChanged(index: number): void {
        this.trainingRunService.displayLevelByOrder(index);
    }

    protected onAccessFileRequested() {
        this.sshAccessService.getAccessFile(
            this.trainingRunService.runInfo.sandboxInstanceId,
        );
    }
}
