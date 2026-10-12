import { UntypedFormControl, UntypedFormGroup, ValidationErrors, ValidatorFn, Validators } from '@angular/forms';
import { SentinelValidators } from '@sentinel/common';
import { TrainingInstance } from '@crczp/training-model';
import { isBefore, subSeconds } from 'date-fns';

/**
 * Seconds before the current time that a new training instance may still start.
 */
export const START_TIME_GRACE_SECONDS = 30;

const DEFAULT_ACCESS_TOKEN_PREFIX = 'access';

/**
 * Training instance edit form group control
 */
export class TrainingInstanceFormGroup {
    formGroup: UntypedFormGroup;

    /**
     * @param trainingInstance training instance whose values fill the form
     * @param editMode true for an existing instance, whose stored values are kept as they are;
     * false for a new one, which starts now and with the default access token prefix
     * @param defaultManaged whether a new instance is managed; where trainees cannot allocate their
     * own sandboxes, it is, so that letting them later does not change instances created before
     */
    constructor(
        trainingInstance: TrainingInstance,
        editMode: boolean,
        defaultManaged = false,
    ) {
        this.formGroup = new UntypedFormGroup(
            {
                startTime: new UntypedFormControl(
                    editMode
                        ? trainingInstance.startTime
                        : (trainingInstance.startTime ?? new Date()),
                    [
                        editMode
                            ? this.dateValidator
                            : this.startTimeGraceValidator,
                    ],
                ),
                endTime: new UntypedFormControl(trainingInstance.endTime, [
                    Validators.required,
                    this.dateValidator,
                ]),
                title: new UntypedFormControl(trainingInstance.title, [
                    SentinelValidators.noWhitespace,
                ]),
                trainingDefinition: new UntypedFormControl(
                    trainingInstance.trainingDefinition,
                    [Validators.required]
                ),
                accessTokenPrefix: new UntypedFormControl(
                    editMode
                        ? this.getTokenPrefix(trainingInstance.accessToken)
                        : (this.getTokenPrefix(trainingInstance.accessToken) ??
                          DEFAULT_ACCESS_TOKEN_PREFIX),
                    [SentinelValidators.noWhitespace]
                ),
                localEnvironment: new UntypedFormControl(
                    trainingInstance.localEnvironment
                ),
                backwardMode: new UntypedFormControl(
                    trainingInstance.backwardMode,
                ),
                showStepperBar: new UntypedFormControl(
                    trainingInstance.showStepperBar
                ),
                managed: new UntypedFormControl(
                    trainingInstance.managed ?? defaultManaged
                ),
                poolId: new UntypedFormControl(trainingInstance.poolId),
                sandboxDefinitionId: new UntypedFormControl(
                    trainingInstance.sandboxDefinitionId
                ),
            },
            {
                validators: [this.dateSequenceValidator, this.sandboxValidator],
            }
        );

        this.formGroup.get('localEnvironment').valueChanges.subscribe(() => {
            this.onLocalEnvironmentChange();
        });

        this.formGroup
            .get('showStepperBar')
            .valueChanges.subscribe((stepperbarEnabled) => {
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

    /**
     * Sets values from training instance to individual inputs
     * @param trainingInstance training instance which values should be set to inputs
     */
    setValuesToTrainingInstance(trainingInstance: TrainingInstance): void {
        trainingInstance.startTime = this.formGroup.get('startTime').value;
        trainingInstance.endTime = this.formGroup.get('endTime').value;
        trainingInstance.title = this.formGroup.get('title').value;
        trainingInstance.trainingDefinition =
            this.formGroup.get('trainingDefinition').value;
        trainingInstance.accessToken = this.formGroup
            .get('accessTokenPrefix')
            .value?.trim();
        trainingInstance.localEnvironment =
            this.formGroup.get('localEnvironment').value;
        trainingInstance.backwardMode =
            this.formGroup.get('backwardMode').value;
        trainingInstance.sandboxDefinitionId = this.formGroup.get(
            'sandboxDefinitionId'
        ).value;
        trainingInstance.poolId = this.formGroup.get('poolId').value;
        trainingInstance.showStepperBar =
            this.formGroup.get('showStepperBar').value;
        trainingInstance.managed = this.formGroup.get('managed').value;
    }

    private dateSequenceValidator: ValidatorFn = (
        control: UntypedFormGroup
    ): ValidationErrors | null => {
        let error = null;
        const startTime = control.get('startTime').value
            ? control.get('startTime').value
            : Date.now();
        const endTime = control.get('endTime').value;
        if (startTime && endTime && startTime.valueOf() > endTime.valueOf()) {
            error = { startTimeAfterEndTime: true };
        }
        return error ? error : null;
    };

    private dateValidator: ValidatorFn = (
        control: UntypedFormControl
    ): ValidationErrors | null => {
        let error = null;
        if (control.value && control.value.valueOf() < Date.now()) {
            error = { dateInPast: true };
        }
        return error ? error : null;
    };

    private startTimeGraceValidator: ValidatorFn = (
        control: UntypedFormControl
    ): ValidationErrors | null =>
        control.value &&
        isBefore(control.value, subSeconds(Date.now(), START_TIME_GRACE_SECONDS))
            ? { startTimeTooFarInPast: true }
            : null;

    /**
     * Validator for pool and sandbox definition selection
     * Verifies if either pool or sandbox definition is selected respectively to local environment
     * @param control form control to be validated
     */
    private sandboxValidator: ValidatorFn = (
        control: UntypedFormGroup
    ): ValidationErrors | null => {
        const localEnvironment = control.get('localEnvironment').value;
        if (localEnvironment) {
            return control.get('sandboxDefinitionId').value
                ? null
                : { sandboxDefinitionRequired: true };
        }

        return control.get('poolId').value ||
            control.get('sandboxDefinitionId').value
            ? null
            : { poolRequired: true };
    };

    private onLocalEnvironmentChange(): void {
        this.formGroup.get('sandboxDefinitionId').setValue(null);
        this.formGroup.get('poolId').setValue(null);
    }

    private getTokenPrefix(accessToken: string): string {
        return accessToken?.substring(0, accessToken.lastIndexOf('-'));
    }
}
