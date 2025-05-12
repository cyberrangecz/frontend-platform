import { CheatingDetection } from '@crczp/training-model';
import { Observable } from 'rxjs';

/**
 * A layer between a component and an API services. Implement a concrete services by extending this class.
 * Provide a concrete class in Angular Module. For more info see https://angular.io/guide/dependency-injection-providers.
 * You can use get methods to get paginated resources and other operations to modify data.
 * Subscribe to trainingDefinitions$ to receive latest data updates.
 */
export abstract class CheatingDetectionEditService {
    /**
     * Makes an API call to create a cheating detection object in the database.
     * @param cheatingDetection the cheating detection object
     * @param trainingInstanceId training instance id
     */
    abstract create(cheatingDetection: CheatingDetection, trainingInstanceId: number): Observable<any>;
}
