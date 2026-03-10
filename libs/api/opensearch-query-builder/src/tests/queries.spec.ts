/**
 * Full-query tests for the OpenSearch SQL query builder.
 *
 * Every assertion checks the complete toSQL() output. This intentionally
 * covers SELECT, WHERE, GROUP BY, HAVING, ORDER BY, LIMIT, JOINs, and
 * combinations thereof — catching serialisation bugs that narrow unit tests
 * would miss.
 */

import { describe, expect, it } from 'vitest';
import { QueryBuilder } from '../lib/query-builder';
import {
    and,
    between,
    eq,
    gt,
    gte,
    inList,
    isNotNull,
    isNull,
    like,
    lt,
    matchQuery,
    multiMatch,
    neq,
    not,
    notIn,
    notLike,
    or,
    score,
    wildcardQuery
} from '../lib/predicates';
import {
    as,
    avg,
    cast,
    count,
    dateFormat,
    div,
    field,
    fn,
    lit,
    max,
    min,
    mul,
    round,
    sub,
    sum
} from '../lib/expressions';
import { EventType } from '../lib/schema';

/** Join SQL lines into a single string (mirrors toSQL() clause separator). */
const L = (...lines: string[]) => lines.join('\n');

// ─── Basic SELECT shapes ───────────────────────────────────────────────────────

describe('SELECT shapes', () => {
    it('defaults to SELECT * with no select() call', () => {
        expect(new QueryBuilder('crczp.events.trainings.*').toSQL()).toBe(L(
            'SELECT *',
            'FROM crczp.events.trainings.*',
        ));
    });

    it('SELECT specific fields', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(field('training_run_id'), field('type'), field('timestamp'))
                .toSQL(),
        ).toBe(L(
            'SELECT training_run_id, type, timestamp',
            'FROM crczp.events.trainings.*',
        ));
    });

    it('SELECT with aggregate alias', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(field('training_run_id'), as(count('*'), 'cnt'))
                .toSQL(),
        ).toBe(L(
            'SELECT training_run_id, COUNT(*) AS cnt',
            'FROM crczp.events.trainings.*',
        ));
    });

    it('SELECT DISTINCT single column', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(field('user_ref_id'))
                .distinct()
                .toSQL(),
        ).toBe(L(
            'SELECT DISTINCT user_ref_id',
            'FROM crczp.events.trainings.*',
        ));
    });

    it('addSelect appends columns and strips leading *', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .addSelect(field('type'))
                .addSelect(field('timestamp'))
                .toSQL(),
        ).toBe(L(
            'SELECT type, timestamp',
            'FROM crczp.events.trainings.*',
        ));
    });

    it('selectAll() resets back to SELECT *', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(field('type'))
                .selectAll()
                .toSQL(),
        ).toBe(L(
            'SELECT *',
            'FROM crczp.events.trainings.*',
        ));
    });

    it('FROM with index alias', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*', 'e')
                .select(field('type'), field('timestamp'))
                .toSQL(),
        ).toBe(L(
            'SELECT type, timestamp',
            'FROM crczp.events.trainings.* e',
        ));
    });
});

// ─── WHERE conditions ─────────────────────────────────────────────────────────

