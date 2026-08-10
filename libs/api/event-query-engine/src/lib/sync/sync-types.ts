import { PlatformEventType } from '@crczp/training-model';

/**
 * Event types that require a pool-level OpenSearch index query.
 * These need a resolved poolId from the TrainingInstance entity before
 * the microservice fetch can be constructed.
 */
export type PoolScopedEventType = PlatformEventType.COMMAND;

/**
 * Event types that use the instance-level OpenSearch index.
 * No poolId resolution required — the instanceId alone scopes the query.
 */
export type InstanceScopedEventType = Exclude<PlatformEventType, PoolScopedEventType>;
