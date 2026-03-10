# @crczp/opensearch-query-builder

A strongly typed SQL query builder for OpenSearch, designed for querying CyberRangeCZ Platform training event indices.

Produces valid OpenSearch SQL strings with compile-time type safety — field names and value types are enforced against the training event schema.

## Installation

The library is part of the platform monorepo. Import from the package name:

```typescript
import { QueryBuilder, field, eq, count, EventType } from '@crczp/opensearch-query-builder';
```

## Quick start

```typescript
const sql = new QueryBuilder('crczp.events.trainings.*')
    .select(field('training_run_id'), field('type'), as(count('*'), 'cnt'))
    .where(and(
        eq('training_instance_id', 5),
        inList('type', [EventType.LevelStarted, EventType.LevelCompleted]),
    ))
    .groupBy(field('training_run_id'), field('type'))
    .orderBy(count('*'), 'DESC')
    .limit(100)
    .toSQL();
```

Output:

```sql
SELECT training_run_id, type, COUNT(*) AS cnt
FROM crczp.events.trainings.*
WHERE (training_instance_id = 5 AND type IN ('cz.cyberrange.platform.events.trainings.LevelStarted', 'cz.cyberrange.platform.events.trainings.LevelCompleted'))
GROUP BY training_run_id, type
ORDER BY COUNT(*) DESC
LIMIT 100
```

## Index targeting

```typescript
// All runs across all instances
new QueryBuilder('crczp.events.trainings.*')

// Single specific run
new QueryBuilder('crczp.events.trainings.pool=1.sandbox=abc.definition=2.instance=3.run=4')

// With alias (required for JOINs)
new QueryBuilder('crczp.events.trainings.*', 'e')
```

## Type safety

Field names and their value types are enforced at compile time via `FieldTypeMap`. Passing the wrong type for a field is a compile error:

```typescript
eq('timestamp', 'bad')  // TS error — timestamp is number
eq('timestamp', 1234)   // ok

like('training_run_id', '%foo%')  // TS error — training_run_id is not a string field
like('level_title', '%intro%')    // ok
```

## Event types

Use the `EventType` constant to avoid hardcoding event class names:

```typescript
eq('type', EventType.LevelCompleted)
inList('type', [EventType.HintTaken, EventType.SolutionDisplayed])
```

## API reference

### QueryBuilder

| Method | Description |
|--------|-------------|
| `select(...elements)` | Replace the SELECT list |
| `addSelect(...elements)` | Append to the SELECT list (removes a leading `*`) |
| `selectAll()` | Reset SELECT to `*` |
| `distinct(on?)` | Add DISTINCT |
| `where(predicate)` | Set the WHERE clause |
| `andWhere(predicate)` | AND a condition onto the existing WHERE, flattening into a single AND node |
| `orWhere(predicate)` | OR a condition onto the existing WHERE, flattening into a single OR node |
| `groupBy(...exprs)` | Set GROUP BY |
| `addGroupBy(...exprs)` | Append to GROUP BY |
| `having(predicate)` | Set HAVING |
| `andHaving(predicate)` | AND a condition onto HAVING |
| `orderBy(expr, dir?, nulls?)` | Append an ORDER BY element |
| `limit(n)` | Set LIMIT |
| `offset(n)` | Set OFFSET (emitted as `LIMIT offset, size`) |
| `join(index, alias, on)` | INNER JOIN |
| `leftJoin(index, alias, on)` | LEFT JOIN |
| `crossJoin(index, alias)` | CROSS JOIN (no ON clause) |
| `clone()` | Independent copy of the builder |
| `toSQL()` | Serialize to a SQL string |
| `getState()` | Expose the underlying AST state |

### Predicates

```typescript
// Comparison
eq('training_run_id', 42)
neq('level_type', 'ASSESSMENT')
gt('actual_score_in_level', 80)
gte('level', 1)
lt('timestamp', 1800000000000)
lte('max_score', 100)

// Range / set
between('timestamp', 1700000000000, 1800000000000)
inList('type', [EventType.LevelStarted, EventType.LevelCompleted])
notIn('level_order', [0, 9])

// String pattern
like('level_title', '%network%')
notLike('type', '%Assessment%')

// Null checks
isNull('hint_title')
isNotNull('end_time')

// Full-text / relevance
matchQuery('level_title', 'firewall', { analyzer: 'standard', boost: 1.5 })
multiMatch(['type', 'level_title'], 'security', { operator: 'AND' })
wildcardQuery('type', 'cz.cyberrange.*', 2)
score(matchQuery('level_title', 'firewall'), 1.2)

// Logical
and(eq('training_run_id', 5), gt('level', 0))
or(eq('type', EventType.HintTaken), eq('type', EventType.SolutionDisplayed))
not(eq('level_type', 'ASSESSMENT'))
```

### Expressions

```typescript
// Field reference and literal
field('training_run_id')
lit(42)
lit('hello')
lit(null)

// Alias
as(count('*'), 'cnt')
as(avg(field('actual_score_in_level')), 'avg_score')

// Arithmetic
add(field('actual_score_in_level'), lit(10))
sub(field('end_time'), field('start_time'))
mul(div(field('actual_score_in_level'), field('max_score')), lit(100))

// Aggregates
count()                                   // COUNT(*)
count(field('user_ref_id'), true)         // COUNT(DISTINCT user_ref_id)
sum(field('actual_score_in_level'))
avg(field('actual_score_in_level'))
min(field('timestamp'))
max(field('total_assessment_level_score'))

// Functions
fn('DATE_FORMAT', field('timestamp'), lit('%Y-%m'))
fn('IFNULL', field('hint_title'), lit('(no title)'))
fn('TIMESTAMPDIFF', lit('SECOND'), field('start_time'), field('end_time'))

// Shortcut functions
dateFormat(field('timestamp'), lit('%Y-%m-%d'))
round(avg(field('actual_score_in_level')), lit(2))
cast(field('timestamp'), 'DATETIME')
```

## Examples

**Score summary per run with a minimum threshold:**

```typescript
new QueryBuilder('crczp.events.trainings.*')
    .select(
        field('training_run_id'),
        as(sum(field('actual_score_in_level')), 'total_score'),
        as(round(avg(field('actual_score_in_level')), lit(2)), 'avg_score'),
        as(count('*'), 'levels_completed'),
    )
    .where(and(
        eq('type', EventType.LevelCompleted),
        eq('training_instance_id', 12),
    ))
    .groupBy(field('training_run_id'))
    .having(gt('total_score' as any, 200))
    .orderBy(sum(field('actual_score_in_level')), 'DESC')
    .limit(20)
    .toSQL()
```

**Building query variants from a shared base using `clone()`:**

```typescript
const base = new QueryBuilder('crczp.events.trainings.*')
    .select(field('user_ref_id'), field('level'), field('actual_score_in_level'))
    .where(and(
        eq('training_instance_id', 7),
        eq('type', EventType.LevelCompleted),
    ));

const topScorers = base.clone()
    .orderBy(field('actual_score_in_level'), 'DESC')
    .limit(10);

const lowScorers = base.clone()
    .andWhere(lt('actual_score_in_level', 30))
    .orderBy(field('actual_score_in_level'), 'ASC');
```