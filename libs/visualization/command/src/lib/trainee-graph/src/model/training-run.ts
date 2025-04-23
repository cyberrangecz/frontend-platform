import { Participant } from './participant';

export class TrainingRun {
    id: number;
    state: string;
    sandboxInstanceRefId: number;
    participantRef: Participant;
}
