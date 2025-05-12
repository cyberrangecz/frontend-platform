import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    EventEmitter,
    inject,
    Input,
    OnChanges,
    OnInit,
    Output,
    SimpleChanges,
} from '@angular/core';
import { TrainingDefinition, TrainingInstance } from '@crczp/training-model';
import { Observable } from 'rxjs';
import { SentinelControlItem } from '@sentinel/components/controls';
import { map } from 'rxjs/operators';
import { TrainingInstanceInfoControls } from '../../model/training-instance-info-controls';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Component for displaying basic info about selected training instance.
 */
@Component({
    selector: 'crczp-training-instance-info',
    templateUrl: './training-instance-info.component.html',
    styleUrls: ['./training-instance-info.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingInstanceInfoComponent implements OnInit, OnChanges {
    @Input() trainingInstance: TrainingInstance;
    @Input() accessTokenLink: string;
    @Input() poolIdLink: string;
    @Input() trainingDefinitionLink: string;
    @Input() hasStarted$: Observable<boolean>;

    @Output() showProgress: EventEmitter<boolean> = new EventEmitter();
    @Output() showResults: EventEmitter<boolean> = new EventEmitter();
    @Output() showAggregatedResults: EventEmitter<boolean> = new EventEmitter();
    @Output() showCheatingDetection: EventEmitter<boolean> = new EventEmitter();
    @Output() exportScore: EventEmitter<boolean> = new EventEmitter();
    @Output() showNotification: EventEmitter<string[]> = new EventEmitter();

    trainingDefinition: TrainingDefinition;
    infoControls: SentinelControlItem[];
    destroyRef = inject(DestroyRef);

    ngOnInit(): void {
        this.initInfoComponent();
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('trainingInstance' in changes && this.trainingInstance) {
            this.trainingDefinition = this.trainingInstance.trainingDefinition;
        }
    }

    onInfoControlAction(control: SentinelControlItem): void {
        control.result$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }

    private initInfoComponent() {
        const disabled$ = this.hasStarted$.pipe(map((hasStated) => !hasStated));
        this.infoControls = TrainingInstanceInfoControls.create(
            this.showProgress,
            this.showResults,
            this.showAggregatedResults,
            this.showCheatingDetection,
            this.exportScore,
            disabled$,
        );
    }

    onCopyToken(): void {
        this.showNotification.emit(['success', 'Access token has been copied']);
    }
}
