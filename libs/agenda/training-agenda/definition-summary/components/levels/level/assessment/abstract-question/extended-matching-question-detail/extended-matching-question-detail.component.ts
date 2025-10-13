import {Component, Input} from '@angular/core';
import {ExtendedMatchingItems} from '@crczp/training-model';
import {MatIcon} from "@angular/material/icon";
import {MatTooltip} from "@angular/material/tooltip";

@Component({
    selector: 'crczp-extended-matching-question-detail',
    templateUrl: './extended-matching-question-detail.component.html',
    styleUrls: ['./extended-matching-question-detail.component.css'],
    imports: [
        MatIcon,
        MatTooltip
    ]
})
export class ExtendedMatchingQuestionDetailComponent {
    @Input() question: ExtendedMatchingItems;
    @Input() isTest: boolean;
}
