/**
 * Predicate builder functions.
 *
 * Every function is generic over the field name so the compiler enforces that
 * the supplied value matches the field's declared type in FieldTypeMap.
 *
 * Example:
 *   eq('timestamp', 'bad')  // TS error — timestamp is number
 *   eq('timestamp', 1234)   // ok
 */

import type {
    BetweenPredicate,
    ComparisonOp,
    ComparisonPredicate,
    InPredicate,
    LikePredicate,
    MatchQueryOptions,
    MatchQueryPredicate,
    MultiMatchOptions,
    MultiMatchPredicate,
    NotPredicate,
    NullPredicate,
    Predicate,
    ScorePredicate,
    WildcardQueryPredicate,
} from './ast';
import type { FieldName, FieldValue, PrimitiveFieldName, StringFieldName } from './schema';

// ─── Comparison ───

function comparison<F extends PrimitiveFieldName>(
    op: ComparisonOp,
    field: F,
    value: FieldValue<F>,
): ComparisonPredicate<F> {
    return { kind: 'comparison', op, field, value };
}

export const eq  = <F extends PrimitiveFieldName>(field: F, value: FieldValue<F>): ComparisonPredicate<F> => comparison('=',  field, value);
export const neq = <F extends PrimitiveFieldName>(field: F, value: FieldValue<F>): ComparisonPredicate<F> => comparison('<>', field, value);
export const gt  = <F extends PrimitiveFieldName>(field: F, value: FieldValue<F>): ComparisonPredicate<F> => comparison('>',  field, value);
export const gte = <F extends PrimitiveFieldName>(field: F, value: FieldValue<F>): ComparisonPredicate<F> => comparison('>=', field, value);
export const lt  = <F extends PrimitiveFieldName>(field: F, value: FieldValue<F>): ComparisonPredicate<F> => comparison('<',  field, value);
export const lte = <F extends PrimitiveFieldName>(field: F, value: FieldValue<F>): ComparisonPredicate<F> => comparison('<=', field, value);

// ─── Range ───

export function between<F extends PrimitiveFieldName>(
    field: F,
    from:  FieldValue<F>,
    to:    FieldValue<F>,
): BetweenPredicate<F> {
    return { kind: 'between', field, from, to };
}

export function inList<F extends PrimitiveFieldName>(
    field:  F,
    values: FieldValue<F>[],
): InPredicate<F> {
    return { kind: 'in', field, values };
}

export function notIn<F extends PrimitiveFieldName>(
    field:  F,
    values: FieldValue<F>[],
): InPredicate<F> {
    return { kind: 'in', field, values, negate: true };
}

// ─── String pattern ───

export function like<F extends StringFieldName>(field: F, pattern: string): LikePredicate<F> {
    return { kind: 'like', field, pattern };
}

export function notLike<F extends StringFieldName>(field: F, pattern: string): LikePredicate<F> {
    return { kind: 'like', field, pattern, negate: true };
}

// ─── Null ───

export function isNull(field: FieldName): NullPredicate {
    return { kind: 'null', field, negate: false };
}

export function isNotNull(field: FieldName): NullPredicate {
    return { kind: 'null', field, negate: true };
}

// ─── Full-text / relevance ───

export function matchQuery<F extends StringFieldName>(
    field:    F,
    query:    string,
    options?: MatchQueryOptions,
): MatchQueryPredicate<F> {
    return { kind: 'match_query', field, query, options };
}

export function multiMatch(
    fields:   StringFieldName[],
    query:    string,
    options?: MultiMatchOptions,
): MultiMatchPredicate {
    return { kind: 'multi_match', fields, query, options };
}

export function wildcardQuery<F extends StringFieldName>(
    field:  F,
    query:  string,
    boost?: number,
): WildcardQueryPredicate<F> {
    return { kind: 'wildcard_query', field, query, boost };
}

/**
 * SCORE(MATCH_QUERY(field, 'query'), boost)
 * Filters by relevance score; used in WHERE to rank-filter results.
 */
export function score(
    matchExpr: MatchQueryPredicate,
    boost?:    number,
): ScorePredicate {
    return { kind: 'score', matchExpr, boost };
}

// ─── Logical connectives ───

/**
 * Combines predicates with AND.
 * Accepts 1..n predicates; a single predicate is returned as-is.
 * When appending to an existing AndPredicate (as `andWhere` does), the
 * builder flattens operands to avoid deep nesting.
 */
export function and(...operands: [Predicate, ...Predicate[]]): Predicate {
    if (operands.length === 1) return operands[0];
    return { kind: 'and', operands };
}

/** Combines predicates with OR. Single predicate is returned as-is. */
export function or(...operands: [Predicate, ...Predicate[]]): Predicate {
    if (operands.length === 1) return operands[0];
    return { kind: 'or', operands };
}

export function not(expr: Predicate): NotPredicate {
    return { kind: 'not', expr };
}
