import {Component, Input, ChangeDetectionStrategy} from '@angular/core';
import {FreeFormQuestion} from '@crczp/training-model';
import {MatIcon} from "@angular/material/icon";
import {MatTooltip} from "@angular/material/tooltip";

@Component({
    selector: 'crczp-free-form-question-detail',
    templateUrl: './free-form-question-detail.component.html',
    styleUrls: ['./free-form-question-detail.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatIcon,
        MatTooltip
    ]
})
export class FreeFormQuestionDetailComponent {
    @Input() question: FreeFormQuestion;
    @Input() isTest: boolean;
}
