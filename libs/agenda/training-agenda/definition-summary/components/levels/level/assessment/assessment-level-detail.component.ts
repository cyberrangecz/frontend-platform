import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {AssessmentLevel, AssessmentTypeEnum} from '@crczp/training-model';
import {AbstractQuestionComponent} from "./abstract-question/abstract-question.component";
import {MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle} from "@angular/material/expansion";
import {MatIcon} from "@angular/material/icon";
import {MatTooltip} from "@angular/material/tooltip";

@Component({
    selector: 'crczp-assessment-level-detail',
    templateUrl: './assessment-level-detail.component.html',
    styleUrls: ['./assessment-level-detail.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        AbstractQuestionComponent,
        MatIcon,
        MatExpansionPanelTitle,
        MatExpansionPanelHeader,
        MatExpansionPanel,
        MatTooltip
    ]
})
export class AssessmentLevelDetailComponent {
    @Input() level: AssessmentLevel;

    isTest(): boolean {
        return this.level.assessmentType === AssessmentTypeEnum.Test;
    }
}
