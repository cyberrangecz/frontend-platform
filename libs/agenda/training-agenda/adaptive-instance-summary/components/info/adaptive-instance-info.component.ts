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
import {TrainingDefinition, TrainingInstance} from '@crczp/training-model';
import {SentinelControlItem, SentinelControlItemSignal, SentinelControlsComponent} from '@sentinel/components/controls';
import {Observable} from 'rxjs';
import {map} from 'rxjs/operators';
import {AdaptiveInstanceInfoControls} from '../../model/adaptive-instance-info-controls';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {MatIcon} from "@angular/material/icon";
import {DatePipe} from "@angular/common";
import {RouterLink} from "@angular/router";
import {MatButton} from "@angular/material/button";
import {CdkCopyToClipboard} from "@angular/cdk/clipboard";
import {MatTooltip} from "@angular/material/tooltip";

/**
 * Component for displaying basic info about selected training instance.
 */
@Component({
    selector: 'crczp-training-instance-info',
    templateUrl: './adaptive-instance-info.component.html',
    styleUrls: ['./adaptive-instance-info.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        SentinelControlsComponent,
        MatIcon,
        DatePipe,
        RouterLink,
        MatButton,
        CdkCopyToClipboard,
        MatTooltip,
    ]
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

    onInfoControlAction(control: SentinelControlItemSignal): void {
        control.result$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe();
    }

    onCopyToken(): void {
        this.showNotification.emit(['success', 'Access token has been copied']);
    }

    private initInfoComponent() {
        const disabled$ = this.hasStarted$.pipe(map((hasStated) => !hasStated));
        this.infoControls = AdaptiveInstanceInfoControls.create(this.showProgress, disabled$);
    }
}
