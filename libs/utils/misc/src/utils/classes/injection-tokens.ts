import { InjectionToken } from '@angular/core';
import { TrainingTypeEnum } from '@crczp/training-model';

export const TRAINING_TYPE_TOKEN = new InjectionToken<TrainingTypeEnum>(
    'TrainingTypeToken',
);

export const INSTANCE_ID_TOKEN = new InjectionToken<number>('InstanceIdToken');
