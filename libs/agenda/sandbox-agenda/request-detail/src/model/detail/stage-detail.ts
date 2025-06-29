import { PaginatedResource } from '@sentinel/common';
import { StageDetailType } from 'libs/agenda/sandbox-agenda/request-detail/src/model/detail/stage-detail-type';

export class StageDetail {
    resourceName: string;
    type: StageDetailType;
    content: PaginatedResource<string>;
    hasError: boolean;
    hasContent: boolean;

    constructor(resourceName: string, content: PaginatedResource<string>, hasError = false) {
        this.resourceName = resourceName;
        this.content = content;
        this.hasError = hasError;
        this.hasContent = this.content?.elements?.length > 0;
    }
}
