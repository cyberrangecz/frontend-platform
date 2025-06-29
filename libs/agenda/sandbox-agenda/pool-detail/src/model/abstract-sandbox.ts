import { AllocationRequest, CleanupRequest, RequestStageState, SandboxAllocationUnit } from '@crczp/sandbox-model';
import { AbstractSandboxState } from 'libs/agenda/sandbox-agenda/pool-detail/src/model/enums/abstract-sandox-state.enum';

export class AbstractSandbox {
    id: number;
    uuid: string;
    poolId: number;
    name: string;
    comment: string;
    locked: boolean;
    createdAt: Date;
    createdBy: string;
    state: string;
    allocationRequest: AllocationRequest;
    cleanupRequest: CleanupRequest;

    constructor(allocationUnit: SandboxAllocationUnit) {
        this.id = allocationUnit.id;
        this.uuid = allocationUnit.sandboxUuid;
        this.name = `Sandbox ${allocationUnit.id}`;
        this.comment = allocationUnit.comment;
        this.locked = allocationUnit.locked;
        this.createdAt = allocationUnit.allocationRequest.createdAt;
        this.createdBy = allocationUnit.createdBy.fullName;
        this.poolId = allocationUnit.poolId;
        this.allocationRequest = allocationUnit.allocationRequest;
        this.cleanupRequest = allocationUnit.cleanupRequest;
        this.state = this.stateResolver();
    }

    public allocationRunning(): boolean {
        return (
            this.allocationRequest.stages.some((stage) => stage != RequestStageState.FINISHED) &&
            !this.allocationFailed()
        );
    }

    public cleanupRunning(): boolean {
        return (
            this.cleanupExists() &&
            !this.cleanupFailed() &&
            this.cleanupRequest.stages.some((stage) => stage != RequestStageState.FINISHED)
        );
    }

    public allocationFailed(): boolean {
        return this.allocationRequest.stages.some((stage) => stage == RequestStageState.FAILED);
    }

    public cleanupFailed(): boolean {
        return this.cleanupExists() && this.cleanupRequest.stages.some((stage) => stage == RequestStageState.FAILED);
    }

    public buildFinished(): boolean {
        return (
            this.allocationRequest.stages.every((stage) => stage === RequestStageState.FINISHED) &&
            !this.cleanupRunning()
        );
    }

    private cleanupExists(): boolean {
        return this.cleanupRequest != null;
    }

    public stateResolver(): string {
        if (this.allocationRunning()) return AbstractSandboxState.AllocationRunning;
        if (this.cleanupRunning()) return AbstractSandboxState.CleanupRunning;
        if (this.allocationFailed()) return AbstractSandboxState.AllocationFailed;
        if (this.cleanupFailed()) return AbstractSandboxState.CleanupFailed;
        if (this.buildFinished()) return AbstractSandboxState.BuildFinished;
    }

    // states: allocation-running, cleanup-running, allocation-failed, cleanup-failed, built,
}