describe('WHERE conditions', () => {
    it('equality on number field', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(field('type'), field('level'))
                .where(eq('training_run_id', 42))
                .toSQL(),
        ).toBe(L(
            'SELECT type, level',
            'FROM crczp.events.trainings.*',
            'WHERE training_run_id = 42',
        ));
    });

    it('equality on EventType constant', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select('*')
                .where(eq('type', EventType.LevelStarted))
                .toSQL(),
        ).toBe(L(
            'SELECT *',
            'FROM crczp.events.trainings.*',
            `WHERE type = 'cz.cyberrange.platform.events.trainings.LevelStarted'`,
        ));
    });

    it('not equal on string field', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(field('training_run_id'), field('type'))
                .where(neq('type', EventType.AssessmentAnswers))
                .toSQL(),
        ).toBe(L(
            'SELECT training_run_id, type',
            'FROM crczp.events.trainings.*',
            `WHERE type <> 'cz.cyberrange.platform.events.trainings.AssessmentAnswers'`,
        ));
    });

    it('BETWEEN on timestamp range', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(field('type'), field('timestamp'))
                .where(between('timestamp', 1700000000000, 1800000000000))
                .toSQL(),
        ).toBe(L(
            'SELECT type, timestamp',
            'FROM crczp.events.trainings.*',
            'WHERE timestamp BETWEEN 1700000000000 AND 1800000000000',
        ));
    });

    it('IN list of EventType values', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(field('type'), field('training_run_id'), field('actual_score_in_level'))
                .where(inList('type', [EventType.LevelStarted, EventType.LevelCompleted]))
                .toSQL(),
        ).toBe(L(
            'SELECT type, training_run_id, actual_score_in_level',
            'FROM crczp.events.trainings.*',
            `WHERE type IN ('cz.cyberrange.platform.events.trainings.LevelStarted', 'cz.cyberrange.platform.events.trainings.LevelCompleted')`,
        ));
    });

    it('NOT IN on level_order', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select('*')
                .where(notIn('level_order', [0, 9, 10]))
                .toSQL(),
        ).toBe(L(
            'SELECT *',
            'FROM crczp.events.trainings.*',
            'WHERE level_order NOT IN (0, 9, 10)',
        ));
    });

    it('IS NULL on optional field', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(field('training_run_id'), field('hint_title'))
                .where(isNull('hint_title'))
                .toSQL(),
        ).toBe(L(
            'SELECT training_run_id, hint_title',
            'FROM crczp.events.trainings.*',
            'WHERE hint_title IS NULL',
        ));
    });

    it('IS NOT NULL on level_title', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select('*')
                .where(isNotNull('level_title'))
                .toSQL(),
        ).toBe(L(
            'SELECT *',
            'FROM crczp.events.trainings.*',
            'WHERE level_title IS NOT NULL',
        ));
    });

    it('LIKE prefix pattern', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(field('training_run_id'), field('type'))
                .where(like('type', 'cz.cyberrange.platform.events.trainings.%'))
                .toSQL(),
        ).toBe(L(
            'SELECT training_run_id, type',
            'FROM crczp.events.trainings.*',
            `WHERE type LIKE 'cz.cyberrange.platform.events.trainings.%'`,
        ));
    });

    it('NOT LIKE filter', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select('*')
                .where(notLike('level_title', 'Draft%'))
                .toSQL(),
        ).toBe(L(
            'SELECT *',
            'FROM crczp.events.trainings.*',
            `WHERE level_title NOT LIKE 'Draft%'`,
        ));
    });

    it('MATCH_QUERY with analyzer and boost', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select('*')
                .where(matchQuery('level_title', 'network security', { analyzer: 'standard', boost: 1.5 }))
                .toSQL(),
        ).toBe(L(
            'SELECT *',
            'FROM crczp.events.trainings.*',
            `WHERE MATCH_QUERY(level_title, 'network security', analyzer='standard', boost=1.5)`,
        ));
    });

    it('MULTI_MATCH across fields with AND operator', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(field('training_run_id'), field('type'))
                .where(multiMatch(['type', 'level_title'], 'security', { operator: 'AND' }))
                .toSQL(),
        ).toBe(L(
            'SELECT training_run_id, type',
            'FROM crczp.events.trainings.*',
            `WHERE MULTI_MATCH('query'='security', 'fields'='type,level_title', operator='AND')`,
        ));
    });

    it('WILDCARD_QUERY with boost', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select('*')
                .where(wildcardQuery('type', 'cz.cyberrange.*', 2))
                .toSQL(),
        ).toBe(L(
            'SELECT *',
            'FROM crczp.events.trainings.*',
            `WHERE WILDCARD_QUERY(type, 'cz.cyberrange.*', boost=2)`,
        ));
    });

    it('SCORE wrapping MATCH_QUERY', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(field('training_run_id'), field('level_title'))
                .where(score(matchQuery('level_title', 'firewall'), 1.2))
                .toSQL(),
        ).toBe(L(
            'SELECT training_run_id, level_title',
            'FROM crczp.events.trainings.*',
            `WHERE SCORE(MATCH_QUERY(level_title, 'firewall'), 1.2)`,
        ));
    });

    it('compound AND — run id + event type', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(field('type'), field('level'), field('actual_score_in_level'))
                .where(and(
                    eq('training_run_id', 7),
                    eq('type', EventType.LevelCompleted),
                ))
                .toSQL(),
        ).toBe(L(
            'SELECT type, level, actual_score_in_level',
            'FROM crczp.events.trainings.*',
            `WHERE (training_run_id = 7 AND type = 'cz.cyberrange.platform.events.trainings.LevelCompleted')`,
        ));
    });

    it('compound OR — two event types', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(field('training_run_id'), field('type'), field('timestamp'))
                .where(or(
                    eq('type', EventType.CorrectAnswerSubmitted),
                    eq('type', EventType.WrongAnswerSubmitted),
                ))
                .toSQL(),
        ).toBe(L(
            'SELECT training_run_id, type, timestamp',
            'FROM crczp.events.trainings.*',
            `WHERE (type = 'cz.cyberrange.platform.events.trainings.CorrectAnswerSubmitted' OR type = 'cz.cyberrange.platform.events.trainings.WrongAnswerSubmitted')`,
        ));
    });

    it('NOT wrapping a predicate', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select('*')
                .where(not(eq('level_type', 'ASSESSMENT')))
                .toSQL(),
        ).toBe(L(
            'SELECT *',
            'FROM crczp.events.trainings.*',
            `WHERE NOT (level_type = 'ASSESSMENT')`,
        ));
    });

    it('nested AND/OR — run filter AND (high score OR hint taken)', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(field('training_run_id'), field('type'), field('actual_score_in_level'))
                .where(and(
                    eq('training_run_id', 15),
                    or(
                        gt('actual_score_in_level', 80),
                        eq('type', EventType.HintTaken),
                    ),
                ))
                .toSQL(),
        ).toBe(L(
            'SELECT training_run_id, type, actual_score_in_level',
            'FROM crczp.events.trainings.*',
            `WHERE (training_run_id = 15 AND (actual_score_in_level > 80 OR type = 'cz.cyberrange.platform.events.trainings.HintTaken'))`,
        ));
    });

    it('andWhere() flattens repeated calls into one flat AND', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(field('type'), field('level'))
                .where(eq('training_run_id', 3))
                .andWhere(eq('type', EventType.LevelCompleted))
                .andWhere(gte('actual_score_in_level', 50))
                .toSQL(),
        ).toBe(L(
            'SELECT type, level',
            'FROM crczp.events.trainings.*',
            `WHERE (training_run_id = 3 AND type = 'cz.cyberrange.platform.events.trainings.LevelCompleted' AND actual_score_in_level >= 50)`,
        ));
    });

    it('orWhere() flattens repeated calls into one flat OR', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select('*')
                .where(eq('type', EventType.HintTaken))
                .orWhere(eq('type', EventType.SolutionDisplayed))
                .orWhere(eq('type', EventType.WrongAnswerSubmitted))
                .toSQL(),
        ).toBe(L(
            'SELECT *',
            'FROM crczp.events.trainings.*',
            `WHERE (type = 'cz.cyberrange.platform.events.trainings.HintTaken' OR type = 'cz.cyberrange.platform.events.trainings.SolutionDisplayed' OR type = 'cz.cyberrange.platform.events.trainings.WrongAnswerSubmitted')`,
        ));
    });
});

