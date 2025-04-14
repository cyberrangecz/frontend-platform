export type SnakeToCamelCase<S extends string> =
    S extends `${infer T}_${infer U}` ?
        `${T}${Capitalize<SnakeToCamelCase<U>>}` : S

export type CamelToSnakeCase<S extends string> = S extends `${infer T}${infer U}`
    ? `${T extends Capitalize<T> ? "_" : ""}${Lowercase<T>}${CamelToSnakeCase<U>}`
    : S;

export type SnakeToCamelCaseKeys<T extends Record<string, any>> = {
    [K in keyof T as K extends string ? SnakeToCamelCase<K> : never]: T[K];
};

export type CamelToSnakeCaseKeys<T extends Record<string, any>> = {
    [K in keyof T as K extends string ? CamelToSnakeCase<K> : never]: T[K];
};

type PropertyMapper<FROM, MAPPED, PROPERTY extends keyof MAPPED> = (from: FROM) => MAPPED[PROPERTY];

type SharedProperties<S extends Record<string, any>, T extends Record<string, any>> = {
    [K in keyof S & keyof T as S[K] extends T[K]
        ? T[K] extends S[K]
            ? K
            : never
        : never]: S[K];
};

type ApiMapping<
    FROM_BASE extends Record<string, any>,
    FROM_TRANSLATED_CASE extends Record<string, any>,
    TO extends Record<string, any>> =
    keyof Omit<TO, keyof SharedProperties<FROM_TRANSLATED_CASE, TO>> extends never ? {
        mappers?: {
            [K in keyof SharedProperties<FROM_TRANSLATED_CASE, TO>]?: PropertyMapper<FROM_BASE, TO, K>
        },
        mappedProperties: (keyof SharedProperties<FROM_TRANSLATED_CASE, TO>)[]
    } : {
        mappers: { [K in keyof Omit<TO, keyof SharedProperties<FROM_TRANSLATED_CASE, TO>>]: PropertyMapper<FROM_BASE, TO, K>} & {
            [K in keyof SharedProperties<FROM_TRANSLATED_CASE, TO>]?: PropertyMapper<FROM_BASE, TO, K>
        },
        mappedProperties: (keyof SharedProperties<FROM_TRANSLATED_CASE, TO>)[]
    }

type StringKeyOnly<T> = {
    [K in keyof T as K extends string ? K : never]: T[K];
};


export type ApiReadMapping<DTO, MODEL> =
    ApiMapping<StringKeyOnly<DTO>, SnakeToCamelCaseKeys<StringKeyOnly<DTO>>, StringKeyOnly<MODEL>>;


export type ApiWriteMapping<MODEL,DTO> =
    ApiMapping<StringKeyOnly<MODEL>, CamelToSnakeCaseKeys<StringKeyOnly<MODEL>>, StringKeyOnly<DTO>>;
