import {Component, Input} from '@angular/core';
import {MultipleChoiceQuestion} from '@crczp/training-model';
import {MatIcon} from "@angular/material/icon";
import {MatTooltip} from "@angular/material/tooltip";

@Component({
    selector: 'crczp-multiple-choice-question-detail',
    templateUrl: './multiple-choice-question-detail.component.html',
    styleUrls: ['./multiple-choice-question-detail.component.css'],
    imports: [
        MatIcon,
        MatTooltip
    ]
})
export class MultipleChoiceQuestionDetailComponent {
    @Input() question: MultipleChoiceQuestion;
    @Input() isTest: boolean;
}
