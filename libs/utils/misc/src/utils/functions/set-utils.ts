function equals<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): boolean {
    if (a.size !== b.size) return false;
    for (const item of a) {
        if (!b.has(item)) return false;
    }
    return true;
}

function minus<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): Set<T> {
    const result = new Set<T>();
    for (const item of a) {
        if (!b.has(item)) {
            result.add(item);
        }
    }
    return result;
}

function intersect<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): Set<T> {
    const result = new Set<T>();
    for (const item of a) {
        if (b.has(item)) {
            result.add(item);
        }
    }
    return result;
}

function union<T>(a: ReadonlySet<T>, b: ReadonlySet<T>): Set<T> {
    const result = new Set<T>(a);
    for (const item of b) {
        result.add(item);
    }
    return result;
}

/**
 * Returns a new set containing every item from `a` plus `item`. The
 * input set is not mutated.
 *
 * @param a - Source set.
 * @param item - Value to add.
 * @returns A new set with `item` included.
 */
function add<T>(a: ReadonlySet<T>, item: T): Set<T> {
    const result = new Set<T>(a);
    result.add(item);
    return result;
}

/**
 * Returns a new set containing every item from `a` except `item`. The
 * input set is not mutated.
 *
 * @param a - Source set.
 * @param item - Value to remove.
 * @returns A new set with `item` excluded.
 */
function remove<T>(a: ReadonlySet<T>, item: T): Set<T> {
    const result = new Set<T>(a);
    result.delete(item);
    return result;
}

/**
 * Returns a new set with `item`'s membership flipped — present becomes
 * absent and vice versa.
 *
 * @param a - Source set.
 * @param item - Value to toggle.
 * @returns A new set with `item`'s membership flipped.
 */
function toggle<T>(a: ReadonlySet<T>, item: T): Set<T> {
    return a.has(item) ? remove(a, item) : add(a, item);
}

export const SetUtils = {
    equals,
    minus,
    intersect,
    union,
    add,
    remove,
    toggle,
};
