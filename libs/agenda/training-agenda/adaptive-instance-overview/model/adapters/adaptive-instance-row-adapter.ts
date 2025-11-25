import { TrainingInstance } from '@crczp/training-model';
import { Observable } from 'rxjs';
import { PoolSize } from '@crczp/training-agenda/instance-overview';

export class AdaptiveInstanceRowAdapter extends TrainingInstance {
    tdTitle: string;
    poolTitle: string;
    expiresIn: string;
    poolSize: Observable<PoolSize>;
}
