import { CreatedByDTO } from './created-by-dto';
import { RequestDTO } from './request-dto';

export class SandboxAllocationUnitDTO {
    id: number;
    pool_id: number;
    locked: boolean;
    comment?: string;
    allocation_request: RequestDTO;
    cleanup_request: RequestDTO;
    created_by: CreatedByDTO;
}
