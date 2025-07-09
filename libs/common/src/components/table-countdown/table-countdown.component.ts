import {
    Component,
    DestroyRef,
    inject,
    Input,
    OnInit,
    signal,
    WritableSignal,
} from '@angular/core';
import { timer } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatIcon } from '@angular/material/icon';
import { DateUtils } from '../../utils/date-utils';

@Component({
    selector: 'crczp-table-countdown',
    templateUrl: './table-countdown.component.html',
    styleUrl: './table-countdown.component.css',
    imports: [MatIcon],
})
export class TableCountdownComponent implements OnInit {
    static readonly EXPIRED_TEXT = 'expired';
    @Input({ required: true }) endTime!: Date;
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
        const timeToExpire = DateUtils.formatDurationSimple(
            this.endTime.getTime()
        );
        if (timeToExpire.length === 0) {
            this.timeToExpiration.set(TableCountdownComponent.EXPIRED_TEXT);
            this.expired.set(true);
        } else {
            this.timeToExpiration.set(timeToExpire);
            this.expired.set(false);
        }
    }
}
