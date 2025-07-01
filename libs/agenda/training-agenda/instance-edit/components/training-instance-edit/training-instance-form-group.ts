import { UntypedFormControl, UntypedFormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { SentinelValidators } from '@sentinel/common';
import { TrainingInstance } from '@crczp/training-model';

/**
 * Training instance edit form group control
 */
export class TrainingInstanceFormGroup {
    formGroup: UntypedFormGroup;

    constructor(trainingInstance: TrainingInstance) {
        this.formGroup = new UntypedFormGroup(
            {
                startTime: new UntypedFormControl(trainingInstance.startTime),
                endTime: new UntypedFormControl(trainingInstance.endTime, [Validators.required, this.dateValidator]),
                title: new UntypedFormControl(trainingInstance.title, [SentinelValidators.noWhitespace]),
                trainingDefinition: new UntypedFormControl(trainingInstance.trainingDefinition, [Validators.required]),
                accessTokenPrefix: new UntypedFormControl(this.getTokenPrefix(trainingInstance.accessToken), [
                    SentinelValidators.noWhitespace,
                ]),
                localEnvironment: new UntypedFormControl(trainingInstance.localEnvironment),
                backwardMode: new UntypedFormControl(false),
                showStepperBar: new UntypedFormControl(trainingInstance.showStepperBar),
                poolId: new UntypedFormControl(trainingInstance.poolId),
                sandboxDefinitionId: new UntypedFormControl(trainingInstance.sandboxDefinitionId),
            },
            {
                validators: [this.dateSequenceValidator, this.sandboxValidator],
            },
        );

        this.formGroup.get('localEnvironment').valueChanges.subscribe(() => {
            this.onLocalEnvironmentChange();
        });

        this.formGroup.get('showStepperBar').valueChanges.subscribe((stepperbarEnabled) => {
            if (stepperbarEnabled) {
                this.formGroup.get('backwardMode').enable();
            } else {
                this.formGroup.get('backwardMode').setValue(false);
                this.formGroup.get('backwardMode').disable();
            }
        });
    }

    disable(): void {
        this.formGroup.get('showStepperBar').disable({ emitEvent: false });
        this.formGroup.get('backwardMode').disable({ emitEvent: false });
        this.formGroup.get('localEnvironment').disable({ emitEvent: false });
        this.formGroup.disable({ emitEvent: false });
        this.formGroup.get('title').enable({ emitEvent: false });
        const isExpired = this.formGroup.get('endTime').value
            ? this.formGroup.get('endTime').value.valueOf() < Date.now()
            : false;
        if (!isExpired) {
            this.formGroup.get('endTime').enable({ emitEvent: false });
        }
    }

    private dateSequenceValidator: ValidatorFn = (control: UntypedFormGroup): ValidationErrors | null => {
        let error = null;
        const startTime = control.get('startTime').value ? control.get('startTime').value : Date.now();
        const endTime = control.get('endTime').value;
        if (startTime && endTime && startTime.valueOf() > endTime.valueOf()) {
            error = { c: true };
        }
        return error ? error : null;
    };

    private dateValidator: ValidatorFn = (control: UntypedFormControl): ValidationErrors | null => {
        let error = null;
        if (control.value && control.value.valueOf() < Date.now()) {
            error = { dateInPast: true };
        }
        return error ? error : null;
    };

    /**
     * Validator for pool and sandbox definition selection
     * Verifies if either pool or sandbox definition is selected respectively to local environment
     * @param control form control to be validated
     */
    private sandboxValidator: ValidatorFn = (control: UntypedFormGroup): ValidationErrors | null => {
        const localEnvironment = control.get('localEnvironment').value;
        if (localEnvironment) {
            return control.get('sandboxDefinitionId').value ? null : { sandboxDefinitionRequired: true };
        }
        return control.get('poolId').value || control.get('sandboxDefinitionId').value ? null : { poolRequired: true };
    };

    /**
     * Sets values from training instance to individual inputs
     * @param trainingInstance training instance which values should be set to inputs
     */
    setValuesToTrainingInstance(trainingInstance: TrainingInstance): void {
        trainingInstance.startTime = this.formGroup.get('startTime').value;
        trainingInstance.endTime = this.formGroup.get('endTime').value;
        trainingInstance.title = this.formGroup.get('title').value;
        trainingInstance.trainingDefinition = this.formGroup.get('trainingDefinition').value;
        trainingInstance.accessToken = this.formGroup.get('accessTokenPrefix').value?.trim();
        trainingInstance.localEnvironment = this.formGroup.get('localEnvironment').value;
        trainingInstance.backwardMode = this.formGroup.get('backwardMode').value;
        trainingInstance.sandboxDefinitionId = this.formGroup.get('sandboxDefinitionId').value;
        trainingInstance.poolId = this.formGroup.get('poolId').value;
        trainingInstance.showStepperBar = this.formGroup.get('showStepperBar').value;
    }

    private onLocalEnvironmentChange(): void {
        this.formGroup.get('sandboxDefinitionId').setValue(null);
        this.formGroup.get('poolId').setValue(null);
    }

    private getTokenPrefix(accessToken: string): string {
        return accessToken?.substring(0, accessToken.lastIndexOf('-'));
    }
}
