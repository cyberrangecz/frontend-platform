/* -------------------------------------------------
   1️⃣  Helpers that remove function‑typed members
   ------------------------------------------------- */
type NonFunctionKeys<T> = {
    [K in keyof T]: T[K] extends (...args: any) => any ? never : K;
}[keyof T];

type NonFunctionProps<T> = Pick<T, NonFunctionKeys<T>>;

/* -------------------------------------------------
   2️⃣  Updated string‑only helper (excludes methods)
   ------------------------------------------------- */
type StringNonMethodKeys<T> = {
    [K in keyof T as K extends string
        ? T[K] extends (...args: any) => any
            ? never
            : K
        : never]: T[K];
};

/* -------------------------------------------------
   3️⃣  Case‑conversion mapped types – operate only on non‑function keys
   ------------------------------------------------- */
export type SnakeToCamelCase<S extends string> =
    S extends `${infer T}_${infer U}`
        ? `${T}${Capitalize<SnakeToCamelCase<U>>}`
        : S;

export type CamelToSnakeCase<S extends string> =
    S extends `${infer T}${infer U}`
        ? `${T extends Capitalize<T>
              ? '_'
              : ''}${Lowercase<T>}${CamelToSnakeCase<U>}`
        : S;

export type SnakeToCamelCaseKeys<T extends Record<string, any>> = {
    [K in keyof NonFunctionProps<T> as K extends string
        ? SnakeToCamelCase<K>
        : never]: T[K];
};

export type CamelToSnakeCaseKeys<T extends Record<string, any>> = {
    [K in keyof NonFunctionProps<T> as K extends string
        ? CamelToSnakeCase<K>
        : never]: T[K];
};

/* -------------------------------------------------
   4️⃣  Core mapping types (unchanged)
   ------------------------------------------------- */
type PropertyMapper<FROM, MAPPED, PROPERTY extends keyof MAPPED> = (
    from: FROM
) => MAPPED[PROPERTY];

/* Shared properties with *identical* types on both sides */
type SharedProperties<
    S extends Record<string, any>,
    T extends Record<string, any>
> = {
    [K in keyof S & keyof T as S[K] extends T[K]
        ? T[K] extends S[K]
            ? K
            : never
        : never]: S[K];
};

/* -------------------------------------------------
   5️⃣  Helper that split the key‑sets
   ------------------------------------------------- */
type SharedKeys<FROM_TR, TO> = keyof SharedProperties<FROM_TR, TO>;
type UnsharedKeys<FROM_TR, TO> = Exclude<keyof TO, SharedKeys<FROM_TR, TO>>;

/* The full set of target keys (excluding functions) */
type TargetKeys<TO> = keyof NonFunctionProps<TO>;

/* -------------------------------------------------
   6️⃣  “All‑targets‑must‑be‑covered” constraint
   ------------------------------------------------- */
type EnsureComplete<
    CONFIG extends { mappedProperties: any; mappers: any },
    TO
> = Exclude<
    TargetKeys<TO>,
    // keys that are either in the tuple `mappedProperties` or as a mapper entry
    CONFIG['mappedProperties'][number] | keyof CONFIG['mappers']
> extends never
    ? CONFIG
    : never;

/* -------------------------------------------------
   7️⃣  The public configuration shape
   ------------------------------------------------- */
type MappingConfig<FROM_BASE, FROM_TRANSLATED_CASE, TO> = {
    /** Custom mappers – **required** for every *un‑shared* key  */
    mappers: {
        [K in UnsharedKeys<FROM_TRANSLATED_CASE, TO>]: PropertyMapper<
            FROM_BASE,
            TO,
            K
        >;
    } & Partial<{
        /** Optional overrides for *shared* keys  */
        [K in SharedKeys<FROM_TRANSLATED_CASE, TO>]: PropertyMapper<
            FROM_BASE,
            TO,
            K
        >;
    }>;

    /** List of shared keys that should be copied automatically. */
    mappedProperties: SharedKeys<FROM_TRANSLATED_CASE, TO>[];
};

/* -------------------------------------------------
   8️⃣  The final `ApiMapping` type
   ------------------------------------------------- */
type ApiMapping<
    FROM_BASE extends Record<string, any>,
    FROM_TRANSLATED_CASE extends Record<string, any>,
    TO extends Record<string, any>
> = MappingConfig<FROM_BASE, FROM_TRANSLATED_CASE, TO> &
    EnsureComplete<MappingConfig<FROM_BASE, FROM_TRANSLATED_CASE, TO>, TO>;

/* -------------------------------------------------
   9️⃣  Public mapping types (now use the method‑filtering helper)
   ------------------------------------------------- */
export type ApiReadMapping<DTO, MODEL> = ApiMapping<
    StringNonMethodKeys<DTO>,
    SnakeToCamelCaseKeys<StringNonMethodKeys<DTO>>,
    StringNonMethodKeys<MODEL>
>;

export type ApiWriteMapping<MODEL, DTO> = ApiMapping<
    StringNonMethodKeys<MODEL>,
    CamelToSnakeCaseKeys<StringNonMethodKeys<MODEL>>,
    StringNonMethodKeys<DTO>
>;
