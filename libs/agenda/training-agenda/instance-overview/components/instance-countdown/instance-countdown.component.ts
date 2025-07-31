import {
    Component,
    DestroyRef,
    inject,
    Input,
    OnInit,
    signal,
    WritableSignal,
} from '@angular/core';
import { TrainingInstance } from '@crczp/training-model';
import { timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIcon } from '@angular/material/icon';
import { Utils } from '@crczp/utils';

@Component({
    selector: 'crczp-instance-countdown',
    templateUrl: './instance-countdown.component.html',
    styleUrl: './instance-countdown.component.css',
    imports: [MatIcon],
})
export class InstanceCountdownComponent implements OnInit {
    static readonly EXPIRED_TEXT = 'expired';
    @Input() trainingInstance: TrainingInstance;
    timeToExpiration: WritableSignal<string> = signal('N/A');
    expired = signal(false);
    private readonly destroyRef = inject(DestroyRef);

    ngOnInit(): void {
        this.updateTime();
        timer(0, 1000)
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => this.updateTime());
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

    private updateTime() {
        const timeToExpire = Utils.Date.formatDurationSimple(
            this.trainingInstance.endTime.getTime()
        );
        if (timeToExpire.length === 0) {
            this.timeToExpiration.set(InstanceCountdownComponent.EXPIRED_TEXT);
            this.expired.set(true);
        } else {
            this.timeToExpiration.set(timeToExpire);
            this.expired.set(false);
        }
    }
}
