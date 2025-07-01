import { Component, Input } from '@angular/core';
import { FreeFormQuestion } from '@crczp/training-model';

@Component({
    selector: 'crczp-free-form-question-detail',
    templateUrl: './free-form-question-detail.component.html',
    styleUrls: ['./free-form-question-detail.component.css'],
})
export class FreeFormQuestionDetailComponent {
    @Input() question: FreeFormQuestion;
    @Input() isTest: boolean;
}
