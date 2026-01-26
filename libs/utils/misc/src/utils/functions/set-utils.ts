function equals<T>(a: Set<T>, b: Set<T>): boolean {
    if (a.size !== b.size) return false;
    for (const item of a) {
        if (!b.has(item)) return false;
    }
    return true;
}

function minus<T>(a: Set<T>, b: Set<T>): Set<T> {
    const result = new Set<T>();
    for (const item of a) {
        if (!b.has(item)) {
            result.add(item);
        }
    }
    return result;
}

function intersect<T>(a: Set<T>, b: Set<T>): Set<T> {
    const result = new Set<T>();
    for (const item of a) {
        if (b.has(item)) {
            result.add(item);
        }
    }
    return result;
}

function union<T>(a: Set<T>, b: Set<T>): Set<T> {
    const result = new Set<T>(a);
    for (const item of b) {
        result.add(item);
    }
    return result;
}

export const SetUtils = {
    equals,
    minus,
    intersect,
    union,
};
