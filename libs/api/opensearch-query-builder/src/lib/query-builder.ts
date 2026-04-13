/**
 * Fluent SQL query builder for OpenSearch training-event indices.
 *
 * Usage:
 *
 *   const sql = new QueryBuilder('crczp.events.trainings.*')
 *     .select(field('type'), as(count('*'), 'cnt'))
 *     .where(and(
 *       eq('training_run_id', 42),
 *       inList('type', [EventType.LevelStarted, EventType.LevelCompleted]),
 *     ))
 *     .groupBy(field('type'))
 *     .orderBy(field('type'))
 *     .limit(100)
 *     .toSQL();
 */

import type {
    AnyExpr,
    JoinClause,
    JoinType,
    OrderByElement,
    Predicate,
    QueryState,
    SelectElement,
} from './ast';
import { and, or } from './predicates';
import { toSQL } from './sql';
import { TrainingIndex } from './schema';

const emptyState = (): Omit<QueryState, 'index'> => ({
    distinct: false,
    select: ['*'],
    joins: [],
    where: null,
    groupBy: [],
    having: null,
    orderBy: [],
    limit: null,
    offset: null,
});

export class QueryBuilder {
    private state: QueryState;

    constructor(index: TrainingIndex, alias?: string) {
        this.state = { ...emptyState(), index, alias };
    }

    // ─── SELECT ───

    /** Replace the entire SELECT list. */
    select(...elements: SelectElement[]): this {
        this.state = { ...this.state, select: elements };
        return this;
    }

    /** Append to the current SELECT list (removes a leading `*` if present). */
    addSelect(...elements: SelectElement[]): this {
        const current = this.state.select.filter((e) => e !== '*');
        this.state = { ...this.state, select: [...current, ...elements] };
        return this;
    }

    selectAll(): this {
        this.state = { ...this.state, select: ['*'] };
        return this;
    }

    distinct(on = true): this {
        this.state = { ...this.state, distinct: on };
        return this;
    }

    // ─── JOIN ───
    // OpenSearch SQL only supports two-index joins. Additional join() calls will
    // be serialised but will produce invalid SQL at runtime.

    join(index: string, alias: string, on: JoinClause['on']): this {
        return this.pushJoin('INNER', index, alias, on);
    }

    leftJoin(index: string, alias: string, on: JoinClause['on']): this {
        return this.pushJoin('LEFT', index, alias, on);
    }

    /** Cross join has no ON condition. */
    crossJoin(index: string, alias: string): this {
        return this.pushJoin('CROSS', index, alias, undefined);
    }

    private pushJoin(
        type:  JoinType,
        index: string,
        alias: string,
        on:    JoinClause['on'],
    ): this {
        const clause: JoinClause = { type, index, alias, on };
        this.state = { ...this.state, joins: [...this.state.joins, clause] };
        return this;
    }

    // ─── WHERE ───

    /** Replace the WHERE predicate. */
    where(predicate: Predicate): this {
        this.state = { ...this.state, where: predicate };
        return this;
    }

    /**
     * Append an AND condition.
     * Flattens into an existing AndPredicate to avoid unnecessary nesting.
     */
    andWhere(predicate: Predicate): this {
        const w = this.state.where;
        if (!w) {
            this.state = { ...this.state, where: predicate };
        } else if (w.kind === 'and') {
            this.state = {
                ...this.state,
                where: { kind: 'and', operands: [...w.operands, predicate] },
            };
        } else {
            this.state = { ...this.state, where: and(w, predicate) };
        }
        return this;
    }

    /** Append an OR condition. Flattens into an existing OrPredicate. */
    orWhere(predicate: Predicate): this {
        const w = this.state.where;
        if (!w) {
            this.state = { ...this.state, where: predicate };
        } else if (w.kind === 'or') {
            this.state = {
                ...this.state,
                where: { kind: 'or', operands: [...w.operands, predicate] },
            };
        } else {
            this.state = { ...this.state, where: or(w, predicate) };
        }
        return this;
    }

    // ─── GROUP BY ───

    /** Replace the GROUP BY list. */
    groupBy(...exprs: AnyExpr[]): this {
        this.state = { ...this.state, groupBy: exprs };
        return this;
    }

    addGroupBy(...exprs: AnyExpr[]): this {
        this.state = { ...this.state, groupBy: [...this.state.groupBy, ...exprs] };
        return this;
    }

    // ─── HAVING ───

    having(predicate: Predicate): this {
        this.state = { ...this.state, having: predicate };
        return this;
    }

    andHaving(predicate: Predicate): this {
        const h = this.state.having;
        if (!h) {
            this.state = { ...this.state, having: predicate };
        } else if (h.kind === 'and') {
            this.state = {
                ...this.state,
                having: { kind: 'and', operands: [...h.operands, predicate] },
            };
        } else {
            this.state = { ...this.state, having: and(h, predicate) };
        }
        return this;
    }

    // ─── ORDER BY ───

    /**
     * Append an ORDER BY element.
     * `nulls` controls null ordering:
     *   'FIRST' → emits `IS NOT NULL` (OpenSearch puts nulls before non-nulls)
     *   'LAST'  → emits `IS NULL`     (explicitly states the default)
     *   omitted → no null-ordering clause
     */
    orderBy(
        expr:      AnyExpr,
        direction: 'ASC' | 'DESC' = 'ASC',
        nulls?:    'FIRST' | 'LAST',
    ): this {
        const element: OrderByElement = { expr, direction, nulls };
        this.state = { ...this.state, orderBy: [...this.state.orderBy, element] };
        return this;
    }

    // ─── LIMIT / OFFSET ───

    limit(size: number): this {
        this.state = { ...this.state, limit: size };
        return this;
    }

    offset(n: number): this {
        this.state = { ...this.state, offset: n };
        return this;
    }

    // ─── Output ───

    build(): string {
        return toSQL(this.state);
    }

    /** Expose the underlying state for inspection or custom serialisation. */
    getState(): Readonly<QueryState> {
        return this.state;
    }

    /**
     * Produce an independent copy of this builder.
     * Useful for building query variations from a shared base.
     */
    clone(): QueryBuilder {
        const qb = new QueryBuilder(this.state.index, this.state.alias);
        qb.state = {
            ...this.state,
            select:  [...this.state.select],
            joins:   [...this.state.joins],
            groupBy: [...this.state.groupBy],
            orderBy: [...this.state.orderBy],
        };
        return qb;
    }
}
