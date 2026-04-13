/**
 * AST node types for the OpenSearch SQL query builder.
 *
 * Two root hierarchies:
 *   Predicate — used in WHERE / HAVING (boolean-valued)
 *   AnyExpr   — used in SELECT / GROUP BY / ORDER BY / function args (scalar-valued)
 *
 * Generic parameters (e.g. `F extends FieldName`) are narrowed when building
 * nodes via the helper functions in predicates.ts / expressions.ts so the
 * compiler enforces value types per field. At the `Predicate`/`AnyExpr` union
 * level the parameter defaults to the full union, which is correct for storage
 * and serialization.
 */

import type {
    FieldName,
    FieldValue,
    PrimitiveFieldName,
    StringFieldName,
    TrainingIndex,
} from './schema';

// Predicates

export type ComparisonOp = '=' | '<>' | '>' | '<' | '>=' | '<=';

export type ComparisonPredicate<F extends PrimitiveFieldName = PrimitiveFieldName> = {
    kind: 'comparison';
    op:    ComparisonOp;
    field: F;
    value: FieldValue<F>;
};

export type BetweenPredicate<F extends PrimitiveFieldName = PrimitiveFieldName> = {
    kind:  'between';
    field: F;
    from:  FieldValue<F>;
    to:    FieldValue<F>;
};

export type InPredicate<F extends PrimitiveFieldName = PrimitiveFieldName> = {
    kind:   'in';
    field:  F;
    values: FieldValue<F>[];
    negate?: boolean; // true = NOT IN
};

/** SQL LIKE pattern — `%` matches any sequence, `_` matches any single char. */
export type LikePredicate<F extends StringFieldName = StringFieldName> = {
    kind:    'like';
    field:   F;
    pattern: string;
    negate?: boolean; // true = NOT LIKE
};

export type NullPredicate<F extends FieldName = FieldName> = {
    kind:   'null';
    field:  F;
    negate: boolean; // false = IS NULL, true = IS NOT NULL
};

// ─── Full-text / relevance predicates ───

export type MatchQueryOptions = {
    analyzer?: string;
    boost?:    number;
};

export type MatchQueryPredicate<F extends StringFieldName = StringFieldName> = {
    kind:     'match_query';
    field:    F;
    query:    string;
    options?: MatchQueryOptions;
};

export type MultiMatchOptions = {
    analyzer?:    string;
    boost?:       number;
    slop?:        number;
    type?:        string;
    tie_breaker?: number;
    operator?:    'AND' | 'OR';
};

export type MultiMatchPredicate = {
    kind:     'multi_match';
    fields:   StringFieldName[];
    query:    string;
    options?: MultiMatchOptions;
};

export type WildcardQueryPredicate<F extends StringFieldName = StringFieldName> = {
    kind:   'wildcard_query';
    field:  F;
    query:  string; // supports * and ? wildcards
    boost?: number;
};

/**
 * SCORE(MATCH_QUERY(field, 'query'), boost) — used in WHERE to filter by
 * relevance score. See opensearch-functions doc.
 */
export type ScorePredicate = {
    kind:      'score';
    matchExpr: MatchQueryPredicate;
    boost?:    number;
};

// ─── Logical connectives ───

/** n-ary AND — serialised as (p1 AND p2 AND …). */
export type AndPredicate = {
    kind:     'and';
    operands: Predicate[];
};

/** n-ary OR — serialised as (p1 OR p2 OR …). */
export type OrPredicate = {
    kind:     'or';
    operands: Predicate[];
};

export type NotPredicate = {
    kind: 'not';
    expr: Predicate;
};

export type Predicate =
    | ComparisonPredicate
    | BetweenPredicate
    | InPredicate
    | LikePredicate
    | NullPredicate
    | MatchQueryPredicate
    | MultiMatchPredicate
    | WildcardQueryPredicate
    | ScorePredicate
    | AndPredicate
    | OrPredicate
    | NotPredicate;

// Expressions

export type FieldRef<F extends FieldName = FieldName> = {
    kind: 'field';
    name: F;
};

export type Literal = {
    kind:  'literal';
    value: string | number | boolean | null;
};

