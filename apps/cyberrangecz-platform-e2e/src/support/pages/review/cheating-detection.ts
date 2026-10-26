import { expect, type Locator, type Page } from '@playwright/test';
import type { BrowserKey } from '../../accounts';
import type { Api } from '../../api/api-client';
import { SentinelTable } from '../../ui';

/** A cheating detection as the training service lists it. */
export interface CheatingDetectionPayload {
    id: number;
    training_instance_id: number;
    current_state: string;
    results: number;
    proximity_threshold: number | null;
    time_proximity_state: string;
}

/** A detection event as the training service lists it. */
export interface DetectionEventPayload {
    id: number;
    cheating_detection_id: number;
    detection_event_type: string;
    level_title: string;
    level_id: number;
    level_order: number;
    participant_count: number;
    participants: string;
}

/**
 * Time proximity thresholds, in seconds, that tell the browsers' detections apart. Each browser
 * owns one threshold for the detection its create spec submits through the form, one for the
 * detection the read-only specs share, one for the detection the specs that rerun or delete
 * use up, and one for the detection that finds nothing, so the three browsers and the kinds of
 * spec never meet each other's rows. All values but `withoutEvents` are large enough that the
 * three trainees' answers fall into one window; `withoutEvents` is so small that they never do.
 */
export const CHEATING_THRESHOLDS: Record<
    BrowserKey,
    { form: number; fixture: number; disposable: number; withoutEvents: number }
> = {
    chromium: { form: 86400, fixture: 86397, disposable: 86394, withoutEvents: 1 },
    firefox: { form: 86399, fixture: 86396, disposable: 86393, withoutEvents: 2 },
    webkit: { form: 86398, fixture: 86395, disposable: 86392, withoutEvents: 3 },
};

const LARGEST_PAGE_SIZE = 100;
const FINISHED_STATE = 'FINISHED';
const FINISH_TIMEOUT_MILLISECONDS = 60_000;
const FINISH_POLL_INTERVALS = [1_000, 2_000, 5_000];

/** The detections of a training instance. */
export function detectionsOf(api: Api, instanceId: number): Promise<CheatingDetectionPayload[]> {
    return api.training.getAll<CheatingDetectionPayload>(`/cheating-detections/${instanceId}/detections`);
}

/** The detection events of one detection. */
export function eventsOf(api: Api, instanceId: number, detectionId: number): Promise<DetectionEventPayload[]> {
    return api.training.getAll<DetectionEventPayload>(`/cheating-detections/${detectionId}/events`, {
        trainingInstanceId: instanceId,
    });
}

/** The detection of a training instance that carries the time proximity threshold, when one exists. */
export async function findDetectionByThreshold(
    api: Api,
    instanceId: number,
    threshold: number,
): Promise<CheatingDetectionPayload | undefined> {
    const detections = await detectionsOf(api, instanceId);
    return detections.find((detection) => detection.proximity_threshold === threshold);
}

/**
 * The state of the detection that carries the threshold; a failed read answers undefined, so a
 * polling caller reads again.
 */
export async function detectionStateByThreshold(
    api: Api,
    instanceId: number,
    threshold: number,
): Promise<string | undefined> {
    try {
        return (await findDetectionByThreshold(api, instanceId, threshold))?.current_state;
    } catch {
        return undefined;
    }
}

/** Waits until the detection that carries the threshold finished and answers it. */
export async function waitForFinishedDetection(
    api: Api,
    instanceId: number,
    threshold: number,
): Promise<CheatingDetectionPayload> {
    await expect
        .poll(() => detectionStateByThreshold(api, instanceId, threshold), {
            timeout: FINISH_TIMEOUT_MILLISECONDS,
            intervals: FINISH_POLL_INTERVALS,
            message: `cheating detection with threshold ${threshold} finishing`,
        })
        .toBe(FINISHED_STATE);
    return (await findDetectionByThreshold(api, instanceId, threshold)) as CheatingDetectionPayload;
}

/**
 * Submits a time proximity detection whose threshold no other detection of the instance carries
 * and waits until it finished.
 */
export async function createFinishedDetection(
    api: Api,
    instanceId: number,
    threshold: number,
): Promise<CheatingDetectionPayload> {
    await api.training.post('/cheating-detections/detection', {
        training_instance_id: instanceId,
        executed_by: '',
        proximity_threshold: threshold,
        current_state: 'RUNNING',
        results: 0,
        answer_similarity_state: 'DISABLED',
        location_similarity_state: 'DISABLED',
        time_proximity_state: 'QUEUED',
        minimal_solve_time_state: 'DISABLED',
        no_commands_state: 'DISABLED',
        forbidden_commands_state: 'DISABLED',
        forbidden_commands: [],
    });
    return waitForFinishedDetection(api, instanceId, threshold);
}

/** The detection of the instance with the identifier, as the training service lists it now. */
export async function readDetection(
    api: Api,
    instanceId: number,
    detectionId: number,
): Promise<CheatingDetectionPayload> {
    const detection = (await detectionsOf(api, instanceId)).find((candidate) => candidate.id === detectionId);
    if (!detection) {
        throw new Error(`Instance ${instanceId} lists no cheating detection ${detectionId}`);
    }
    return detection;
}

/** The overview of the cheating detections of an instance at `/linear-instance/:id/cheating-detection`. */
export class CheatingDetectionOverview {
    constructor(
        readonly page: Page,
        readonly instanceId: number,
    ) {}

    /** The overview's table. */
    get table(): SentinelTable {
        return SentinelTable.in(this.page);
    }

    /** Opens the overview and waits until its table loaded. */
    async open(): Promise<void> {
        await this.page.goto(`/linear-instance/${this.instanceId}/cheating-detection`);
        await this.table.waitUntilLoaded();
    }

    /** Opens the page and widens the table to its largest page size so every detection sits on the first page. */
    async openShowingEveryDetection(): Promise<void> {
        await this.open();
        await this.table.selectPageSize(LARGEST_PAGE_SIZE);
        await this.table.waitUntilLoaded();
    }

    /** The table row of a detection, found by the id in its id column. */
    rowOf(detectionId: number): Promise<Locator> {
        return this.table.rowByColumnValue(/^id$/i, new RegExp(`^\\s*${detectionId}\\s*$`));
    }

    /** The stage icons of a row, one per detection method. */
    stageIcons(row: Locator): Locator {
        return row.locator('crczp-stage-overview .stage-container');
    }
}

/** The page of a training instance's detection events at `.../cheating-detection/:detectionId`. */
export function detectionEventsUrl(instanceId: number, detectionId: number): string {
    return `/linear-instance/${instanceId}/cheating-detection/${detectionId}`;
}

/** The page of one detection event at `.../cheating-detection/:detectionId/event/:eventId`. */
export function detectionEventUrl(instanceId: number, detectionId: number, eventId: number): string {
    return `${detectionEventsUrl(instanceId, detectionId)}/event/${eventId}`;
}