// ─── Special character field names ────────────────────────────────────────────

describe('field name quoting', () => {

    it("string literal with embedded single quote is escaped", () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select('*')
                .where(eq('level_title', "Attacker's Toolkit"))
                .toSQL(),
        ).toBe(L(
            'SELECT *',
            'FROM crczp.events.trainings.*',
            `WHERE level_title = 'Attacker''s Toolkit'`,
        ));
    });

    it('LIKE pattern with embedded single quote is escaped', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select('*')
                .where(like('level_title', "it's%"))
                .toSQL(),
        ).toBe(L(
            'SELECT *',
            'FROM crczp.events.trainings.*',
            `WHERE level_title LIKE 'it''s%'`,
        ));
    });
});

// ─── GROUP BY and HAVING ──────────────────────────────────────────────────────

describe('GROUP BY and HAVING', () => {
    it('event count per training run', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(field('training_run_id'), as(count('*'), 'event_count'))
                .where(eq('type', EventType.LevelCompleted))
                .groupBy(field('training_run_id'))
                .orderBy(field('training_run_id'), 'ASC')
                .toSQL(),
        ).toBe(L(
            'SELECT training_run_id, COUNT(*) AS event_count',
            'FROM crczp.events.trainings.*',
            `WHERE type = 'cz.cyberrange.platform.events.trainings.LevelCompleted'`,
            'GROUP BY training_run_id',
            'ORDER BY training_run_id ASC',
        ));
    });

    it('average score per level with HAVING threshold', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(field('level'), as(avg(field('actual_score_in_level')), 'avg_score'))
                .where(eq('type', EventType.LevelCompleted))
                .groupBy(field('level'))
                .having(gt('avg_score' as any, 60))
                .orderBy(field('level'), 'ASC')
                .toSQL(),
        ).toBe(L(
            'SELECT level, AVG(actual_score_in_level) AS avg_score',
            'FROM crczp.events.trainings.*',
            `WHERE type = 'cz.cyberrange.platform.events.trainings.LevelCompleted'`,
            'GROUP BY level',
            'HAVING avg_score > 60',
            'ORDER BY level ASC',
        ));
    });

    it('events bucketed by month using DATE_FORMAT', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(
                    as(dateFormat(field('timestamp'), lit('%Y-%m')), 'month'),
                    as(count('*'), 'cnt'),
                )
                .groupBy(dateFormat(field('timestamp'), lit('%Y-%m')))
                .orderBy(dateFormat(field('timestamp'), lit('%Y-%m')), 'ASC')
                .toSQL(),
        ).toBe(L(
            `SELECT DATE_FORMAT(timestamp, '%Y-%m') AS month, COUNT(*) AS cnt`,
            'FROM crczp.events.trainings.*',
            `GROUP BY DATE_FORMAT(timestamp, '%Y-%m')`,
            `ORDER BY DATE_FORMAT(timestamp, '%Y-%m') ASC`,
        ));
    });

    it('event count per type per month', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(
                    as(dateFormat(field('timestamp'), lit('%Y-%m')), 'month'),
                    field('type'),
                    as(count('*'), 'cnt'),
                )
                .groupBy(
                    dateFormat(field('timestamp'), lit('%Y-%m')),
                    field('type'),
                )
                .orderBy(dateFormat(field('timestamp'), lit('%Y-%m')), 'ASC')
                .orderBy(field('type'), 'ASC')
                .toSQL(),
        ).toBe(L(
            `SELECT DATE_FORMAT(timestamp, '%Y-%m') AS month, type, COUNT(*) AS cnt`,
            'FROM crczp.events.trainings.*',
            `GROUP BY DATE_FORMAT(timestamp, '%Y-%m'), type`,
            `ORDER BY DATE_FORMAT(timestamp, '%Y-%m') ASC, type ASC`,
        ));
    });

    it('hint count per user with HAVING requiring at least 2', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(field('user_ref_id'), as(count('*'), 'hint_count'))
                .where(and(
                    eq('training_run_id', 10),
                    eq('type', EventType.HintTaken),
                ))
                .groupBy(field('user_ref_id'))
                .having(gte('hint_count' as any, 2))
                .orderBy(field('hint_count' as any), 'DESC')
                .toSQL(),
        ).toBe(L(
            'SELECT user_ref_id, COUNT(*) AS hint_count',
            'FROM crczp.events.trainings.*',
            `WHERE (training_run_id = 10 AND type = 'cz.cyberrange.platform.events.trainings.HintTaken')`,
            'GROUP BY user_ref_id',
            'HAVING hint_count >= 2',
            'ORDER BY hint_count DESC',
        ));
    });

    it('addGroupBy appends to existing GROUP BY', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(field('training_run_id'), field('level'), as(count('*'), 'cnt'))
                .groupBy(field('training_run_id'))
                .addGroupBy(field('level'))
                .toSQL(),
        ).toBe(L(
            'SELECT training_run_id, level, COUNT(*) AS cnt',
            'FROM crczp.events.trainings.*',
            'GROUP BY training_run_id, level',
        ));
    });

    it('andHaving() flattens multiple HAVING conditions', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(
                    field('training_run_id'),
                    as(count('*'), 'cnt'),
                    as(avg(field('actual_score_in_level')), 'avg_score'),
                )
                .groupBy(field('training_run_id'))
                .having(gt('cnt' as any, 5))
                .andHaving(gte('avg_score' as any, 40))
                .toSQL(),
        ).toBe(L(
            'SELECT training_run_id, COUNT(*) AS cnt, AVG(actual_score_in_level) AS avg_score',
            'FROM crczp.events.trainings.*',
            'GROUP BY training_run_id',
            'HAVING (cnt > 5 AND avg_score >= 40)',
        ));
    });
});

