import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { RequestStageState } from '@crczp/sandbox-model';
import { MatIcon } from '@angular/material/icon';

@Component({
    selector: 'crczp-request-stage-state',
    templateUrl: './request-stage-state-indicator.component.html',
    styleUrls: ['./request-stage-state-indicator.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MatIcon, DatePipe],
})
export class RequestStageStateIndicator {
    readonly stageState = input.required<RequestStageState>();
    readonly stopPending = input(false);
    readonly stopPendingSince = input<Date>();
    protected readonly RequestStageState = RequestStageState;
}
