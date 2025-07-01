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
import {TaskEditFormGroup} from './task-edit-form-group';
import {AbstractControl, ReactiveFormsModule} from '@angular/forms';
import {takeUntilDestroyed} from '@angular/core/rxjs-interop';
import {MatSlideToggle} from "@angular/material/slide-toggle";
import {MatError, MatFormField, MatHint, MatInput, MatLabel, MatSuffix} from "@angular/material/input";
import {MatIcon} from "@angular/material/icon";
import {MatIconButton} from "@angular/material/button";
import {SentinelMarkdownEditorComponent} from "@sentinel/components/markdown-editor";
import {NgIf} from "@angular/common";
import {AdaptiveTask} from "@crczp/training-model";

@Component({
    selector: 'crczp-task-configuration',
    templateUrl: './task-edit.component.html',
    styleUrls: ['./task-edit.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatSlideToggle,
        MatError,
        MatHint,
        MatIcon,
        MatIconButton,
        MatSuffix,
        ReactiveFormsModule,
        MatInput,
        MatFormField,
        SentinelMarkdownEditorComponent,
        NgIf,
        MatLabel
    ]
})
export class TaskEditComponent implements OnChanges {
    @Input() task: AdaptiveTask;
    @Output() taskChange: EventEmitter<AdaptiveTask> = new EventEmitter();

    taskConfigFormGroup: TaskEditFormGroup;
    destroyRef = inject(DestroyRef);

    get title(): AbstractControl {
        return this.taskConfigFormGroup.formGroup.get('title');
    }

    get answer(): AbstractControl {
        return this.taskConfigFormGroup.formGroup.get('answer');
    }

    get solution(): AbstractControl {
        return this.taskConfigFormGroup.formGroup.get('solution');
    }

    get content(): AbstractControl {
        return this.taskConfigFormGroup.formGroup.get('content');
    }

    get incorrectAnswerLimit(): AbstractControl {
        return this.taskConfigFormGroup.formGroup.get('incorrectAnswerLimit');
    }

    get modifySandbox(): AbstractControl {
        return this.taskConfigFormGroup.formGroup.get('modifySandbox');
    }

    ngOnChanges(changes: SimpleChanges): void {
        if ('task' in changes) {
            this.taskConfigFormGroup = new TaskEditFormGroup(this.task);
            this.markFormsAsTouched();
            this.taskConfigFormGroup.formGroup.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
                this.taskConfigFormGroup.setToTask(this.task);
                this.taskChange.emit(this.task);
            });
        }
    }

    private markFormsAsTouched(): void {
        this.title.markAsTouched();
        this.incorrectAnswerLimit.markAsTouched();
        this.answer.markAsTouched();
    }
}