// ─── ORDER BY ────────────────────────────────────────────────────────────────

describe('ORDER BY', () => {
    it('single column DESC', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(field('training_run_id'), field('timestamp'))
                .where(eq('type', EventType.TrainingRunStarted))
                .orderBy(field('timestamp'), 'DESC')
                .toSQL(),
        ).toBe(L(
            'SELECT training_run_id, timestamp',
            'FROM crczp.events.trainings.*',
            `WHERE type = 'cz.cyberrange.platform.events.trainings.TrainingRunStarted'`,
            'ORDER BY timestamp DESC',
        ));
    });

    it('multiple ORDER BY columns', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(field('training_run_id'), field('level'), field('actual_score_in_level'))
                .orderBy(field('training_run_id'), 'ASC')
                .orderBy(field('level'), 'ASC')
                .orderBy(field('actual_score_in_level'), 'DESC')
                .toSQL(),
        ).toBe(L(
            'SELECT training_run_id, level, actual_score_in_level',
            'FROM crczp.events.trainings.*',
            'ORDER BY training_run_id ASC, level ASC, actual_score_in_level DESC',
        ));
    });

    it('NULLS FIRST: emits IS NOT NULL before direction', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(field('user_ref_id'), field('hint_title'))
                .orderBy(field('hint_title'), 'ASC', 'FIRST')
                .toSQL(),
        ).toBe(L(
            'SELECT user_ref_id, hint_title',
            'FROM crczp.events.trainings.*',
            'ORDER BY hint_title IS NOT NULL ASC',
        ));
    });

    it('NULLS LAST: emits IS NULL before direction', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(field('user_ref_id'), field('hint_title'))
                .orderBy(field('hint_title'), 'DESC', 'LAST')
                .toSQL(),
        ).toBe(L(
            'SELECT user_ref_id, hint_title',
            'FROM crczp.events.trainings.*',
            'ORDER BY hint_title IS NULL DESC',
        ));
    });

    it('ORDER BY aggregate', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(field('training_run_id'), as(count('*'), 'cnt'))
                .groupBy(field('training_run_id'))
                .orderBy(count('*'), 'DESC')
                .limit(10)
                .toSQL(),
        ).toBe(L(
            'SELECT training_run_id, COUNT(*) AS cnt',
            'FROM crczp.events.trainings.*',
            'GROUP BY training_run_id',
            'ORDER BY COUNT(*) DESC',
            'LIMIT 10',
        ));
    });

    it('ORDER BY arithmetic expression', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(
                    field('training_run_id'),
                    as(sub(field('end_time'), field('start_time')), 'duration'),
                )
                .where(eq('type', EventType.TrainingRunEnded))
                .orderBy(sub(field('end_time'), field('start_time')), 'ASC')
                .toSQL(),
        ).toBe(L(
            'SELECT training_run_id, (end_time - start_time) AS duration',
            'FROM crczp.events.trainings.*',
            `WHERE type = 'cz.cyberrange.platform.events.trainings.TrainingRunEnded'`,
            'ORDER BY (end_time - start_time) ASC',
        ));
    });
});

