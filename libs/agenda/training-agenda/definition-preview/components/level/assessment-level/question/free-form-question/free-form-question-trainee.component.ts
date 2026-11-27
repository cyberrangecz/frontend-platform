import {ChangeDetectionStrategy, Component, inject, Input, OnInit, WritableSignal} from '@angular/core';
import {FreeFormQuestion} from '@crczp/training-model';
import {MatIconButton} from "@angular/material/button";
import {FormsModule} from "@angular/forms";
import {MatFormField, MatInput, MatLabel, MatSuffix} from "@angular/material/input";
import { MarkdownViewComponent } from '@crczp/markdown';
import {MatIcon} from "@angular/material/icon";
import {PreviewAnswerStore} from '../preview-answer-store';

@Component({
    selector: 'crczp-trainee-free-form-question',
    templateUrl: './free-form-question-trainee.component.html',
    styleUrls: ['./free-form-question-trainee.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatIcon,
        MatSuffix,
        MatIconButton,
        FormsModule,
        MatInput,
        MatLabel,
        MatFormField,
        MarkdownViewComponent
    ]
})
/**
 * Component displaying FFQ type of question in the assessment level of a trainees training run.
 * If assessment is type of test or question is required, user needs to answer it, otherwise it is optional.
 */
export class FreeFormQuestionTraineeComponent implements OnInit {
    @Input() question: FreeFormQuestion;
    @Input() index: number;

    answer: WritableSignal<string>;
    private readonly answerStore = inject(PreviewAnswerStore);

    ngOnInit(): void {
        this.answer = this.answerStore.answerOf(this.question, '');
    }
}
