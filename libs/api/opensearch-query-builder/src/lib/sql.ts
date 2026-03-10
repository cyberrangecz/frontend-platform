/**
 * OpenSearch SQL serialiser — converts a QueryState AST to a SQL string.
 *
 * Clause execution order (not emit order):
 *   FROM → WHERE → GROUP BY → HAVING → SELECT → ORDER BY → LIMIT
 *
 * Emit order (as required by the SQL syntax):
 *   SELECT [DISTINCT] …
 *   FROM index [alias]
 *   [JOIN …]
 *   [WHERE …]
 *   [GROUP BY …]
 *   [HAVING …]
 *   [ORDER BY …]
 *   [LIMIT [offset,] size]
 */

import type {
    AggregateExpr,
    AnyExpr,
    CastExpr,
    FunctionExpr,
    JoinClause,
    LikePredicate,
    MatchQueryPredicate,
    MultiMatchPredicate,
    NullPredicate,
    OrderByElement,
    Predicate,
    QueryState,
    ScorePredicate,
    SelectElement,
    WildcardQueryPredicate,
} from './ast';

// Public entry point

export function toSQL(state: QueryState): string {
    const clauses: string[] = [];

    // SELECT [DISTINCT]
    const selectList = state.select.map(serializeSelectElement).join(', ');
    clauses.push(`SELECT${state.distinct ? ' DISTINCT' : ''} ${selectList}`);

    // FROM
    const fromTarget = state.alias
        ? `${state.index} ${state.alias}`
        : state.index;
    clauses.push(`FROM ${fromTarget}`);

    // JOIN(s)
    for (const join of state.joins) {
        clauses.push(serializeJoin(join));
    }

    // WHERE
    if (state.where) {
        clauses.push(`WHERE ${serializePredicate(state.where)}`);
    }

    // GROUP BY
    if (state.groupBy.length > 0) {
        clauses.push(`GROUP BY ${state.groupBy.map(serializeExpr).join(', ')}`);
    }

    // HAVING
    if (state.having) {
        clauses.push(`HAVING ${serializePredicate(state.having)}`);
    }

    // ORDER BY
    if (state.orderBy.length > 0) {
        clauses.push(`ORDER BY ${state.orderBy.map(serializeOrderBy).join(', ')}`);
    }

    // LIMIT [offset,] size
    if (state.limit !== null) {
        clauses.push(
            state.offset !== null
                ? `LIMIT ${state.offset}, ${state.limit}`
                : `LIMIT ${state.limit}`,
        );
    }

    return clauses.join('\n');
}

// SELECT element

function serializeSelectElement(el: SelectElement): string {
    if (el === '*') return '*';
    if (el.kind === 'aliased') return `${serializeExpr(el.expr)} AS ${quoteIdentifier(el.alias)}`;
    return serializeExpr(el);
}

// Expressions

function serializeExpr(expr: AnyExpr): string {
    switch (expr.kind) {
        case 'field':
            return quoteFieldName(expr.name);

        case 'literal':
            return serializeLiteral(expr.value);

        case 'arithmetic':
            // Parenthesise to preserve explicit operator precedence from the builder.
            return `(${serializeExpr(expr.left)} ${expr.op} ${serializeExpr(expr.right)})`;

        case 'function':
            return serializeFunctionExpr(expr);

        case 'aggregate':
            return serializeAggregateExpr(expr);

        case 'cast':
            return serializeCastExpr(expr);
    }
}

function serializeLiteral(value: string | number | boolean | null): string {
    if (value === null)             return 'NULL';
    if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
    if (typeof value === 'number')  return String(value);
    // String — escape embedded single quotes by doubling them.
    return `'${value.replace(/'/g, "''")}'`;
}

function serializeFunctionExpr(expr: FunctionExpr): string {
    return `${expr.name}(${expr.args.map(serializeExpr).join(', ')})`;
}

function serializeAggregateExpr(expr: AggregateExpr): string {
    const arg      = expr.arg === '*' ? '*' : serializeExpr(expr.arg);
    const distinct = expr.distinct ? 'DISTINCT ' : '';
    return `${expr.fn}(${distinct}${arg})`;
}

function serializeCastExpr(expr: CastExpr): string {
    return `CAST(${serializeExpr(expr.expr)} AS ${expr.targetType})`;
}

// Predicates

function serializePredicate(pred: Predicate): string {
    switch (pred.kind) {
        case 'comparison':
            return `${quoteFieldName(pred.field)} ${pred.op} ${serializeLiteral(pred.value as string | number | boolean | null)}`;

        case 'between':
            return (
                `${quoteFieldName(pred.field)} BETWEEN ` +
                `${serializeLiteral(pred.from as string | number | boolean | null)} AND ` +
                `${serializeLiteral(pred.to as string | number | boolean | null)}`
            );

        case 'in': {
            const values = pred.values
                .map((v) => serializeLiteral(v as string | number | boolean | null))
                .join(', ');
            return `${quoteFieldName(pred.field)} ${pred.negate ? 'NOT IN' : 'IN'} (${values})`;
        }

        case 'like':
            return serializeLikePredicate(pred);

        case 'null':
            return serializeNullPredicate(pred);

        case 'match_query':
            return serializeMatchQuery(pred);

        case 'multi_match':
            return serializeMultiMatch(pred);

        case 'wildcard_query':
            return serializeWildcardQuery(pred);

        case 'score':
            return serializeScore(pred);

        case 'and':
            return `(${pred.operands.map(serializePredicate).join(' AND ')})`;

        case 'or':
            return `(${pred.operands.map(serializePredicate).join(' OR ')})`;

        case 'not':
            return `NOT (${serializePredicate(pred.expr)})`;
    }
}