// ─── LIMIT and OFFSET ─────────────────────────────────────────────────────────

describe('LIMIT and OFFSET', () => {
    it('LIMIT only', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select('*')
                .where(eq('training_run_id', 1))
                .orderBy(field('timestamp'), 'ASC')
                .limit(100)
                .toSQL(),
        ).toBe(L(
            'SELECT *',
            'FROM crczp.events.trainings.*',
            'WHERE training_run_id = 1',
            'ORDER BY timestamp ASC',
            'LIMIT 100',
        ));
    });

    it('LIMIT with OFFSET uses MySQL-style LIMIT offset, size syntax', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select('*')
                .orderBy(field('timestamp'), 'ASC')
                .limit(20)
                .offset(40)
                .toSQL(),
        ).toBe(L(
            'SELECT *',
            'FROM crczp.events.trainings.*',
            'ORDER BY timestamp ASC',
            'LIMIT 40, 20',
        ));
    });
});

// ─── Expressions in SELECT ────────────────────────────────────────────────────

describe('expressions in SELECT', () => {
    it('arithmetic: percentage score', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(
                    field('training_run_id'),
                    as(mul(div(field('actual_score_in_level'), field('max_score')), lit(100)), 'pct'),
                )
                .where(eq('type', EventType.LevelCompleted))
                .toSQL(),
        ).toBe(L(
            'SELECT training_run_id, ((actual_score_in_level / max_score) * 100) AS pct',
            'FROM crczp.events.trainings.*',
            `WHERE type = 'cz.cyberrange.platform.events.trainings.LevelCompleted'`,
        ));
    });

    it('CAST timestamp to DATETIME', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(
                    field('training_run_id'),
                    as(cast(field('timestamp'), 'DATETIME'), 'event_time'),
                )
                .where(eq('training_run_id', 5))
                .toSQL(),
        ).toBe(L(
            'SELECT training_run_id, CAST(timestamp AS DATETIME) AS event_time',
            'FROM crczp.events.trainings.*',
            'WHERE training_run_id = 5',
        ));
    });

    it('COUNT(DISTINCT user_ref_id)', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(
                    field('training_run_id'),
                    as(count(field('user_ref_id'), true), 'unique_users'),
                )
                .where(eq('type', EventType.LevelStarted))
                .groupBy(field('training_run_id'))
                .toSQL(),
        ).toBe(L(
            'SELECT training_run_id, COUNT(DISTINCT user_ref_id) AS unique_users',
            'FROM crczp.events.trainings.*',
            `WHERE type = 'cz.cyberrange.platform.events.trainings.LevelStarted'`,
            'GROUP BY training_run_id',
        ));
    });

    it('SUM, AVG, MIN, MAX aggregates in one query', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(
                    field('training_run_id'),
                    as(sum(field('actual_score_in_level')), 'total_score'),
                    as(round(avg(field('actual_score_in_level')), lit(2)), 'avg_score'),
                    as(min(field('actual_score_in_level')), 'min_score'),
                    as(max(field('actual_score_in_level')), 'max_score'),
                )
                .where(eq('type', EventType.LevelCompleted))
                .groupBy(field('training_run_id'))
                .toSQL(),
        ).toBe(L(
            'SELECT training_run_id, SUM(actual_score_in_level) AS total_score, ROUND(AVG(actual_score_in_level), 2) AS avg_score, MIN(actual_score_in_level) AS min_score, MAX(actual_score_in_level) AS max_score',
            'FROM crczp.events.trainings.*',
            `WHERE type = 'cz.cyberrange.platform.events.trainings.LevelCompleted'`,
            'GROUP BY training_run_id',
        ));
    });

    it('IFNULL to replace NULL hint_title with a default', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(
                    field('training_run_id'),
                    as(fn('IFNULL', field('hint_title'), lit('(no title)')), 'hint_label'),
                    field('hint_penalty_points'),
                )
                .where(eq('type', EventType.HintTaken))
                .orderBy(field('timestamp'), 'ASC')
                .toSQL(),
        ).toBe(L(
            `SELECT training_run_id, IFNULL(hint_title, '(no title)') AS hint_label, hint_penalty_points`,
            'FROM crczp.events.trainings.*',
            `WHERE type = 'cz.cyberrange.platform.events.trainings.HintTaken'`,
            'ORDER BY timestamp ASC',
        ));
    });
});

