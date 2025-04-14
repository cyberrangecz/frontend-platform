import { Observable } from 'rxjs';
import { VirtualImage } from '@crczp/sandbox-model';
import { SentinelFilter } from '@sentinel/common/filter';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';

/**
 * Service abstracting http communication with vm images endpoints.
 */
export abstract class VMImagesApi {
    /**
     * Sends http request to retrieve all available virtual machine images
     * @param pagination requested pagination
     * @param onlyCrczpImages filters images belonging to CyberRangeᶜᶻ Platform
     * @param onlyGuiAccess filters images with GUI access
     * @param cached Performs the faster version of this endpoint but does not retrieve a fresh list of images
     * @param filters list of sentinel filters to filter results
     */
    abstract getAvailableImages(
        pagination: OffsetPaginationEvent,
        onlyCrczpImages: boolean,
        onlyGuiAccess: boolean,
        cached: boolean,
        filters?: SentinelFilter[],
    ): Observable<PaginatedResource<VirtualImage>>;
}
