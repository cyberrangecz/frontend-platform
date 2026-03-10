/**
 * Expression builder functions.
 *
 * Example:
 *   select(
 *     field('type'),
 *     as(count('*'), 'cnt'),
 *     as(fn('DATE_FORMAT', field('timestamp'), lit('%Y-%m')), 'month'),
 *   )
 */

import type {
    AggregateExpr,
    AggregateFunction,
    Aliased,
    AnyExpr,
    ArithmeticExpr,
    CastExpr,
    CastTargetType,
    FieldRef,
    FunctionExpr,
    Literal,
    SupportedScalarFunction
} from './ast';
import type { FieldName } from './schema';

// ─── Primitives ───

export function field<F extends FieldName>(name: F): FieldRef<F> {
    return { kind: 'field', name };
}

export function lit(value: string | number | boolean | null): Literal {
    return { kind: 'literal', value };
}

// ─── Alias ───

export function as<E extends AnyExpr>(expr: E, alias: string): Aliased<E> {
    return { kind: 'aliased', expr, alias };
}

// ─── Arithmetic ───

export function add(left: AnyExpr, right: AnyExpr): ArithmeticExpr {
    return { kind: 'arithmetic', op: '+', left, right };
}

export function sub(left: AnyExpr, right: AnyExpr): ArithmeticExpr {
    return { kind: 'arithmetic', op: '-', left, right };
}

export function mul(left: AnyExpr, right: AnyExpr): ArithmeticExpr {
    return { kind: 'arithmetic', op: '*', left, right };
}

export function div(left: AnyExpr, right: AnyExpr): ArithmeticExpr {
    return { kind: 'arithmetic', op: '/', left, right };
}

// ─── CAST ───

/** CAST(expr AS TYPE) — uses keyword syntax, not a regular function call. */
export function cast(expr: AnyExpr, targetType: CastTargetType): CastExpr {
    return { kind: 'cast', expr, targetType };
}

// ─── Aggregate functions ───

export function agg(
    fn:       AggregateFunction,
    arg:      AnyExpr | '*',
    distinct?: boolean,
): AggregateExpr {
    return { kind: 'aggregate', fn, arg, distinct };
}

export const count = (arg: AnyExpr | '*' = '*', distinct?: boolean): AggregateExpr => agg('COUNT', arg, distinct);
export const sum   = (arg: AnyExpr): AggregateExpr => agg('SUM', arg);
export const avg   = (arg: AnyExpr): AggregateExpr => agg('AVG', arg);
export const min   = (arg: AnyExpr): AggregateExpr => agg('MIN', arg);
export const max   = (arg: AnyExpr): AggregateExpr => agg('MAX', arg);

// ─── Scalar functions (generic) ───

export function fn(name: SupportedScalarFunction, ...args: AnyExpr[]): FunctionExpr {
    return { kind: 'function', name, args };
}

// ─── Scalar function shortcuts ───
// Only the functions most likely to appear in training-event queries are listed
// as shortcuts. Use fn(...) directly for anything else.

// Math
export const abs   = (x: AnyExpr): FunctionExpr => fn('ABS', x);
export const ceil  = (x: AnyExpr): FunctionExpr => fn('CEIL', x);
export const floor = (x: AnyExpr): FunctionExpr => fn('FLOOR', x);
export const round = (x: AnyExpr, decimals?: AnyExpr): FunctionExpr =>
    decimals ? fn('ROUND', x, decimals) : fn('ROUND', x);

// String
export const upper  = (x: AnyExpr): FunctionExpr => fn('UPPER', x);
export const lower  = (x: AnyExpr): FunctionExpr => fn('LOWER', x);
export const trim   = (x: AnyExpr): FunctionExpr => fn('TRIM', x);
export const length = (x: AnyExpr): FunctionExpr => fn('LENGTH', x);

// Date / time — particularly useful for bucketing events by time period
export const year       = (x: AnyExpr): FunctionExpr => fn('YEAR', x);
export const month      = (x: AnyExpr): FunctionExpr => fn('MONTH', x);
export const day        = (x: AnyExpr): FunctionExpr => fn('DAY', x);
export const hour       = (x: AnyExpr): FunctionExpr => fn('HOUR', x);
export const minute     = (x: AnyExpr): FunctionExpr => fn('MINUTE', x);
export const second     = (x: AnyExpr): FunctionExpr => fn('SECOND', x);
export const now        = (): FunctionExpr => fn('NOW');
export const dateFormat = (date: AnyExpr, format: AnyExpr): FunctionExpr => fn('DATE_FORMAT', date, format);