// ─── JOINs ───────────────────────────────────────────────────────────────────

describe('JOINs', () => {
    it('INNER JOIN with ON condition', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*', 'e')
                .select('*')
                .join('crczp.runs', 'r', [{ left: 'e.training_run_id', right: 'r.id' }])
                .where(eq('training_run_id', 42))
                .toSQL(),
        ).toBe(L(
            'SELECT *',
            'FROM crczp.events.trainings.* e',
            'JOIN crczp.runs r ON e.training_run_id = r.id',
            'WHERE training_run_id = 42',
        ));
    });

    it('LEFT JOIN with ON condition', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*', 'e')
                .select('*')
                .leftJoin('crczp.runs', 'r', [{ left: 'e.training_run_id', right: 'r.id' }])
                .toSQL(),
        ).toBe(L(
            'SELECT *',
            'FROM crczp.events.trainings.* e',
            'LEFT JOIN crczp.runs r ON e.training_run_id = r.id',
        ));
    });

    it('CROSS JOIN emits no ON clause', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*', 'e')
                .select('*')
                .crossJoin('crczp.meta', 'm')
                .toSQL(),
        ).toBe(L(
            'SELECT *',
            'FROM crczp.events.trainings.* e',
            'JOIN crczp.meta m',
        ));
    });
});

// ─── clone() independence ─────────────────────────────────────────────────────

