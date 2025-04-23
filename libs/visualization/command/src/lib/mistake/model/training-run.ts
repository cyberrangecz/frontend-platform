import { Trainee } from './trainee';

export class TrainingRun {
    id: number;
    state: string;
    sandboxInstanceRefId: number;
    participantRef: Trainee;
}
