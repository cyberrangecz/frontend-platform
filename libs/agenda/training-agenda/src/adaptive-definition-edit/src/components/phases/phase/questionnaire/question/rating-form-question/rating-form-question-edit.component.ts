import { Component, DestroyRef, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { AdaptiveQuestion, QuestionnaireTypeEnum } from '@crczp/training-model';
import { QuestionFormGroup } from '../question-form-group';
import { AbstractControl, UntypedFormArray, UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { SentinelValidators } from '@sentinel/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Component({
    selector: 'crczp-rating-form-question-edit',
    templateUrl: './rating-form-question-edit.component.html',
    styleUrls: ['./rating-form-question-edit.component.css'],
})
/**
 * Component for editing a question of type Rating Form
 */
export class RatingFormQuestionEditComponent implements OnChanges {
    @Input() index: number;
    @Input() question: AdaptiveQuestion;
    @Input() required: boolean;
    @Input() questionnaireType: QuestionnaireTypeEnum;
    @Output() questionChange: EventEmitter<AdaptiveQuestion> = new EventEmitter();

    questionnaireTypes = QuestionnaireTypeEnum;
    ratingFormFormGroup: QuestionFormGroup;
    selectedRatingLevel: number;
    ratingLevelOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    destroyRef = inject(DestroyRef);

    get title(): AbstractControl {
        return this.ratingFormFormGroup.questionFormGroup.get('title');
    }

    get choices(): UntypedFormArray {
        return this.ratingFormFormGroup.questionFormGroup.get('choices') as UntypedFormArray;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('question' in changes) {
            this.ratingFormFormGroup = new QuestionFormGroup(this.question, this.questionnaireType);
            this.selectedRatingLevel = this.question.choices.length;
            this.choices.markAllAsTouched();
            this.ratingFormFormGroup.questionFormGroup.valueChanges
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(() => this.questionChanged());
        }
    }

    ratingLevelChanged(ratingLevel: number): void {
        const currentChoiceNum = this.choices.length;
        if (currentChoiceNum < ratingLevel) {
            for (let i = 0; i < ratingLevel - currentChoiceNum; i++) {
                this.createNewChoice((i + 1).toString());
            }
        } else if (currentChoiceNum > ratingLevel) {
            this.choices.patchValue(this.choices.controls.splice(ratingLevel, currentChoiceNum - ratingLevel));
        }
        this.questionChanged();
    }

    /**
     * Changes internal state of the component if question is changed and emits event to parent component
     */
    questionChanged(): void {
        this.ratingFormFormGroup.questionFormGroup.markAsDirty();
        this.ratingFormFormGroup.setToQuestion(this.question);
        this.questionChange.emit(this.question);
    }

    private createNewChoice(text: string): void {
        this.choices.push(
            new UntypedFormGroup({
                id: new UntypedFormControl(null),
                text: new UntypedFormControl(text, [SentinelValidators.noWhitespace, Validators.required]),
                correct: new UntypedFormControl(true),
                order: new UntypedFormControl(this.choices.length),
            }),
        );
    }
}
