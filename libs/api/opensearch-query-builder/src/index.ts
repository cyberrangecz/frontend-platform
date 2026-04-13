/**
 * Public API for the OpenSearch SQL query builder.
 *
 * Consumers only need to import from this barrel:
 *
 *   import { QueryBuilder, eq, field, count, EventType } from './opensearch-sql';
 */

// ─── Schema — values ───
export { EventType } from './lib/schema';

// ─── Schema — types ───
export type {
    EventTypeName,
    FieldName,
    FieldTypeMap,
    FieldValue,
    LevelType,
    NumericFieldName,
    PrimitiveFieldName,
    StringFieldName,
    TrainingIndex,
} from './lib/schema';

// ─── AST node types (for advanced / custom use) ───
export type {
    AggregateFunction,
    AnyExpr,
    ComparisonOp,
    JoinClause,
    JoinType,
    MatchQueryOptions,
    MultiMatchOptions,
    OrderByElement,
    Predicate,
    QueryState,
    SelectElement,
    SupportedScalarFunction,
    CastTargetType,
} from './lib/ast';

// ─── Predicate builders ───
export {
    and,
    or,
    not,
    eq,
    neq,
    gt,
    gte,
    lt,
    lte,
    between,
    inList,
    notIn,
    like,
    notLike,
    isNull,
    isNotNull,
    matchQuery,
    multiMatch,
    wildcardQuery,
    score,
} from './lib/predicates';

// ─── Expression builders ───
export {
    field,
    lit,
    as,
    add,
    sub,
    mul,
    div,
    cast,
    agg,
    count,
    sum,
    avg,
    min,
    max,
    fn,
    abs,
    ceil,
    floor,
    round,
    upper,
    lower,
    trim,
    length,
    year,
    month,
    day,
    hour,
    minute,
    second,
    now,
    dateFormat,
} from './lib/expressions';

export { QueryBuilder } from './lib/query-builder';

export { IndexSelectorBuilder, PartialIndexSelectorBuilder } from './lib/index-selector-builder';

export { toSQL } from './lib/sql';