describe('clone()', () => {
    it('clone produces identical SQL', () => {
        const base = new QueryBuilder('crczp.events.trainings.*')
            .select(field('training_run_id'), as(count('*'), 'cnt'))
            .where(eq('type', EventType.LevelCompleted))
            .groupBy(field('training_run_id'))
            .limit(50);

        expect(base.clone().toSQL()).toBe(base.toSQL());
    });

    it('modifying a clone does not affect the original', () => {
        const base = new QueryBuilder('crczp.events.trainings.*')
            .select(field('training_run_id'))
            .where(eq('type', EventType.LevelStarted))
            .limit(10);

        const fork = base.clone()
            .andWhere(gt('actual_score_in_level', 50))
            .limit(5);

        expect(base.toSQL()).toBe(L(
            'SELECT training_run_id',
            'FROM crczp.events.trainings.*',
            `WHERE type = 'cz.cyberrange.platform.events.trainings.LevelStarted'`,
            'LIMIT 10',
        ));

        expect(fork.toSQL()).toBe(L(
            'SELECT training_run_id',
            'FROM crczp.events.trainings.*',
            `WHERE (type = 'cz.cyberrange.platform.events.trainings.LevelStarted' AND actual_score_in_level > 50)`,
            'LIMIT 5',
        ));
    });
});

// ─── Full realistic queries ────────────────────────────────────────────────────

