import {ChangeDetectionStrategy, Component, Input} from '@angular/core';
import {AdaptiveQuestion, QuestionTypeEnum} from '@crczp/training-model';
import {MatExpansionPanel, MatExpansionPanelHeader, MatExpansionPanelTitle} from "@angular/material/expansion";

import {MatIcon} from "@angular/material/icon";

/**
 * Main hint edit component. Contains stepper to navigate through existing hints and controls to create new hints
 */
@Component({
    selector: 'crczp-related-questions',
    templateUrl: './related-questions.component.html',
    styleUrls: ['./related-questions.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatIcon,
    MatIcon
]
})
export class RelatedQuestionsComponent {
    @Input() relatedQuestions: AdaptiveQuestion[];
    questionTypes = QuestionTypeEnum;
}