function serializeLikePredicate(pred: LikePredicate): string {
    // LIKE patterns are passed as-is; the caller owns wildcard escaping.
    const op = pred.negate ? 'NOT LIKE' : 'LIKE';
    return `${quoteFieldName(pred.field)} ${op} '${pred.pattern.replace(/'/g, "''")}'`;
}

function serializeNullPredicate(pred: NullPredicate): string {
    return `${quoteFieldName(pred.field)} IS ${pred.negate ? 'NOT ' : ''}NULL`;
}

function serializeMatchQuery(pred: MatchQueryPredicate): string {
    // MATCH_QUERY(field, 'query'[, option=value]*)
    const args: string[] = [quoteFieldName(pred.field), serializeLiteral(pred.query)];
    if (pred.options?.analyzer !== undefined) {
        args.push(`analyzer=${serializeLiteral(pred.options.analyzer)}`);
    }
    if (pred.options?.boost !== undefined) {
        args.push(`boost=${pred.options.boost}`);
    }
    return `MATCH_QUERY(${args.join(', ')})`;
}

function serializeMultiMatch(pred: MultiMatchPredicate): string {
    // MULTI_MATCH('query'=...[, 'fields'=...][, option=value]*)
    // Note: 'query' and 'fields' keys use quoted names per the OpenSearch SQL spec.
    const args: string[] = [`'query'=${serializeLiteral(pred.query)}`];
    if (pred.fields.length > 0) {
        args.push(`'fields'=${serializeLiteral(pred.fields.join(','))}`);
    }
    const opts = pred.options;
    if (opts) {
        if (opts.analyzer !== undefined)    args.push(`analyzer=${serializeLiteral(opts.analyzer)}`);
        if (opts.boost !== undefined)       args.push(`boost=${opts.boost}`);
        if (opts.slop !== undefined)        args.push(`slop=${opts.slop}`);
        if (opts.type !== undefined)        args.push(`type=${serializeLiteral(opts.type)}`);
        if (opts.tie_breaker !== undefined) args.push(`tie_breaker=${opts.tie_breaker}`);
        if (opts.operator !== undefined)    args.push(`operator=${serializeLiteral(opts.operator)}`);
    }
    return `MULTI_MATCH(${args.join(', ')})`;
}

function serializeWildcardQuery(pred: WildcardQueryPredicate): string {
    // WILDCARD_QUERY(field, 'query'[, boost=n])
    const args: string[] = [quoteFieldName(pred.field), serializeLiteral(pred.query)];
    if (pred.boost !== undefined) args.push(`boost=${pred.boost}`);
    return `WILDCARD_QUERY(${args.join(', ')})`;
}

function serializeScore(pred: ScorePredicate): string {
    // SCORE(MATCH_QUERY(field, 'query')[, boost])
    const boost = pred.boost !== undefined ? `, ${pred.boost}` : '';
    return `SCORE(${serializeMatchQuery(pred.matchExpr)}${boost})`;
}

// ORDER BY

function serializeOrderBy(el: OrderByElement): string {
    let sql = serializeExpr(el.expr);

    // OpenSearch SQL uses `IS [NOT] NULL` before ASC/DESC to control null placement.
    // Default behaviour is NULLS LAST, so NULLS LAST maps to `IS NULL` (explicit default).
    if (el.nulls === 'FIRST') sql += ' IS NOT NULL';
    else if (el.nulls === 'LAST') sql += ' IS NULL';

    sql += ` ${el.direction}`;
    return sql;
}

// JOIN

function serializeJoin(join: JoinClause): string {
    const keyword =
        join.type === 'LEFT'  ? 'LEFT JOIN' :
        join.type === 'CROSS' ? 'JOIN'       : // CROSS = JOIN without ON
        'JOIN';                                  // INNER

    let sql = `${keyword} ${join.index} ${join.alias}`;

    if (join.type !== 'CROSS' && join.on && join.on.length > 0) {
        const conditions = join.on.map((c) => `${c.left} = ${c.right}`).join(' AND ');
        sql += ` ON ${conditions}`;
    }

    return sql;
}

// Identifier quoting

/**
 * Backtick-quote a field name if it contains characters outside `[a-zA-Z0-9_.]`.
 * The dot is kept unquoted because OpenSearch SQL uses it as the nested-field
 * separator (`syslog.severity`). Characters like `@` and `-` must be quoted
 * (`syslog.@timestamp`, `syslog.fromhost-ip`).
 */
function quoteFieldName(name: string): string {
    return /[^a-zA-Z0-9_.]/.test(name) ? `\`${name}\`` : name;
}

/** Backtick-quote alias / identifier strings that need it. */
function quoteIdentifier(name: string): string {
    return /[^a-zA-Z0-9_]/.test(name) ? `\`${name}\`` : name;
}
