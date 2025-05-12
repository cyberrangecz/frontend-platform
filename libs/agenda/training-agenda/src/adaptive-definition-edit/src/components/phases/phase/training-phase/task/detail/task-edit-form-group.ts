import { UntypedFormControl, UntypedFormGroup, Validators } from '@angular/forms';
import { Task } from '@crczp/training-model';

export class TaskEditFormGroup {
    formGroup: UntypedFormGroup;

    constructor(task: Task) {
        this.formGroup = new UntypedFormGroup({
            title: new UntypedFormControl(task.title, Validators.required),
            answer: new UntypedFormControl(task.answer, [Validators.required, Validators.maxLength(50)]),
            solution: new UntypedFormControl(task.solution, Validators.required),
            content: new UntypedFormControl(task.content, Validators.required),
            incorrectAnswerLimit: new UntypedFormControl(task.incorrectAnswerLimit, [
                Validators.required,
                Validators.min(0),
                Validators.max(100),
            ]),
            modifySandbox: new UntypedFormControl(task.modifySandbox),
        });
    }

    setToTask(task: Task): void {
        task.title = this.formGroup.get('title').value;
        task.answer = this.formGroup.get('answer').value;
        task.answer = task.answer ? task.answer.trim() : task.answer;
        task.solution = this.formGroup.get('solution').value;
        task.content = this.formGroup.get('content').value;
        task.incorrectAnswerLimit = this.formGroup.get('incorrectAnswerLimit').value;
        task.valid = this.formGroup.valid;
        task.modifySandbox = this.formGroup.get('modifySandbox').value;
    }
}
