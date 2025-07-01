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
import { AssessmentLevel, Question } from '@crczp/training-model';
import { AssessmentLevelEditFormGroup } from './assessment-level-edit-form-group';
import { AbstractControl } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

/**
 * Component for editing new or existing assessment level
 */
@Component({
    selector: 'crczp-assessment-level-configuration',
    templateUrl: './assessment-level-edit.component.html',
    styleUrls: ['./assessment-level-edit.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AssessmentLevelEditComponent implements OnChanges {
    @Input() level: AssessmentLevel;
    @Output() levelChange: EventEmitter<AssessmentLevel> = new EventEmitter();
    assessmentFormGroup: AssessmentLevelEditFormGroup;
    destroyRef = inject(DestroyRef);

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
            this.assessmentFormGroup.formGroup.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
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
