import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {AssessmentLevel} from '@crczp/training-model';
import {TraineeQuestionComponent} from "./question/trainee-question.component";
import {MatDivider} from "@angular/material/divider";
import {SentinelMarkdownViewComponent} from "@sentinel/components/markdown-view";

@Component({
    selector: 'crczp-assessment-level',
    templateUrl: './assessment-level.component.html',
    styleUrls: ['./assessment-level.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        TraineeQuestionComponent,
        MatDivider,
        SentinelMarkdownViewComponent
    ]
})
export class AssessmentLevelComponent {
    @Input() level: AssessmentLevel;
}
