import { accountFor, ACCOUNTS, BROWSER_KEYS, type BrowserKey } from '../../accounts';
import type { Api } from '../../api/api-client';
import { readChainRecord } from '../../shared-fixture';

/** A training run of the shared instance as the training service lists it. */
interface TrainingRunPayload {
    id: number;
    state: string;
    participant_ref: { sub: string; full_name: string; mail: string };
    sandbox_instance_ref_id: string | number | null;
    sandbox_instance_allocation_id: number | null;
    event_logging_state: boolean;
    command_logging_state: boolean;
    start_time: string;
    end_time: string | null;
}

/** The facts of one browser's trainee run that the review specs compare the pages against. */
export interface ReviewRun {
    browser: BrowserKey;
    runId: number;
    state: string;
    traineeName: string;
    traineeMail: string;
    sandboxInstanceId: string | number | null;
    allocationUnitId: number | null;
    eventLogging: boolean;
    commandLogging: boolean;
    startTime: number;
    endTime: number;
}

/** Loads the training run each browser's trainee played in the shared instance. */
export async function loadReviewRuns(
    organizerApi: Api,
    instanceId: number,
): Promise<Record<BrowserKey, ReviewRun>> {
    const payloads = await organizerApi.training.getAll<TrainingRunPayload>(
        `/training-instances/${instanceId}/training-runs`,
    );
    const entries = BROWSER_KEYS.map((browser) => {
        const subject = ACCOUNTS[accountFor('chainTrainee', browser)].subject;
        const payload = payloads.find((candidate) => candidate.participant_ref.sub === subject);
        if (!payload) {
            throw new Error(`The shared instance holds no training run of ${subject}`);
        }
        const run: ReviewRun = {
            browser,
            runId: payload.id,
            state: payload.state,
            traineeName: payload.participant_ref.full_name,
            traineeMail: payload.participant_ref.mail,
            sandboxInstanceId: payload.sandbox_instance_ref_id,
            allocationUnitId: payload.sandbox_instance_allocation_id,
            eventLogging: payload.event_logging_state,
            commandLogging: payload.command_logging_state,
            startTime: Date.parse(payload.start_time),
            endTime: Date.parse(payload.end_time ?? payload.start_time),
        };
        return [browser, run] as const;
    });
    return Object.fromEntries(entries) as Record<BrowserKey, ReviewRun>;
}

/** The identifier of the run the browser's chain recorded as played by its own trainee. */
export function ownRunId(browser: BrowserKey): number {
    const { trainingRunId } = readChainRecord(browser);
    if (trainingRunId === undefined) {
        throw new Error(`The ${browser} chain recorded no training run`);
    }
    return trainingRunId;
}
