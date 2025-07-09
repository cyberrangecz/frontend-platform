import {Component, DestroyRef, EventEmitter, inject, Input, OnChanges, Output, SimpleChanges} from '@angular/core';
import {AdaptiveQuestion, QuestionnaireTypeEnum} from '@crczp/training-model';
import {SentinelValidators} from '@sentinel/common';
import {
    AbstractControl,
    ReactiveFormsModule,
    UntypedFormArray,
    UntypedFormControl,
    UntypedFormGroup,
    Validators
} from '@angular/forms';
import {QuestionFormGroup} from '../question-form-group';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {SentinelMarkdownEditorComponent} from "@sentinel/components/markdown-editor";

import {MatError, MatFormField, MatInput, MatLabel, MatSuffix} from "@angular/material/input";
import {MatIcon} from "@angular/material/icon";
import {MatButton, MatIconButton} from "@angular/material/button";
import {MatTooltip} from "@angular/material/tooltip";
import {MatCheckbox} from "@angular/material/checkbox";

@Component({
    selector: 'crczp-adaptive-multiple-choice-question-edit',
    templateUrl: './multiple-choice-question-edit.component.html',
    styleUrls: ['./multiple-choice-question-edit.component.css'],
    imports: [
        SentinelMarkdownEditorComponent,
        MatError,
        MatIcon,
        MatSuffix,
        MatIconButton,
        MatTooltip,
        ReactiveFormsModule,
        MatCheckbox,
        MatFormField,
        MatLabel,
        MatButton,
        MatInput
    ]
})
/**
 * Component for editing a question of type Multiple Choice
 */
export class MultipleChoiceQuestionEditComponent implements OnChanges {
    @Input() index: number;
    @Input() question: AdaptiveQuestion;
    @Input() required: boolean;
    @Input() questionnaireType: QuestionnaireTypeEnum;
    @Output() questionChange: EventEmitter<AdaptiveQuestion> = new EventEmitter();

    questionnaireTypes = QuestionnaireTypeEnum;
    multipleChoicesFormGroup: QuestionFormGroup;
    destroyRef = inject(DestroyRef);

    get title(): AbstractControl {
        return this.multipleChoicesFormGroup.questionFormGroup.get('title');
    }

    get choices(): UntypedFormArray {
        return this.multipleChoicesFormGroup.questionFormGroup.get('choices') as UntypedFormArray;
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('question' in changes) {
            this.multipleChoicesFormGroup = new QuestionFormGroup(this.question, this.questionnaireType);
            this.choices.markAllAsTouched();
            this.multipleChoicesFormGroup.questionFormGroup.valueChanges
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(() => this.questionChanged());
        }
    }

    addOption(): void {
        this.choices.push(
            new UntypedFormGroup({
                id: new UntypedFormControl(null),
                text: new UntypedFormControl('new Option', [SentinelValidators.noWhitespace, Validators.required]),
                correct: new UntypedFormControl(true),
                order: new UntypedFormControl(this.choices.length),
            }),
        );

        this.questionChanged();
    }

    deleteOption(optionIndex: number): void {
        this.choices.removeAt(optionIndex);
        this.choices.controls
            .slice(optionIndex)
            .forEach((choice) => choice.get('order').setValue(choice.get('order').value - 1));
        this.questionChanged();
    }

    /**
     * Changes internal state of the component if question is changed and emits event to parent component
     */
    questionChanged(): void {
        this.multipleChoicesFormGroup.questionFormGroup.markAsDirty();
        this.multipleChoicesFormGroup.setToQuestion(this.question);
        this.questionChange.emit(this.question);
    }
}
