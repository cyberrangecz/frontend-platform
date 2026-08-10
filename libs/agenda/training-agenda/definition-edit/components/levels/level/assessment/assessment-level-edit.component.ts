import {
    ChangeDetectionStrategy,
    Component,
    DestroyRef,
    EventEmitter,
    inject,
    Input,
    OnChanges,
    Output,
    SimpleChanges,
} from '@angular/core';
import {AssessmentLevel, Question} from '@crczp/training-model';
import {AssessmentLevelEditFormGroup} from './assessment-level-edit-form-group';
import {AbstractControl, ReactiveFormsModule} from '@angular/forms';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {Subscription} from 'rxjs';
import {QuestionsOverviewComponent} from "./question/overview/questions-overview.component";
import {MatSlideToggle} from "@angular/material/slide-toggle";
import {SentinelMarkdownEditorComponent} from "@sentinel/components/markdown-editor";
import {MatError, MatFormField, MatInput, MatLabel, MatSuffix} from "@angular/material/input";
import {MatTooltip} from "@angular/material/tooltip";
import { ClearInputSuffixComponent } from '@crczp/utils';

/**
 * Component for editing new or existing assessment level
 */
@Component({
    selector: 'crczp-assessment-level-configuration',
    templateUrl: './assessment-level-edit.component.html',
    styleUrls: ['./assessment-level-edit.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        ClearInputSuffixComponent,
        QuestionsOverviewComponent,
        MatSlideToggle,
        MatTooltip,
        SentinelMarkdownEditorComponent,
        MatError,
        MatInput,
        MatLabel,
        MatFormField,
        ReactiveFormsModule,
        MatSuffix
    ]
})
export class AssessmentLevelEditComponent implements OnChanges {
    @Input() level: AssessmentLevel;
    @Output() levelChange: EventEmitter<AssessmentLevel> = new EventEmitter();
    assessmentFormGroup: AssessmentLevelEditFormGroup;
    destroyRef = inject(DestroyRef);
    private formGroupValueChangesSubscription?: Subscription;

    get title(): AbstractControl {
        return this.assessmentFormGroup.formGroup.get('title');
    }

    get instructions(): AbstractControl {
        return this.assessmentFormGroup.formGroup.get('instructions');
    }

    get isTest(): AbstractControl {
        return this.assessmentFormGroup.formGroup.get('isTest');
    }

    get estimatedDuration(): AbstractControl {
        return this.assessmentFormGroup.formGroup.get('estimatedDuration');
    }

    get minimalPossibleSolveTime(): AbstractControl {
        return this.assessmentFormGroup.formGroup.get('minimalPossibleSolveTime');
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('level' in changes) {
            this.assessmentFormGroup = new AssessmentLevelEditFormGroup(this.level);
            this.title.markAsTouched();
            this.estimatedDuration.markAsTouched();
            this.formGroupValueChangesSubscription?.unsubscribe();
            this.formGroupValueChangesSubscription = this.assessmentFormGroup.formGroup.valueChanges
                .pipe(takeUntilDestroyed(this.destroyRef))
                .subscribe(() => {
                    this.assessmentFormGroup.setToLevel(this.level);
                    this.levelChange.emit(this.level);
                });
        }
    }

    /**
     * Changes internal state of the component and emits change event to parent component
     * @param questions new state of changed questions
     */
    onQuestionsChanged(questions: Question[]): void {
        this.level.questions = questions;
        this.assessmentFormGroup.setToLevel(this.level);
        this.levelChange.emit(this.level);
    }
}
