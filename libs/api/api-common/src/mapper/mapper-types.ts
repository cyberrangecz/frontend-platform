/**
 * Type utilities for mapping between API DTOs and domain models.
 *
 * This module provides a type-safe mapping system that handles:
 * - Conversion between snake_case (API) and camelCase (TypeScript) property names
 * - Compile-time validation that all properties are mapped
 * - Automatic copying of shared properties with identical types
 * - Custom mapping functions for properties that need transformation
 */

/* ----- UTILITY TYPES FOR FILTERING FUNCTIONS ----- */

/**
 * Extracts only the keys of T that are NOT functions.
 * Returns a union of property names (excluding methods).
 *
 * @example
 * type Obj = { name: string; age: number; greet(): void };
 * type Keys = NonFunctionKeys<Obj>; // "name" | "age"
 */
type NonFunctionKeys<T> = {
    [K in keyof T]: T[K] extends (...args: any) => any ? never : K;
}[keyof T];

/**
 * Creates a new type containing only the non-function properties of T.
 *
 * @example
 * type Obj = { name: string; age: number; greet(): void };
 * type Props = NonFunctionProps<Obj>; // { name: string; age: number }
 */
type NonFunctionProps<T> = Pick<T, NonFunctionKeys<T>>;

/**
 * Similar to NonFunctionProps, but ensures keys are strings and excludes methods.
 * Returns an object type with only string-keyed, non-function properties.
 *
 * @example
 * type Obj = { name: string; [Symbol.iterator]: () => void };
 * type Props = StringNonMethodKeys<Obj>; // { name: string }
 */
export type StringNonMethodKeys<T> = {
    [K in keyof T as K extends string
        ? T[K] extends (...args: any) => any
            ? never
            : K
        : never]: T[K];
};

/* ----- CASE CONVERSION TYPES ----- */

/**
 * Recursively converts a snake_case string type to camelCase.
 *
 * @example
 * type Result = SnakeToCamelCase<"user_id">; // "userId"
 * type Result2 = SnakeToCamelCase<"first_name_last">; // "firstNameLast"
 */
export type SnakeToCamelCase<S extends string> =
    S extends `${infer T}_${infer U}`
        ? `${T}${Capitalize<SnakeToCamelCase<U>>}`
        : S;

/**
 * Recursively converts a camelCase string type to snake_case.
 *
 * @example
 * type Result = CamelToSnakeCase<"userId">; // "user_id"
 * type Result2 = CamelToSnakeCase<"firstName">; // "first_name"
 */
export type CamelToSnakeCase<S extends string> =
    S extends `${infer T}${infer U}`
        ? `${T extends Capitalize<T>
              ? '_'
              : ''}${Lowercase<T>}${CamelToSnakeCase<U>}`
        : S;

/**
 * Transforms all keys of an object type from snake_case to camelCase.
 * Preserves the property value types while renaming keys.
 *
 * @example
 * type DTO = { user_id: number; first_name: string };
 * type Model = SnakeToCamelCaseKeys<DTO>; // { userId: number; firstName: string }
 */
export type SnakeToCamelCaseKeys<T extends Record<string, any>> = {
    [K in keyof NonFunctionProps<T> as K extends string
        ? SnakeToCamelCase<K>
        : never]: T[K];
};

/**
 * Transforms all keys of an object type from camelCase to snake_case.
 * Preserves the property value types while renaming keys.
 *
 * @example
 * type Model = { userId: number; firstName: string };
 * type DTO = CamelToSnakeCaseKeys<Model>; // { user_id: number; first_name: string }
 */
export type CamelToSnakeCaseKeys<T extends Record<string, any>> = {
    [K in keyof NonFunctionProps<T> as K extends string
        ? CamelToSnakeCase<K>
        : never]: T[K];
};

/* ----- MAPPER FUNCTION TYPES ----- */

/**
 * Type for a function that maps a property from the source object to the target.
 * Takes the entire FROM object and returns a specific property of the MAPPED type.
 *
 * @template FROM - The source object type
 * @template MAPPED - The target object type
 * @template PROPERTY - The specific property key being mapped
 *
 * @example
 * type UserDTO = { user_id: string };
 * type User = { id: number };
 * type Mapper = PropertyMapper<UserDTO, User, "id">; // (from: UserDTO) => number
 */
type PropertyMapper<FROM, MAPPED, PROPERTY extends keyof MAPPED> = (
    from: FROM,
) => MAPPED[PROPERTY];

/* ----- PROPERTY CLASSIFICATION TYPES ----- */

/**
 * Extracts properties that exist in both S and T with identical types.
 * A property is considered "shared" only if its type is exactly the same in both objects.
 *
 * @example
 * type A = { id: number; name: string; age: number };
 * type B = { id: number; name: string; email: string };
 * type Shared = SharedProperties<A, B>; // { id: number; name: string }
 */
type SharedProperties<
    S extends Record<string, any>,
    T extends Record<string, any>,
> = {
    [K in keyof S & keyof T as S[K] extends T[K]
        ? T[K] extends S[K]
            ? K
            : never
        : never]: S[K];
};

