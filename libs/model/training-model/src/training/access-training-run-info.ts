import { Level } from '../level/level';
import { SandboxWaitReasonEnum } from '../enums/sandbox-wait-reason.enum';
import { TraineeSandboxStateEnum } from '../enums/trainee-sandbox-state.enum';
import { TraineeSandbox } from './trainee-sandbox';

/**
 * Class containing info about accessed training run
 */
export class AccessTrainingRunInfo {
    trainingRunId!: number;
    sandboxInstanceId?: string;
    sandboxDefinitionId?: number;
    currentLevelId!: number;
    displayedLevelId: number;
    levels: Level[] = [];
    isStepperDisplayed!: boolean;
    isPreview!: boolean;
    startTime!: Date;
    localEnvironment!: boolean;
    backwardMode!: boolean;
    isCurrentLevelAnswered!: boolean;
    instanceId?: number;
    trainingInstanceTitle?: string;
    managed?: boolean;
    /**
     * True if the run cannot be entered because its sandbox, which the trainee allocates for
     * themselves, is not ready. The info then carries no levels.
     */
    waitingForSandbox = false;
    /**
     * Set only while waiting for the sandbox: true if the run has no sandbox, and entering the
     * access token again allocates one
     */
    allowAllocate = true;
    /** The sandboxes the trainee allocated for themselves, set only while waiting for the sandbox */
    ownSandboxes: TraineeSandbox[] = [];

    /**
     * Why the trainee waits for the sandbox instead of entering the run, if they do
     */
    public get sandboxWaitReason(): SandboxWaitReasonEnum | undefined {
        if (!this.waitingForSandbox) {
            return undefined;
        }
        const runSandboxStates = this.ownSandboxes
            .filter((sandbox) => sandbox.trainingInstanceId === this.instanceId)
            .map((sandbox) => sandbox.state);
        if (
            runSandboxStates.some(
                (state) =>
                    state === TraineeSandboxStateEnum.BUILDING ||
                    state === TraineeSandboxStateEnum.READY,
            )
        ) {
            return SandboxWaitReasonEnum.PREPARING;
        }
        if (
            runSandboxStates.some(
                (state) =>
                    state === TraineeSandboxStateEnum.BUILD_FAILED ||
                    state === TraineeSandboxStateEnum.REMOVAL_FAILED,
            )
        ) {
            return SandboxWaitReasonEnum.FAILED;
        }
        if (runSandboxStates.includes(TraineeSandboxStateEnum.REMOVING)) {
            return SandboxWaitReasonEnum.REMOVING;
        }
        if (this.ownSandboxes.some((sandbox) => sandbox.active)) {
            return SandboxWaitReasonEnum.BLOCKED;
        }
        // With nothing listed, the training service could not tell; the sandbox may still be coming.
        return this.allowAllocate
            ? SandboxWaitReasonEnum.MISSING
            : SandboxWaitReasonEnum.PREPARING;
    }

    public get currentLevel(): Level | undefined {
        return this.levels.find((level) => level.id === this.currentLevelId);
    }

    public get displayedLevel(): Level | undefined {
        return this.levels.find((level) => level.id === this.displayedLevelId);
    }

    public get isBacktracked(): boolean {
        return this.displayedLevelId !== this.currentLevelId;
    }

    public get isLastLevelDisplayed(): boolean {
        const displayed = this.displayedLevel;
        const lastLevel = this.levels[this.levels.length - 1];
        return displayed?.id === lastLevel?.id;
    }

    public get isLastLevel(): boolean {
        const current = this.currentLevel;
        const lastLevel = this.levels[this.levels.length - 1];
        return current?.id === lastLevel?.id;
    }

    public update(
        properties: Partial<AccessTrainingRunInfo>,
    ): AccessTrainingRunInfo {
        Object.assign(this, properties);
        return this;
    }
}
