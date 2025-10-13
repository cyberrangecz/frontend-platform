import {Component, Input} from '@angular/core';
import {RequestStageState} from '@crczp/sandbox-model';
import {StageAdapter} from '../../../model/adapters/stage-adapter';
import {DatePipe} from "@angular/common";
import {MatIcon} from "@angular/material/icon";

@Component({
    selector: 'crczp-request-stage-header',
    templateUrl: './request-stage-header.component.html',
    styleUrls: ['./request-stage-header.component.scss'],
    imports: [
        MatIcon,
        DatePipe,
        MatIcon
    ]
})
export class RequestStageHeaderComponent {
    @Input() stage: StageAdapter;
    stageStates = RequestStageState;
}