describe('realistic analytics queries', () => {
    it('top 10 training runs by total score in a time window', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(
                    field('training_run_id'),
                    as(sum(field('actual_score_in_level')), 'total_score'),
                    as(count('*'), 'levels_completed'),
                )
                .where(and(
                    eq('type', EventType.LevelCompleted),
                    between('timestamp', 1700000000000, 1800000000000),
                ))
                .groupBy(field('training_run_id'))
                .orderBy(sum(field('actual_score_in_level')), 'DESC')
                .limit(10)
                .toSQL(),
        ).toBe(L(
            'SELECT training_run_id, SUM(actual_score_in_level) AS total_score, COUNT(*) AS levels_completed',
            'FROM crczp.events.trainings.*',
            `WHERE (type = 'cz.cyberrange.platform.events.trainings.LevelCompleted' AND timestamp BETWEEN 1700000000000 AND 1800000000000)`,
            'GROUP BY training_run_id',
            'ORDER BY SUM(actual_score_in_level) DESC',
            'LIMIT 10',
        ));
    });

    it('hint usage: users who took more than 3 hints in a run', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(
                    field('training_run_id'),
                    field('user_ref_id'),
                    as(count('*'), 'hint_count'),
                    as(sum(field('hint_penalty_points')), 'total_penalty'),
                )
                .where(and(
                    eq('type', EventType.HintTaken),
                    eq('training_instance_id', 99),
                ))
                .groupBy(field('training_run_id'), field('user_ref_id'))
                .having(gt('hint_count' as any, 3))
                .orderBy(field('total_penalty' as any), 'DESC')
                .toSQL(),
        ).toBe(L(
            'SELECT training_run_id, user_ref_id, COUNT(*) AS hint_count, SUM(hint_penalty_points) AS total_penalty',
            'FROM crczp.events.trainings.*',
            `WHERE (type = 'cz.cyberrange.platform.events.trainings.HintTaken' AND training_instance_id = 99)`,
            'GROUP BY training_run_id, user_ref_id',
            'HAVING hint_count > 3',
            'ORDER BY total_penalty DESC',
        ));
    });

    it('distinct users who attempted any answer type in an instance', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(field('user_ref_id'))
                .distinct()
                .where(and(
                    inList('type', [
                        EventType.CorrectAnswerSubmitted,
                        EventType.WrongAnswerSubmitted,
                        EventType.CorrectFlagSubmitted,
                        EventType.WrongFlagSubmitted,
                    ]),
                    eq('training_instance_id', 5),
                ))
                .orderBy(field('user_ref_id'), 'ASC')
                .toSQL(),
        ).toBe(L(
            'SELECT DISTINCT user_ref_id',
            'FROM crczp.events.trainings.*',
            `WHERE (type IN ('cz.cyberrange.platform.events.trainings.CorrectAnswerSubmitted', 'cz.cyberrange.platform.events.trainings.WrongAnswerSubmitted', 'cz.cyberrange.platform.events.trainings.CorrectFlagSubmitted', 'cz.cyberrange.platform.events.trainings.WrongFlagSubmitted') AND training_instance_id = 5)`,
            'ORDER BY user_ref_id ASC',
        ));
    });

    it('training run duration for completed runs', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(
                    field('training_run_id'),
                    field('start_time'),
                    field('end_time'),
                    as(sub(field('end_time'), field('start_time')), 'duration_ms'),
                )
                .where(and(
                    eq('type', EventType.TrainingRunEnded),
                    eq('training_instance_id', 12),
                    isNotNull('end_time'),
                ))
                .orderBy(sub(field('end_time'), field('start_time')), 'ASC')
                .toSQL(),
        ).toBe(L(
            'SELECT training_run_id, start_time, end_time, (end_time - start_time) AS duration_ms',
            'FROM crczp.events.trainings.*',
            `WHERE (type = 'cz.cyberrange.platform.events.trainings.TrainingRunEnded' AND training_instance_id = 12 AND end_time IS NOT NULL)`,
            'ORDER BY (end_time - start_time) ASC',
        ));
    });

    it('best assessment score per user per level', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(
                    field('user_ref_id'),
                    field('level'),
                    as(max(field('total_assessment_level_score')), 'best_score'),
                )
                .where(and(
                    eq('type', EventType.LevelCompleted),
                    eq('level_type', 'ASSESSMENT'),
                    eq('training_run_id', 77),
                ))
                .groupBy(field('user_ref_id'), field('level'))
                .orderBy(field('level'), 'ASC')
                .orderBy(max(field('total_assessment_level_score')), 'DESC')
                .toSQL(),
        ).toBe(L(
            'SELECT user_ref_id, level, MAX(total_assessment_level_score) AS best_score',
            'FROM crczp.events.trainings.*',
            `WHERE (type = 'cz.cyberrange.platform.events.trainings.LevelCompleted' AND level_type = 'ASSESSMENT' AND training_run_id = 77)`,
            'GROUP BY user_ref_id, level',
            'ORDER BY level ASC, MAX(total_assessment_level_score) DESC',
        ));
    });

    it('wrong submissions containing a keyword in answer text', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(field('training_run_id'), field('user_ref_id'), field('answer_content'))
                .where(and(
                    inList('type', [EventType.WrongAnswerSubmitted, EventType.WrongFlagSubmitted]),
                    eq('training_instance_id', 8),
                    matchQuery('answer_content', 'admin', { boost: 1.5 }),
                ))
                .orderBy(field('timestamp'), 'DESC')
                .limit(50)
                .toSQL(),
        ).toBe(L(
            'SELECT training_run_id, user_ref_id, answer_content',
            'FROM crczp.events.trainings.*',
            `WHERE (type IN ('cz.cyberrange.platform.events.trainings.WrongAnswerSubmitted', 'cz.cyberrange.platform.events.trainings.WrongFlagSubmitted') AND training_instance_id = 8 AND MATCH_QUERY(answer_content, 'admin', boost=1.5))`,
            'ORDER BY timestamp DESC',
            'LIMIT 50',
        ));
    });

    it('paginated event log with LIMIT + OFFSET', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(field('timestamp'), field('type'), field('training_run_id'), field('user_ref_id'))
                .where(and(
                    eq('training_instance_id', 3),
                    lt('timestamp', 1750000000000),
                ))
                .orderBy(field('timestamp'), 'DESC')
                .limit(25)
                .offset(75)
                .toSQL(),
        ).toBe(L(
            'SELECT timestamp, type, training_run_id, user_ref_id',
            'FROM crczp.events.trainings.*',
            'WHERE (training_instance_id = 3 AND timestamp < 1750000000000)',
            'ORDER BY timestamp DESC',
            'LIMIT 75, 25',
        ));
    });

    it('time-to-complete per level: TIMESTAMPDIFF between start and end events', () => {
        expect(
            new QueryBuilder('crczp.events.trainings.*')
                .select(
                    field('training_run_id'),
                    field('level'),
                    field('level_type'),
                    as(fn('TIMESTAMPDIFF', lit('SECOND' as any), field('start_time'), field('end_time')), 'seconds'),
                )
                .where(and(
                    eq('type', EventType.TrainingRunEnded),
                    eq('training_instance_id', 20),
                    isNotNull('start_time'),
                    isNotNull('end_time'),
                ))
                .orderBy(field('training_run_id'), 'ASC')
                .orderBy(field('level'), 'ASC')
                .toSQL(),
        ).toBe(L(
            `SELECT training_run_id, level, level_type, TIMESTAMPDIFF('SECOND', start_time, end_time) AS seconds`,
            'FROM crczp.events.trainings.*',
            `WHERE (type = 'cz.cyberrange.platform.events.trainings.TrainingRunEnded' AND training_instance_id = 20 AND start_time IS NOT NULL AND end_time IS NOT NULL)`,
            'ORDER BY training_run_id ASC, level ASC',
        ));
    });
});
