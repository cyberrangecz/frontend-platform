import { Component, Input } from '@angular/core';
import { RequestStageState } from '@crczp/sandbox-model';
import { StageAdapter } from 'libs/agenda/sandbox-agenda/request-detail/src/model/adapters/stage-adapter';

@Component({
    selector: 'crczp-request-stage-header',
    templateUrl: './request-stage-header.component.html',
    styleUrls: ['./request-stage-header.component.scss'],
})
export class RequestStageHeaderComponent {
    @Input() stage: StageAdapter;
    stageStates = RequestStageState;
}
