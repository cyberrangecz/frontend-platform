import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {QuestionAnswer, QuestionnairePhase, QuestionTypeEnum} from '@crczp/training-model';
import {MatCheckbox} from "@angular/material/checkbox";
import {SentinelMarkdownViewComponent} from "@sentinel/components/markdown-view";
import {MatFormField, MatInput, MatLabel} from "@angular/material/input";

@Component({
    selector: 'crczp-questionnaire-phase',
    templateUrl: './questionnaire-phase.component.html',
    styleUrls: ['./questionnaire-phase.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatCheckbox,
        MatLabel,
        MatFormField,
        SentinelMarkdownViewComponent,
        MatInput
    ]
})
export class QuestionnairePhaseComponent {
    @Input() phase: QuestionnairePhase;

    isSubmitted = false;
    isLoading = false;
    questionAnswers: QuestionAnswer[] = [];
    questionTypes = QuestionTypeEnum;
}
