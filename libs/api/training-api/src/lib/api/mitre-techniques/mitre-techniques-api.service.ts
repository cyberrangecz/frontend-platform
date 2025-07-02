import {MitreTechnique} from '@crczp/training-model';
import {Observable} from 'rxjs';

export abstract class MitreTechniquesApi {
    /**
     * Sends http request to retrieve all mitre techniques for all training definitions
     * @param played get mitre techniques only for played trainings
     */
    abstract getMitreTechniques(played: boolean): Observable<string>;

    /**
     * Sends http request to retrieve all available mitre techniques for autocomple
     */
    abstract getMitreTechniquesList(): Observable<MitreTechnique[]>;
}
