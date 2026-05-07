# Entity Resolver

RxJS operator that resolves integer ID fields in Drizzle query results to full entity objects.
Operates as a post-broker pipe, after `DataBrokerService.query()` or `queryPolling()` emits.

## Usage

```typescript
// Strict — fetch errors propagate
broker.query(instanceId, eventTypes, queryFn).pipe(
    resolver.resolve([EntityType.Instance, EntityType.TrainingRun]),
)

// Tolerant — missing or forbidden entities fall back to { <key>Id: number }
broker.queryPolling(instanceId, eventTypes, queryFn).pipe(
    resolver.resolveSafe([EntityType.Instance, EntityType.User]),
)
```

## Type transformation

Each `EntityType` owns a set of DB column names. On resolution:

- Owned ID columns are removed from the row type.
- A new key is added with the resolved entity type.

| EntityType          | Owned fields                                  | Output key          | Safe fallback                   |
| ------------------- | --------------------------------------------- | ------------------- | ------------------------------- |
| `Instance`          | `instance_id`, `training_instance_id`         | `instance`          | `{ instanceId: number }`          |
| `TrainingRun`       | `training_run_id`                             | `trainingRun`       | `{ trainingRunId: number }`       |
| `User`              | `user_ref_id`                                 | `user`              | `{ userId: number }`              |
| `Pool`              | `pool_id`                                     | `pool`              | `{ poolId: number }`              |
| `Level`             | `level_id`                                    | `level`             | `{ levelId: number }`             |
| `TrainingDefinition`| `training_definition_id`                      | `trainingDefinition`| `{ trainingDefinitionId: number }`|
| `Hint`              | `hint_id`                                     | `hint`              | `{ hintId: number }`              |

## Providing the service

```typescript
{ provide: EntityResolverService, useClass: EntityResolverServiceImpl }
```

## Wiring fetchers

Implement `EntityFetchApi` with the real HTTP calls and provide it alongside the resolver:

```typescript
{ provide: EntityFetchApi, useClass: MyEntityFetchApiImpl },
{ provide: EntityResolverService, useClass: EntityResolverServiceImpl },
```

Each method must return `Observable<Array<{ id: number } & Record<string, unknown>>>`.
The `id` field is used as the lookup key when building the entity map.

## Batch behaviour

- IDs are deduplicated per entity type before fetching.
- All entity types are fetched in parallel via `forkJoin`.
- `resolveSafe` catches per-entity-type fetch errors individually — other types still resolve.
- Rows without any owned field for a requested entity type are silently skipped.
