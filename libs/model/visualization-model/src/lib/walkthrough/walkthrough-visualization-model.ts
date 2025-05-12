import { TrainingUser } from '@crczp/training-model';
import { CommandEvent } from '../event/command/command-events-model';

export class WalkthroughUserData {
    user!: TrainingUser;
    points!: number;
    events!: CommandEvent[];
}


export class WalkthroughVisualizationData {
    levelId!: number;
    title: string;
    usersData!: WalkthroughUserData[];
}
