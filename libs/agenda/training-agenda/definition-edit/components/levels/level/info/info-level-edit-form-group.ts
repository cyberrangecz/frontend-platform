import {UntypedFormControl, UntypedFormGroup, Validators} from '@angular/forms';
import {SentinelValidators} from '@sentinel/common';
import {InfoLevel} from '@crczp/training-model';

/**
 * Form control class for info level edit component
 */
export class InfoLevelEditFormGroup {
    formGroup: UntypedFormGroup;

    constructor(level: InfoLevel) {
        this.formGroup = new UntypedFormGroup({
            title: new UntypedFormControl(level.title, SentinelValidators.noWhitespace),
            content: new UntypedFormControl(level.content, SentinelValidators.noWhitespace),
            estimatedDuration: new UntypedFormControl(level.estimatedDuration, [
                Validators.pattern('^[0-9]*$'),
                Validators.min(0),
            ]),
        });
    }

    /**
     * Sets inserted form values from inputs to info level
     * @param level level which values should be filled
     */
    setToLevel(level: InfoLevel): void {
        level.title = this.formGroup.get('title').value;
        level.content = this.formGroup.get('content').value;
        level.estimatedDuration = Number(this.formGroup.get('estimatedDuration').value);
        level.valid = this.formGroup.valid;
    }
}