/**
 * Extracts the keys of properties that are shared between FROM_TR and TO.
 *
 * @example
 * type Keys = SharedKeys<{ id: number }, { id: number; name: string }>; // "id"
 */
type SharedKeys<FROM_TR, TO> = keyof SharedProperties<FROM_TR, TO>;

/**
 * Extracts the keys that exist in TO but are NOT shared with FROM_TR.
 * These are properties that require custom mapping logic.
 *
 * @example
 * type Keys = UnsharedKeys<{ id: number }, { id: number; name: string }>; // "name"
 */
type UnsharedKeys<FROM_TR, TO> = Exclude<keyof TO, SharedKeys<FROM_TR, TO>>;

/**
 * Extracts all non-function property keys from the target type.
 *
 * @example
 * type Keys = TargetKeys<{ name: string; greet(): void }>; // "name"
 */
type TargetKeys<TO> = keyof NonFunctionProps<TO>;

/* ----- COMPLETENESS VALIDATION ----- */

/**
 * Ensures that a mapping configuration covers ALL properties of the target type.
 * Returns the CONFIG type if complete, or never if any properties are missing.
 *
 * This type enforces that every property in TO is either:
 * 1. Listed in mappedProperties (for auto-copied shared properties), OR
 * 2. Has a custom mapper function defined
 *
 * @template CONFIG - The mapping configuration object
 * @template TO - The target type to validate completeness against
 */
type EnsureComplete<
    CONFIG extends { mappedProperties: any; mappers: any },
    TO,
> =
    Exclude<
        TargetKeys<TO>,
        // keys that are either in the tuple `mappedProperties` or as a mapper entry
        CONFIG['mappedProperties'][number] | keyof CONFIG['mappers']
    > extends never
        ? CONFIG
        : never;

/* ----- MAPPING CONFIGURATION TYPES ----- */

/**
 * Defines the structure of a mapping configuration between two types.
 *
 * @template FROM_BASE - The original source type (e.g., API DTO with snake_case)
 * @template FROM_TRANSLATED_CASE - Source type with keys translated to match target naming (e.g., camelCase)
 * @template TO - The target type (e.g., domain model)
 *
 * The configuration requires:
 * - mappers: Custom functions for unshared properties (required) and optional overrides for shared ones
 * - mappedProperties: Array of shared property keys that should be auto-copied
 */
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

/**
 * Creates a complete and validated mapping between source and target types.
 * Combines MappingConfig with EnsureComplete to enforce compile-time validation.
 *
 * @template FROM_BASE - The original source type
 * @template FROM_TRANSLATED_CASE - Source type with translated key names
 * @template TO - The target type
 */
type ApiMapping<
    FROM_BASE extends Record<string, any>,
    FROM_TRANSLATED_CASE extends Record<string, any>,
    TO extends Record<string, any>,
> = MappingConfig<FROM_BASE, FROM_TRANSLATED_CASE, TO> &
    EnsureComplete<MappingConfig<FROM_BASE, FROM_TRANSLATED_CASE, TO>, TO>;

/* ----- PUBLIC API MAPPING TYPES ----- */

/**
 * Type for mapping from an API DTO (snake_case) to a domain MODEL (camelCase).
 * Used when reading data from the API.
 *
 * Automatically handles:
 * - Converting snake_case DTO keys to camelCase model keys
 * - Filtering out methods from both types
 * - Validating that all model properties are mapped
 *
 * @template DTO - The API data transfer object type (with snake_case properties)
 * @template MODEL - The domain model type (with camelCase properties)
 *
 * @example
 * type UserDTO = { user_id: string; first_name: string };
 * type User = { id: number; firstName: string };
 * const mapping: ApiReadMapping<UserDTO, User> = {
 *   mappers: {
 *     id: (dto) => parseInt(dto.user_id)
 *   },
 *   mappedProperties: ["firstName"]
 * };
 */
export type ApiReadMapping<DTO, MODEL> = ApiMapping<
    StringNonMethodKeys<DTO>,
    SnakeToCamelCaseKeys<StringNonMethodKeys<DTO>>,
    StringNonMethodKeys<MODEL>
>;

/**
 * Type for mapping from a domain MODEL (camelCase) to an API DTO (snake_case).
 * Used when writing data to the API.
 *
 * Automatically handles:
 * - Converting camelCase model keys to snake_case DTO keys
 * - Filtering out methods from both types
 * - Validating that all DTO properties are mapped
 *
 * @template MODEL - The domain model type (with camelCase properties)
 * @template DTO - The API data transfer object type (with snake_case properties)
 *
 * @example
 * type User = { id: number; firstName: string };
 * type UserDTO = { user_id: string; first_name: string };
 * const mapping: ApiWriteMapping<User, UserDTO> = {
 *   mappers: {
 *     user_id: (model) => model.id.toString()
 *   },
 *   mappedProperties: ["first_name"]
 * };
 */
export type ApiWriteMapping<MODEL, DTO> = ApiMapping<
    StringNonMethodKeys<MODEL>,
    CamelToSnakeCaseKeys<StringNonMethodKeys<MODEL>>,
    StringNonMethodKeys<DTO>
>;
