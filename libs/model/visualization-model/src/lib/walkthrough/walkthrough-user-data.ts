import { TrainingEvent } from '../event/training-event';
import { TrainingUser } from '@crczp/training-model';

export class WalkthroughUserData {
    user!: TrainingUser;
    points!: number;
    events!: TrainingEvent[];
}
