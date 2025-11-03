import { Component, Input } from '@angular/core';
import { RequestStageState } from '@crczp/sandbox-model';
import { MatIcon } from '@angular/material/icon';

@Component({
    selector: 'crczp-request-stage-state',
    templateUrl: './request-stage-state-indicator.component.html',
    styleUrls: ['./request-stage-state-indicator.component.scss'],
    imports: [MatIcon, MatIcon],
})
export class RequestStageStateIndicator {
    @Input() stageState: RequestStageState;
    protected readonly RequestStageState = RequestStageState;
}
