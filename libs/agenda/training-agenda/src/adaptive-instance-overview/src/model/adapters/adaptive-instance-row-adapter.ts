import { TrainingInstance } from '@crczp/training-model';
import { Observable } from 'rxjs';

export class AdaptiveInstanceRowAdapter extends TrainingInstance {
    tdTitle: string;
    poolTitle: string;
    expiresIn: string;
    poolSize: Observable<string[]>;
}
