import {ChangeDetectionStrategy, Component, Input, OnInit} from '@angular/core';
import {ExtendedMatchingItems, FreeFormQuestion, MultipleChoiceQuestion, Question} from '@crczp/training-model';
import {FreeFormQuestionTraineeComponent} from "./free-form-question/free-form-question-trainee.component";
import {
    MultipleChoiceQuestionTraineeComponent
} from "./multiple-choice-question/multiple-choice-question-trainee.component";
import {
    ExtendedMatchingItemsTraineeComponent
} from "./extended-matching-items/extended-matching-items-trainee.component";

@Component({
    selector: 'crczp-trainee-question',
    templateUrl: './trainee-question.component.html',
    styleUrls: ['./trainee-question.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        FreeFormQuestionTraineeComponent,
        MultipleChoiceQuestionTraineeComponent,
        ExtendedMatchingItemsTraineeComponent
    ]
})
/**
 * Wrapper component for displaying questions in training run's assessment level. It selects the correct component to
 * display based on the question type.
 */
export class TraineeQuestionComponent implements OnInit {
    @Input() question: Question;
    @Input() index: number;

    isEmi = false;
    isFfq = false;
    isMcq = false;

    ngOnInit(): void {
        this.resolveQuestionType();
    }

    /**
     * Resolves type of question to create appropriate child component
     */
    private resolveQuestionType() {
        this.isEmi = this.question instanceof ExtendedMatchingItems;
        this.isFfq = this.question instanceof FreeFormQuestion;
        this.isMcq = this.question instanceof MultipleChoiceQuestion;
    }
}
