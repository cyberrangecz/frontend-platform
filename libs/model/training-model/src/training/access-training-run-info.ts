import { Level } from '../level/level';
import { Phase } from '../phase/phase';

/** Cleanup request summary (stages: IN_QUEUE, RUNNING, FINISHED, FAILED). */
export interface CleanupRequestSummary {
    id: number;
    allocationUnitId?: number;
    stages: string[];
}

/** Active sandbox summary (single-sandbox-per-user). */
export interface ActiveSandboxSummary {
    id: number;
    poolId: number;
    createdAt: string;
    createdBySub: string;
    sandboxId: string | null;
    allocationRequest?: { id: number; allocationUnitId: number; stages: string[] };
    /** When present, sandbox is being removed; show cleanup stages. */
    cleanupRequest?: CleanupRequestSummary;
    allowRemove?: boolean;
    /** Training instance title (which training this sandbox belongs to). */
    trainingInstanceTitle?: string | null;
    trainingInstanceId?: number | null;
    /** When true, sandbox is from a managed training instance; trainee cannot remove it. */
    managed?: boolean;
}

/**
 * Class containing info about accessed training run
 */
export class AccessTrainingRunInfo {
    trainingRunId?: number;
    instanceId?: number;
    trainingInstanceTitle?: string;
    allowAllocate?: boolean;
    /** When true, this is a managed instance: sandbox is assigned by administrator only. */
    managed?: boolean;
    /** Training instance access token; send as X-Training-Access-Token when calling sandbox-service (e.g. topology). */
    accessToken?: string;
    activeSandboxes?: ActiveSandboxSummary[];
    sandboxInstanceId?: string;
    sandboxDefinitionId?: number;
    currentLevelId!: number;
    displayedLevelId: number;
    levels: Level[] | Phase[] = [];
    isStepperDisplayed!: boolean;
    isPreview!: boolean;
    startTime!: Date;
    localEnvironment!: boolean;
    backwardMode!: boolean;
    isCurrentLevelAnswered!: boolean;

    public get currentLevel(): Level | Phase | undefined {
        return this.levels.find((level) => level.id === this.currentLevelId);
    }

    public get displayedLevel(): Level | Phase | undefined {
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
