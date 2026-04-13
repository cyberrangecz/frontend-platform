/**
 * OpenSearch training event schema.
 *
 * The core design choice: a flat `FieldTypeMap` (field name → TS type) rather
 * than a union of per-event interface types. The union approach has a fatal
 * flaw — `keyof (A | B)` in TypeScript yields only the keys *common* to all
 * members, silently dropping every event-specific field. The flat map avoids
 * this entirely and scales trivially when new event types are added.
 */

// ─── Event taxonomy ───

export const EventType = {
    TrainingRunStarted:      'cz.cyberrange.platform.training.opensearch.model.TrainingRunStarted',
    TrainingRunResumed:      'cz.cyberrange.platform.training.opensearch.model.TrainingRunResumed',
    TrainingRunEnded:        'cz.cyberrange.platform.training.opensearch.model.TrainingRunEnded',
    LevelStarted:            'cz.cyberrange.platform.training.opensearch.model.LevelStarted',
    LevelCompleted:          'cz.cyberrange.platform.training.opensearch.model.LevelCompleted',
    CorrectAnswerSubmitted:  'cz.cyberrange.platform.training.opensearch.model.CorrectAnswerSubmitted',
    CorrectFlagSubmitted:    'cz.cyberrange.platform.training.opensearch.model.CorrectFlagSubmitted',
    WrongAnswerSubmitted:    'cz.cyberrange.platform.training.opensearch.model.WrongAnswerSubmitted',
    WrongFlagSubmitted:      'cz.cyberrange.platform.training.opensearch.model.WrongFlagSubmitted',
    CorrectPasskeySubmitted: 'cz.cyberrange.platform.training.opensearch.model.CorrectPasskeySubmitted',
    WrongPasskeySubmitted:   'cz.cyberrange.platform.training.opensearch.model.WrongPasskeySubmitted',
    HintTaken:               'cz.cyberrange.platform.training.opensearch.model.HintTaken',
    SolutionDisplayed:       'cz.cyberrange.platform.training.opensearch.model.SolutionDisplayed',
    AssessmentAnswers:       'cz.cyberrange.platform.training.opensearch.model.AssessmentAnswers',
} as const;

export type EventTypeName = (typeof EventType)[keyof typeof EventType];
export type LevelType = 'INFO' | 'ACCESS' | 'TRAINING' | 'ASSESSMENT';

// ─── Index pattern ───

/** Stands in for any field value in an OpenSearch index pattern. */
type IndexWildcard = '*';

type PoolSegment       = `pool=${number       | IndexWildcard}`;
type SandboxSegment    = `sandbox=${string    | IndexWildcard}`;
type DefinitionSegment = `definition=${number | IndexWildcard}`;
type InstanceSegment   = `instance=${number   | IndexWildcard}`;
type RunSegment        = `run=${number        | IndexWildcard}`;

/**
 * Valid OpenSearch index selector for training events.
 *
 * Each member represents the index pattern up to a given field, with the
 * remaining fields replaced by a `.*` wildcard suffix. Fields themselves can
 * be concrete values or `*`. The union is ordered: earlier members are broader
 * selectors, the last member is the fully-qualified pattern.
 *
 * Examples:
 *   crczp.events.trainings.*
 *   crczp.events.trainings.pool=10.*
 *   crczp.events.trainings.pool=10.sandbox=*.definition=1.instance=2.run=*
 */
export type TrainingIndex =
    | `crczp.events.trainings.*`
    | `crczp.events.trainings.${PoolSegment}.*`
    | `crczp.events.trainings.${PoolSegment}.${SandboxSegment}.*`
    | `crczp.events.trainings.${PoolSegment}.${SandboxSegment}.${DefinitionSegment}.*`
    | `crczp.events.trainings.${PoolSegment}.${SandboxSegment}.${DefinitionSegment}.${InstanceSegment}.*`
    | `crczp.events.trainings.${PoolSegment}.${SandboxSegment}.${DefinitionSegment}.${InstanceSegment}.${RunSegment}`;

// ─── Field type map ───

/**
 * Every known field name mapped to its TypeScript value type.
 * Event-specific fields that are absent on some events still appear here —
 * callers are responsible for only querying fields that exist for the events
 * they care about (matching on `type` first is the usual pattern).
 */
export type FieldTypeMap = {
    // AbstractEvent — present in every event
    type:                         string;
    timestamp:                    number;
    sandbox_id:                   string;
    pool_id:                      number;
    training_definition_id:       number;
    training_instance_id:         number;
    training_run_id:              number;
    training_time:                number;
    level:                        number;
    level_order:                  number;
    user_ref_id:                  number;
    actual_score_in_level:        number;
    total_training_level_score:   number;
    total_assessment_level_score: number;

    // TrainingRunEnded
    start_time: number;
    end_time:   number;

    // LevelStarted
    level_type:  LevelType;
    level_title: string;
    max_score:   number;

    // CorrectAnswerSubmitted / WrongAnswerSubmitted
    answer_content: string;
    count:          number;

    // CorrectPasskeySubmitted / WrongPasskeySubmitted
    passkey_content: string;

    // HintTaken
    hint_id:             number;
    hint_title:          string;
    hint_penalty_points: number;

    // SolutionDisplayed
    penalty_points: number;

    // AssessmentAnswers — dynamic JSON payload, not safe to filter on directly
    answers: Record<string, unknown>;
};

export type FieldName = keyof FieldTypeMap;
export type FieldValue<F extends FieldName> = FieldTypeMap[F];

// ─── Derived field-name subsets ───
// Used to enforce meaningful constraints on predicates at the type level.

/** Fields whose values can appear as SQL literals (string | number | boolean). */
export type PrimitiveFieldName = {
    [K in FieldName]: FieldTypeMap[K] extends string | number | boolean ? K : never;
}[FieldName];

/** Fields with string values — valid targets for LIKE / MATCH_QUERY / WILDCARD_QUERY. */
export type StringFieldName = {
    [K in FieldName]: FieldTypeMap[K] extends string ? K : never;
}[FieldName];

/** Fields with numeric values — valid targets for arithmetic comparisons. */
export type NumericFieldName = {
    [K in FieldName]: FieldTypeMap[K] extends number ? K : never;
}[FieldName];
