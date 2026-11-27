import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {AssessmentLevel} from '@crczp/training-model';
import {TraineeQuestionComponent} from "./question/trainee-question.component";
import {MatDivider} from "@angular/material/divider";
import { MarkdownViewComponent } from '@crczp/markdown';

@Component({
    selector: 'crczp-assessment-level',
    templateUrl: './assessment-level.component.html',
    styleUrls: ['./assessment-level.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        TraineeQuestionComponent,
        MatDivider,
        MarkdownViewComponent
    ]
})
export class AssessmentLevelComponent {
    @Input() level: AssessmentLevel;
}
