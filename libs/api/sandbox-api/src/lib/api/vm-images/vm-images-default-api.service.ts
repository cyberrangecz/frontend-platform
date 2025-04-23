import { VirtualImagesMapper } from './../../mappers/vm-images/virtual-images-mapper';
import { VirtualImagesDTO } from './../../DTOs/vm-images/virtual-images-dto';
import { Observable } from 'rxjs';
import { SandboxApiConfigService } from '../../others/sandbox-api-config.service';
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { VirtualImage } from '@crczp/sandbox-model';
import { SentinelParamsMerger } from '@sentinel/common';
import { OffsetPaginationEvent, PaginatedResource } from '@sentinel/common/pagination';
import { SentinelFilter } from '@sentinel/common/filter';
import { DjangoResourceDTO } from '../../DTOs/other/django-resource-dto';
import { VMImagesApi } from './vm-images-api.service';
import { map } from 'rxjs/operators';
import { PaginationMapper, ParamsBuilder } from '@crczp/api-common';

/**
 * Default implementation of service abstracting http communication with vm images endpoints.
 */
@Injectable()
export class VMImagesDefaultApi extends VMImagesApi {
    private readonly virtualImagesUriExtension = 'images';
    private readonly virtualImagesEndpointUri: string;

    constructor(
        private http: HttpClient,
        private context: SandboxApiConfigService
    ) {
        super();
        if (this.context.config === undefined || this.context.config === null) {
            throw new Error(
                'SandboxApiConfig is null or undefined. Please provide it in forRoot() method of SandboxApiModule' +
                ' or provide own implementation of API services'
            );
        }
        this.virtualImagesEndpointUri =
            this.context.config.sandboxRestBasePath + this.virtualImagesUriExtension;
    }

    /**
     * Sends http request to retrieve all available virtual machine images
     * @param pagination requested pagination
     * @param onlyCrczpImages filters images belonging to CyberRangeᶜᶻ Platform
     * @param onlyGuiAccess filters images with GUI access
     * @param cached Performs the faster version of this endpoint but does not retrieve a fresh list of images
     * @param filters list of sentinel filters to filter results
     */
    getAvailableImages(
        pagination: OffsetPaginationEvent,
        onlyCrczpImages = false,
        onlyGuiAccess = false,
        cached = false,
        filters?: SentinelFilter[]
    ): Observable<PaginatedResource<VirtualImage>> {
        const params = SentinelParamsMerger.merge([ParamsBuilder.djangoPaginationParams(pagination), ParamsBuilder.filterParams(filters)])
            .append('onlyCustom', onlyCrczpImages)
            .append('GUI', onlyGuiAccess)
            .append('cached', cached);

        return this.http
            .get<DjangoResourceDTO<VirtualImagesDTO>>(`${this.virtualImagesEndpointUri}`, {
                params: params
            })
            .pipe(
                map(
                    (response) =>
                        new PaginatedResource<VirtualImage>(
                            VirtualImagesMapper.fromDTOs(response.results),
                            PaginationMapper.fromDjangoDTO(response)
                        )
                )
            );
    }
}
