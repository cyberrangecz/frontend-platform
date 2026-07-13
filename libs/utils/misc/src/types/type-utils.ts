/**
 * Recursively makes all properties of T optional.
 * Arrays are preserved without deep-partialing their element type.
 */
export type DeepPartial<T> = {
    [K in keyof T]?: T[K] extends Array<infer U>
        ? Array<U>
        : T[K] extends object
        ? DeepPartial<T[K]>
        : T[K];
};
