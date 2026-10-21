import { expect } from '@playwright/test';
import { format } from 'date-fns';
import { ACCOUNTS } from '../../accounts';
import type { Api } from '../../api/api-client';
import { displayNameOf } from '../common/role-agendas';

/** The suite's second training organizer account, a member of the first organizer's group. */
export const SECOND_ORGANIZER = {
    search: displayNameOf(ACCOUNTS.secondTrainingOrganizer.login),
    login: ACCOUNTS.secondTrainingOrganizer.subject,
} as const;

/** Longest access token prefix the backend accepts. */
export const TOKEN_PREFIX_LIMIT = 32;

/** An access token prefix derived from the tail of a unique name, which carries the unique part. */
export function accessTokenPrefixFor(name: string): string {
    return `e2e-${name.slice(-12)}`;
}

/** Resolves once the clock passed the start time of an instance created with a start a few seconds ahead. */
export async function waitForInstanceStart(instance: { startTime: Date }): Promise<void> {
    await expect.poll(() => Date.now(), { timeout: 30_000 }).toBeGreaterThan(instance.startTime.getTime());
}

/** A training instance as the training service answers it. */
export interface StoredInstance {
    id: number;
    title: string;
    start_time: string;
    end_time: string;
    access_token: string;
    pool_id: number | null;
    show_stepper_bar: boolean;
    backward_mode: boolean;
    local_environment: boolean;
    training_definition: { id: number; title: string };
}

/** What a training instance is created from. */
export interface NewTrainingInstance {
    title: string;
    startTime: Date;
    endTime: Date;
    /** Access token without the PIN the backend appends. */
    accessTokenPrefix: string;
    trainingDefinitionId: number;
    poolId: number;
}

/** The part of a created training instance the creation answers with. */
export type CreatedInstance = Pick<StoredInstance, 'id' | 'title' | 'access_token'>;

/** Creates a training instance on a released training definition and its pool. */
export function createTrainingInstance(
    training: Api['training'],
    instance: NewTrainingInstance,
): Promise<CreatedInstance> {
    return training.post<CreatedInstance>('/training-instances', {
        title: instance.title,
        start_time: instance.startTime.toISOString(),
        end_time: instance.endTime.toISOString(),
        access_token: instance.accessTokenPrefix,
        training_definition_id: instance.trainingDefinitionId,
        pool_id: instance.poolId,
        local_environment: false,
        show_stepper_bar: true,
        backward_mode: true,
    });
}

/** Reads one training instance from the training service. */
export function readInstance(training: Api['training'], id: number): Promise<StoredInstance> {
    return training.get<StoredInstance>(`/training-instances/${id}`);
}

/** Finds the training instance with exactly this title, or undefined when none exists. */
export async function findInstanceByTitle(
    training: Api['training'],
    title: string,
): Promise<StoredInstance | undefined> {
    const instances = await training.getAll<StoredInstance>('/training-instances');
    return instances.find((instance) => instance.title === title);
}

/** Longest string of `length` characters made of repeated text, for boundary-length inputs. */
export function textOfLength(length: number, unit = 'a'): string {
    return unit.repeat(Math.ceil(length / unit.length)).slice(0, length);
}

/** A date as the training instance detail summary prints it. */
export function formatSummaryDate(date: Date): string {
    return format(date, 'MMM d, yyyy');
}

/** A date as the training instance overview table prints it. */
export function formatOverviewDate(date: Date): string {
    return format(date, 'd MMM, yyyy');
}

/** The date format the owl-date-time inputs parse and print. */
export function formatPickerDateTime(date: Date): string {
    return format(date, 'MM/dd/yyyy, HH:mm');
}
