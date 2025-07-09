import {Component, EventEmitter, Input, OnChanges, Output, SimpleChanges} from '@angular/core';
import {CheatingDetectionStateEnum} from '@crczp/training-model';
import {SelectedStage} from '../../model/selected-stage';
import {MatIcon} from "@angular/material/icon";
import {MatTooltip} from "@angular/material/tooltip";
import {MatRipple} from "@angular/material/core";
import {NgClass} from "@angular/common";

@Component({
    selector: 'crczp-stage-overview',
    templateUrl: './stage-overview.component.html',
    styleUrls: ['./stage-overview.component.scss'],
    imports: [
        MatIcon,
        MatTooltip,
        MatRipple,
        NgClass
    ]
})
export class StageOverviewComponent implements OnChanges {
    @Input() stages;
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
        const splitted = stage.split(':', 2)[1].trim().split(' ')[0];
        switch (splitted) {
            case CheatingDetectionStateEnum.Queued:
                return 'pause';
            case CheatingDetectionStateEnum.Finished:
                return 'check';
            case CheatingDetectionStateEnum.Disabled:
                return 'block';
            case CheatingDetectionStateEnum.Running:
                return 'incomplete_circle';
            default:
                return '';
        }
    }

    stageSelect(stage, order): void {
        this.stageSelected.emit(new SelectedStage(this.unitId, stage, order));
    }
}
