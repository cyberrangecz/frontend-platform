import {Observable} from 'rxjs';
import {HardwareUsage, Resources} from '@crczp/sandbox-model';

/**
 * Service abstracting http communication with resources endpoints.
 */
export abstract class ResourcesApi {
    /**
     * Sends http request to retrieve all resources
     */
    abstract getResources(): Observable<Resources>;

    /**
     * Sends http request to retrieve resources limits
     */
    abstract getLimits(): Observable<HardwareUsage>;
}
