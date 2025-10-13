import {
    ApiReadMapping,
    ApiWriteMapping,
    CamelToSnakeCase,
    SnakeToCamelCase,
} from './mapper-types';

export class MapperBuilder {
    /** Convert a camel‑case name (Model) → snake_case (DTO) */
    static camelToSnakeCase<T extends string>(s: T): CamelToSnakeCase<T> {
        return s.replace(
            /([A-Z])/g,
            (_, c) => '_' + c.toLowerCase()
        ) as CamelToSnakeCase<T>;
    }

    /** Convert a snake_case name (DTO) → camelCase (Model) */
    static snakeToCamelCase<T extends string>(s: T): SnakeToCamelCase<T> {
        return s.replace(/_([a-z])/g, (_, c) =>
            c.toUpperCase()
        ) as SnakeToCamelCase<T>;
    }

    public static createDTOtoModelMapper<DTO, MODEL>(
        config: ApiReadMapping<DTO, MODEL> & {
            constructor: (data: unknown) => MODEL;
        }
    ): (from: DTO) => MODEL {
        return this.createMapper<DTO, MODEL>(
            {
                ...config,
                keyMapper: this.camelToSnakeCase,
            },
            config.constructor
        );
    }

    public static createModelToDtoMapper<MODEL, DTO>(
        config: ApiWriteMapping<MODEL, DTO> & {
            constructor: (data: unknown) => DTO;
        }
    ): (from: MODEL) => DTO {
        return this.createMapper<MODEL, DTO>(
            {
                ...config,
                keyMapper: this.snakeToCamelCase,
            },
            config.constructor
        );
    }

    private static createMapper<FROM, TO>(
        config:
            | (ApiReadMapping<FROM, TO> & {
                  keyMapper: <T extends string>(s: T) => CamelToSnakeCase<T>;
              })
            | (ApiWriteMapping<FROM, TO> & {
                  keyMapper: <T extends string>(s: T) => SnakeToCamelCase<T>;
              }),
        constructor: (data: unknown) => TO
    ): (from: FROM) => TO {
        return (from: FROM) => {
            const data = {} as Record<string, unknown>;

            const mappedKeys = config.mappedProperties.map(config.keyMapper);
            console.assert(
                new Set(mappedKeys).size === config.mappedProperties.length,
                'Array of mapped properties is not unique – duplicate entries detected.'
            );

            if (config.mappers) {
                for (const [targetKey, fn] of Object.entries(
                    config.mappers
                ) as [keyof typeof config.mappers, (from: FROM) => unknown][]) {
                    data[targetKey as string] = fn(from);
                }
            }

            for (const targetKey of config.mappedProperties) {
                // skip when a custom mapper already filled the value
                if (
                    config.mappers &&
                    Object.prototype.hasOwnProperty.call(
                        config.mappers,
                        targetKey
                    )
                ) {
                    continue;
                }
                const sourceKey = config.keyMapper(
                    targetKey as string
                ) as keyof FROM;
                data[targetKey as string] = from[sourceKey];
            }

            return constructor(data);
        };
    }
}
