import { UserRefDTO } from '@crczp/training-api';

export class OptionDTO {
    text: string;
    participants: UserRefDTO[];
    correct: boolean;
}
