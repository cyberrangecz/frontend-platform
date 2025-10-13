import {Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {ExtendedMatchingItems, FreeFormQuestion, MultipleChoiceQuestion, Question} from '@crczp/training-model';
import {FreeFormQuestionDetailComponent} from "./free-form-question-detail/free-form-question-detail.component";
import {
    MultipleChoiceQuestionDetailComponent
} from "./multiple-choice-question-detail/multiple-choice-question-detail.component";
import {
    ExtendedMatchingQuestionDetailComponent
} from "./extended-matching-question-detail/extended-matching-question-detail.component";

@Component({
    selector: 'crczp-question-detail',
    templateUrl: './abstract-question.component.html',
    styleUrls: ['./abstract-question.component.css'],
    imports: [
        FreeFormQuestionDetailComponent,
        MultipleChoiceQuestionDetailComponent,
        ExtendedMatchingQuestionDetailComponent
    ]
})
export class AbstractQuestionComponent implements OnChanges {
    @Input() question: Question;
    @Input() isTest: boolean;

    isFfq = false;
    isMcq = false;
    isEmi = false;

    freeFormQuestion = FreeFormQuestion;
    multipleChoiceQuestion = MultipleChoiceQuestion;
    extendedMatchingItems = ExtendedMatchingItems;

    ngOnChanges(changes: SimpleChanges): void {
        if ('question' in changes) {
            this.resolveQuestionType();
        }
    }

    private resolveQuestionType() {
        this.isFfq = this.question instanceof FreeFormQuestion;
        this.isEmi = this.question instanceof ExtendedMatchingItems;
        this.isMcq = this.question instanceof MultipleChoiceQuestion;
    }
}
