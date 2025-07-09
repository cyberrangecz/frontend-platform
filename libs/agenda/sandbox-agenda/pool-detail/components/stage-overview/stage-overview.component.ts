import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from '@angular/core';
import {RequestStageState} from '@crczp/sandbox-model';
import {SelectedStage} from '../../model/selected-stage';
import {MatRipple} from "@angular/material/core";
import {MatIcon} from "@angular/material/icon";
import {NgClass} from "@angular/common";
import {MatTooltip} from "@angular/material/tooltip";

@Component({
    selector: 'crczp-stage-overview',
    templateUrl: './stage-overview.component.html',
    styleUrls: ['./stage-overview.component.scss'],
    imports: [
        MatRipple,
        MatIcon,
        MatTooltip,
        NgClass
    ]
})
export class StageOverviewComponent implements OnChanges {
    @Input() stages: string[];
    @Input() unitId: number;
    @Output() stageSelected: EventEmitter<SelectedStage> = new EventEmitter();

    ngOnChanges(changes: SimpleChanges): void {
        if (changes.stages) {
            if (this.stages.find((stage) => stage === 'Failed') !== undefined) {
                this.stages.push('Retry');
            }
        }
    }

    stageIconResolver(stage: string): string {
        switch (stage) {
            case RequestStageState.RUNNING:
                return 'incomplete_circle';
            case RequestStageState.FINISHED:
                return 'check';
            case RequestStageState.FAILED:
                return 'close';
            case RequestStageState.IN_QUEUE:
                return 'pause';
            case RequestStageState.RETRY:
                return 'cached';
            default:
                return '';
        }
    }

    stageSelect(stage: string, order: number): void {
        this.stageSelected.emit(new SelectedStage(this.unitId, stage, order));
    }
}
