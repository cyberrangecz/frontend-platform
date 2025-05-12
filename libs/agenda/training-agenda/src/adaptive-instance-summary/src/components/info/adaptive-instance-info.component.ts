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
import { SentinelControlItem } from '@sentinel/components/controls';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AdaptiveInstanceInfoControls } from '../../model/adaptive-instance-info-controls';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Component for displaying basic info about selected training instance.
 */
@Component({
    selector: 'crczp-training-instance-info',
    templateUrl: './adaptive-instance-info.component.html',
    styleUrls: ['./adaptive-instance-info.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AdaptiveInstanceInfoComponent implements OnInit, OnChanges {
    @Input() trainingInstance: TrainingInstance;
    @Input() accessTokenLink: string;
    @Input() poolIdLink: string;
    @Input() adaptiveDefinitionLink: string;
    @Input() hasStarted$: Observable<boolean>;

    @Output() showProgress: EventEmitter<boolean> = new EventEmitter();
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
        this.infoControls = AdaptiveInstanceInfoControls.create(this.showProgress, disabled$);
    }

    onCopyToken(): void {
        this.showNotification.emit(['success', 'Access token has been copied']);
    }
}
