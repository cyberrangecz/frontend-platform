/**
 * Maximum number of bind variables a single prepared statement may carry.
 * A statement that exceeds it is rejected by the database engine.
 */
export const MAX_BIND_VARIABLES_PER_STATEMENT = 32766; // SQLite limit

/**
 * Fraction of {@link MAX_BIND_VARIABLES_PER_STATEMENT} usable for row data,
 * leaving headroom for any incidental bind variables a statement carries.
 */
export const BIND_VARIABLE_SAFETY_FACTOR = 0.9;

/**
 * Bind-variable budget used to size multi-row insert chunks. Derived from the
 * per-statement maximum so a chunk never overflows it, regardless of how many
 * columns its target table has.
 */
export const BIND_VARIABLE_BUDGET = Math.floor(
    MAX_BIND_VARIABLES_PER_STATEMENT * BIND_VARIABLE_SAFETY_FACTOR,
);
