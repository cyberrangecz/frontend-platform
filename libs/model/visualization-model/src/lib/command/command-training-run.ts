import { TrainingUser } from '@crczp/training-model';

export class CommandTrainingRun {
    id: number;
    state: string;
    sandboxInstanceRefId: number;
    participantRef: TrainingUser;
}
