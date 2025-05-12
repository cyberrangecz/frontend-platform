import { Component, DestroyRef, inject, Input, OnInit, signal, WritableSignal } from '@angular/core';
import { TrainingInstance } from '@crczp/training-model';
import { DateHelper } from '@crczp/training-agenda/internal';
import { timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'crczp-instance-countdown',
    templateUrl: './instance-countdown.component.html',
    styleUrl: './instance-countdown.component.css',
})
export class InstanceCountdownComponent implements OnInit {
    @Input() trainingInstance: TrainingInstance;

    static readonly EXPIRED_TEXT = 'expired';
    private readonly destroyRef = inject(DestroyRef);

    timeToExpiration: WritableSignal<string> = signal('N/A');
    expired = signal(false);

    ngOnInit(): void {
        this.updateTime();
        timer(0, 1000)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.updateTime());
    }

    private updateTime() {
        const timeToExpire = DateHelper.formatDurationSimple(this.trainingInstance.endTime);
        if (timeToExpire.length === 0) {
            this.timeToExpiration.set(InstanceCountdownComponent.EXPIRED_TEXT);
            this.expired.set(true);
        } else {
            this.timeToExpiration.set(timeToExpire);
            this.expired.set(false);
        }
    }

    protected getNumberPart(): string {
        const match = this.timeToExpiration().match(new RegExp('^[0-9]*', 'i'));
        if (match) {
            return match[0];
        }
        return '';
    }

    protected getStringPart(): string {
        const numberPart = this.getNumberPart();
        return this.timeToExpiration().substring(numberPart.length);
    }
}
