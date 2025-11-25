import { TrainingInstance } from '@crczp/training-model';
import { Observable } from 'rxjs';
import { PoolSize } from '../../services/state/training-instance-overview.service';

export class TrainingInstanceRowAdapter extends TrainingInstance {
    tdTitle: string;
    poolTitle: string;
    expiresIn: string;
    poolSize: Observable<PoolSize>;
}
