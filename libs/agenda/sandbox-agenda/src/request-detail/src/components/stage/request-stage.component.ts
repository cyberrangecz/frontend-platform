/* eslint-disable @angular-eslint/no-output-on-prefix */
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { StageAdapter } from '../../model/adapters/stage-adapter';

/**
 * Component of request stage basic info
 */
@Component({
    selector: 'crczp-request-stage',
    templateUrl: './request-stage.component.html',
    styleUrls: ['./request-stage.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class RequestStageComponent {
    @Input() stage: StageAdapter;
    @Output() stageDetailPanelChange: EventEmitter<boolean> = new EventEmitter<boolean>();

    onPanelStateChange(opened: boolean): void {
        this.stageDetailPanelChange.emit(opened);
    }
}
