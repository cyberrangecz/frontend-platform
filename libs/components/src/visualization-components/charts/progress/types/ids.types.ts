/**
 * Branded numeric ID types for the progress visualization.
 *
 * Branding is a compile-time intersection with a phantom marker — zero runtime
 * cost. The brand prevents accidental cross-ID assignment (e.g. passing a
 * `LevelId` where a `TraineeId` is expected).
 *
 * Construction helpers (`as*Id`) are the only sanctioned cast site; call them
 * at the boundary where a raw number first enters the visualization layer
 * (DB row, route param, API response).
 */

declare const __traineeId: unique symbol;
declare const __levelId: unique symbol;
declare const __trainingRunId: unique symbol;
declare const __instanceId: unique symbol;
declare const __barKey: unique symbol;

export type TraineeId = number & { readonly [__traineeId]: true };
export type LevelId = number & { readonly [__levelId]: true };
export type TrainingRunId = number & { readonly [__trainingRunId]: true };
export type InstanceId = number & { readonly [__instanceId]: true };

/**
 * Composite key tying an event or an overlay to a single bar.
 *
 * Encoded as `${trainingRunId}:${levelId}` and branded so it cannot be
 * confused with arbitrary strings.
 */
export type BarKey = string & { readonly [__barKey]: true };

export function asTraineeId(raw: number): TraineeId {
    return raw as TraineeId;
}

export function asLevelId(raw: number): LevelId {
    return raw as LevelId;
}

export function asTrainingRunId(raw: number): TrainingRunId {
    return raw as TrainingRunId;
}

export function asInstanceId(raw: number): InstanceId {
    return raw as InstanceId;
}

export function asBarKey(trainingRunId: TrainingRunId, levelId: LevelId): BarKey {
    return `${trainingRunId}:${levelId}` as BarKey;
}
