function flatten<T>(arr: T[][]): T[] {
    return arr.reduce((reduced, next) => reduced.concat(next), []);
}

/**
 * Split array to 2D array with set max length
 * of subarrays
 * @param arr
 * @param chunkSize
 */
function toChunks<T>(arr: T[], chunkSize: number): T[][] {
    return arr.length === 0
        ? []
        : [arr.slice(0, chunkSize)].concat(
              this.toChunks(arr.slice(chunkSize), chunkSize),
          );
}

/**
 * Same as filter, but also returns the values not matching in a second array
 * @param arr input array
 * @param condition split condition
 *
 * @returns {[T[], T[]]} where first array contains elements matching the condition, second array contains the rest
 */
function split<T>(
    arr: T[],
    condition: (elem: T, index: number) => boolean,
): [T[], T[]] {
    return arr.reduce(
        ([condTrue, condFalse], item, index) => {
            (condition(item, index) ? condTrue : condFalse).push(item);
            return [condTrue, condFalse];
        },
        [[], []],
    );
}

function sum(arr: number[]): number {
    return arr.reduce((sum, item) => sum + item, 0);
}

/**
 * Returns the arithmetic mean of a numeric array, or null when the array is empty.
 *
 * @param values Numbers to average.
 */
function mean(values: readonly number[]): number | null {
    if (values.length === 0) return null;
    return values.reduce((acc, value) => acc + value, 0) / values.length;
}

/**
 * Returns the median of a numeric array, or null when the array is empty.
 * For even-length arrays the two middle values are averaged.
 *
 * @param values Numbers to find the median of.
 */
function median(values: readonly number[]): number | null {
    if (values.length === 0) return null;
    const sorted = [...values].sort((a, b) => a - b);
    const midIndex = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 1) {
        return sorted[midIndex] ?? null;
    }
    const lower = sorted[midIndex - 1];
    const upper = sorted[midIndex];
    if (lower === undefined || upper === undefined) return null;
    return (lower + upper) / 2;
}

function findOrThrow<T extends { id: number }>(items: T[], id: number): T {
    const item = items.find((elem) => elem.id === id);
    if (!item) {
        throw new Error(`Item with id ${id} not found`);
    }
    return item;
}

export const ArrayUtils = {
    flatten,
    toChunks,
    split,
    sum,
    mean,
    median,
    findOrThrow,
};