export type ArithmeticOp = '+' | '-' | '*' | '/';

export type ArithmeticExpr = {
    kind:  'arithmetic';
    op:    ArithmeticOp;
    left:  AnyExpr;
    right: AnyExpr;
};

export type AggregateFunction = 'COUNT' | 'AVG' | 'SUM' | 'MIN' | 'MAX';

export type AggregateExpr = {
    kind:      'aggregate';
    fn:        AggregateFunction;
    arg:       AnyExpr | '*'; // COUNT(*) uses '*'
    distinct?: boolean;
};

export type SupportedScalarFunction =
    // Math
    | 'ABS' | 'CEIL' | 'FLOOR' | 'ROUND' | 'SQRT' | 'POW' | 'MOD'
    | 'LOG' | 'LOG2' | 'LOG10' | 'EXP'
    // String
    | 'UPPER' | 'LOWER' | 'TRIM' | 'LTRIM' | 'RTRIM' | 'LENGTH'
    | 'SUBSTRING' | 'REPLACE' | 'CONCAT' | 'LEFT' | 'RIGHT'
    | 'LOCATE' | 'REVERSE'
    // Date / time
    | 'NOW' | 'CURDATE' | 'DATE' | 'TIME' | 'YEAR' | 'MONTH' | 'DAY'
    | 'HOUR' | 'MINUTE' | 'SECOND' | 'DAYOFWEEK' | 'DAYOFMONTH'
    | 'DAYOFYEAR' | 'DATE_FORMAT' | 'DATE_ADD' | 'DATE_SUB'
    | 'DATEDIFF' | 'TIMESTAMPDIFF'
    // Conditional
    | 'IF' | 'IFNULL' | 'NULLIF' | 'ISNULL';

export type FunctionExpr = {
    kind: 'function';
    name: SupportedScalarFunction;
    args: AnyExpr[];
};

/**
 * CAST(expr AS type) — separate from FunctionExpr because its syntax is
 * `CAST(expr AS TYPE_KEYWORD)` rather than `fn(arg, arg)`.
 */
export type CastTargetType =
    | 'INT' | 'LONG' | 'DOUBLE' | 'FLOAT' | 'STRING'
    | 'DATE' | 'TIME' | 'DATETIME' | 'BOOLEAN';

export type CastExpr = {
    kind:       'cast';
    expr:       AnyExpr;
    targetType: CastTargetType;
};

export type AnyExpr =
    | FieldRef
    | Literal
    | ArithmeticExpr
    | FunctionExpr
    | AggregateExpr
    | CastExpr;

/** An expression given a SQL alias: `expr AS alias`. */
export type Aliased<E extends AnyExpr = AnyExpr> = {
    kind:  'aliased';
    expr:  E;
    alias: string;
};

/** One element of a SELECT list. */
export type SelectElement = AnyExpr | Aliased | '*';

// Query structure

export type OrderByElement = {
    expr:      AnyExpr;
    direction: 'ASC' | 'DESC';
    /**
     * OpenSearch's default is NULLS LAST.
     * 'FIRST' emits `IS NOT NULL` before ASC/DESC (reverses the default).
     * 'LAST'  emits `IS NULL`     before ASC/DESC (explicit default).
     * Omitting produces no null-ordering clause.
     */
    nulls?: 'FIRST' | 'LAST';
};

export type JoinType = 'INNER' | 'LEFT' | 'CROSS';

/**
 * Join clause — intentionally untyped for field references.
 * OpenSearch SQL only supports two-index joins; additional JOINs will produce
 * invalid SQL (the builder does not enforce this constraint).
 */
export type JoinClause = {
    type:   JoinType;
    index:  string;
    alias:  string;
    /** CROSS joins have no ON condition. */
    on?: { left: string; right: string }[];
};

export type QueryState = {
    index:    TrainingIndex;
    alias?:   string;
    distinct: boolean;
    select:   SelectElement[];
    joins:    JoinClause[];
    where:    Predicate | null;
    groupBy:  AnyExpr[];
    having:   Predicate | null;
    orderBy:  OrderByElement[];
    limit:    number | null;
    offset:   number | null;
};
