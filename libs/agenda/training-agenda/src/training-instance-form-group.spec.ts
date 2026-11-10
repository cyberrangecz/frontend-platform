import { TrainingInstance } from '@crczp/training-model';
import { describe, expect, it } from 'vitest';
import { TrainingInstanceFormGroup } from '../instance-edit/components/training-instance-edit/training-instance-form-group';

function managedValueOf(trainingInstance: TrainingInstance, editMode: boolean): boolean {
    return new TrainingInstanceFormGroup(trainingInstance, editMode).formGroup.get('managed').value;
}

function instanceWithManaged(managed: boolean): TrainingInstance {
    const trainingInstance = new TrainingInstance();
    trainingInstance.managed = managed;
    return trainingInstance;
}

describe('TrainingInstanceFormGroup managed control', () => {
    it('starts a new instance as managed', () => {
        expect(managedValueOf(new TrainingInstance(), false)).toBe(true);
    });

    it('treats an existing instance without a managed value as managed', () => {
        expect(managedValueOf(new TrainingInstance(), true)).toBe(true);
    });

    it('keeps a stored not managed value', () => {
        expect(managedValueOf(instanceWithManaged(false), true)).toBe(false);
    });

    it('keeps a stored managed value', () => {
        expect(managedValueOf(instanceWithManaged(true), true)).toBe(true);
    });

    it('writes the managed value back to the instance', () => {
        const formGroup = new TrainingInstanceFormGroup(new TrainingInstance(), false);
        formGroup.formGroup.get('managed').setValue(false);
        const trainingInstance = new TrainingInstance();

        formGroup.setValuesToTrainingInstance(trainingInstance);

        expect(trainingInstance.managed).toBe(false);
    });
});
