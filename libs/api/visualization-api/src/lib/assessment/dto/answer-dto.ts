import { UserRefDTO } from '@crczp/training-api';

export class AnswerDTO {
    text: string;
    participants: UserRefDTO[];
    correct: boolean;
}
