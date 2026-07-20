/**
 * Reduces items to a single winner per key: for each key, keeps the item the
 * `prefers` comparator selects over the current incumbent. The grouping-then-
 * extremum shape shared by the per-trainee run-boundary anchor derivations.
 *
 * @param items Items to reduce.
 * @param keyOf Extracts the grouping key from an item.
 * @param prefers Returns `true` when `candidate` should replace `incumbent` as
 *                the winner for their shared key.
 * @returns Map from key to the winning item for that key.
 */
export function keepExtremumByKey<T, K>(
    items: Iterable<T>,
    keyOf: (item: T) => K,
    prefers: (candidate: T, incumbent: T) => boolean,
): Map<K, T> {
    const winners = new Map<K, T>();
    for (const item of items) {
        const key = keyOf(item);
        const incumbent = winners.get(key);
        if (incumbent === undefined || prefers(item, incumbent)) {
            winners.set(key, item);
        }
    }
    return winners;
}
