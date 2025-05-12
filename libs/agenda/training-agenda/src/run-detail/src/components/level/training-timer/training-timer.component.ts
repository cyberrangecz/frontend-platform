import { ChangeDetectionStrategy, Component, DestroyRef, inject, Input, OnChanges, SimpleChanges } from '@angular/core';
import { Observable, timer } from 'rxjs';
import { map } from 'rxjs/operators';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Component of training timer displaying time passed from start of the training
 */
@Component({
    selector: 'crczp-training-timer',
    templateUrl: './training-timer.component.html',
    styleUrls: ['./training-timer.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingTimerComponent implements OnChanges {
    @Input() startTime: Date;
    timeElapsed: Observable<number>;
    destroyRef = inject(DestroyRef);

    ngOnChanges(changes: SimpleChanges): void {
        if ('startTime' in changes) {
            this.startCounter();
        }
    }

    // Date pipe would overflow on hours > 24
    formatTime(time: number): string {
        const totalSeconds = Math.floor(time / 1000);
        const seconds = totalSeconds % 60;
        const minutes = Math.floor(totalSeconds / 60) % 60;
        const hours = Math.floor(totalSeconds / 3600);
        return `${hours}:${minutes < 10 ? '0' + minutes : minutes}:${seconds < 10 ? '0' + seconds : seconds}`;
    }

    private startCounter() {
        const period = 1000;
        this.timeElapsed = timer(0, period).pipe(
            takeUntilDestroyed(this.destroyRef),
            map(() => this.calculateElapsedTime()),
        );
    }

    private calculateElapsedTime(): number {
        return Date.now() - this.startTime.valueOf();
    }
}
