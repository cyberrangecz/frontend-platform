import { Observable } from 'rxjs';

export abstract class MitreTechniquesOverviewService {
    abstract showMitreTechniques(): Observable<any>;
}
