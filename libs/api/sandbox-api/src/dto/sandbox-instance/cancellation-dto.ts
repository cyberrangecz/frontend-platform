import { UnitCancellationAction } from '@crczp/sandbox-model';

export interface StopPendingResultDTO {
    stop_pending: boolean;
}

export interface UnitCancellationDTO {
    unit_id: number;
    stack_name: string;
    action: UnitCancellationAction;
    stop_pending: boolean;
    reason: string;
}

export interface PoolCancelAllocationsResultDTO {
    units: UnitCancellationDTO[];
}
