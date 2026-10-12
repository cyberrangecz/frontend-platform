import { TraineeSandboxStateEnum } from '../enums/trainee-sandbox-state.enum';

/**
 * State of a stage of the request that builds or removes a sandbox, as the sandbox service
 * reports it. A cancelled stage is reported as FAILED.
 */
export type SandboxStageState = 'IN_QUEUE' | 'RUNNING' | 'FINISHED' | 'FAILED';

/**
 * A sandbox a trainee allocated for themselves on entering the access token of a training
 * instance that is not managed
 */
export class TraineeSandbox {
    /** Id of the sandbox's allocation unit */
    id!: number;
    poolId!: number;
    /** Absent while the sandbox is being built and once its removal has started */
    sandboxId?: string;
    createdAt?: Date;
    allocationStages: SandboxStageState[] = [];
    /** Absent until someone asks for the sandbox to be removed */
    cleanupStages?: SandboxStageState[];
    /** True if the trainee may remove the sandbox now, as the training service decides */
    removable!: boolean;
    /** The training instance of the run the sandbox was allocated for, while that run exists */
    trainingInstanceId?: number;
    trainingInstanceTitle?: string;

    get state(): TraineeSandboxStateEnum {
        if (this.cleanupStages) {
            return this.cleanupStages.includes('FAILED')
                ? TraineeSandboxStateEnum.REMOVAL_FAILED
                : TraineeSandboxStateEnum.REMOVING;
        }
        if (this.allocationStages.includes('FAILED')) {
            return TraineeSandboxStateEnum.BUILD_FAILED;
        }
        return this.allocationStages.length > 0 &&
            this.allocationStages.every((stage) => stage === 'FINISHED')
            ? TraineeSandboxStateEnum.READY
            : TraineeSandboxStateEnum.BUILDING;
    }

    /** True while the sandbox is being built or removed, so its state changes by itself */
    get inProgress(): boolean {
        const state = this.state;
        return (
            state === TraineeSandboxStateEnum.BUILDING ||
            state === TraineeSandboxStateEnum.REMOVING
        );
    }

    /**
     * True while the sandbox is built, being built or being removed, which keeps the trainee from
     * getting another one
     */
    get active(): boolean {
        return this.inProgress || this.state === TraineeSandboxStateEnum.READY;
    }

    /** One-based number of the stage that builds or removes the sandbox now, if any */
    get currentStage(): number | undefined {
        const stages = this.cleanupStages ?? this.allocationStages;
        const index = stages.findIndex((stage) => stage !== 'FINISHED');
        return index < 0 ? undefined : index + 1;
    }

    get stageCount(): number {
        return (this.cleanupStages ?? this.allocationStages).length;
    }
}
