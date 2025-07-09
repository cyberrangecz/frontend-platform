import {ApiReadMapping, ApiWriteMapping, CamelToSnakeCase, SnakeToCamelCase} from "./mapper-types";


export class MapperBuilder {

    static snakeToCamelCase<T extends string>(s: T): SnakeToCamelCase<T> {
        return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase()) as SnakeToCamelCase<T>;
    }

    static camelToSnakeCase<T extends string>(s: T): CamelToSnakeCase<T> {
        return s.replace(/([A-Z])/g, (_, c) => "_" + c.toLowerCase()) as CamelToSnakeCase<T>;
    }

    private static createMapper<FROM, TO>(
        config: (ApiReadMapping<FROM, TO> & {
            keyMapper:  <T extends string>(s: T)=> CamelToSnakeCase<T>
        }) | (ApiWriteMapping<FROM,TO> & {
            keyMapper: <T extends string>(s: T)=> SnakeToCamelCase<T>
        }),
        constructor?: (new () => TO) | undefined
    ) : (from: FROM) => TO {
        return (from: FROM) => {
            const result = constructor ? new constructor() : {} as any;

            console.assert(
                new Set(config.mappedProperties.map(config.keyMapper)).size === config.mappedProperties.length,
                'Array of mapped properties is not unique, this is likely an error'
            )

            Object.entries(config.mappers ? config.mappers : {})
                .forEach(([key, mapper]) => {
                    result[key] = (mapper as (from: FROM) => unknown)(from);
                });

            config.mappedProperties.filter(
                property => (!config.mappers) || !(property in Object.keys(config.mappers))
            ).forEach(mappedKeyOfResult => {
                result[mappedKeyOfResult] = from[config.keyMapper(mappedKeyOfResult) as keyof FROM];
            })

            return result;
        }
    }


    public static createDTOtoModelMapper<
        DTO, MODEL,
    >(
        config: ApiReadMapping<DTO, MODEL> | (ApiReadMapping<DTO, MODEL> & {
            constructor: new () => MODEL
        })
    ): (from: DTO) => MODEL {
        return this.createMapper<DTO, MODEL>({
            ...config,
            keyMapper: this.camelToSnakeCase
        }, 'constructor' in config ? config.constructor as (new () => MODEL) : undefined );
    }

    public static createModelToDtoMapper<MODEL, DTO>(
        config: ApiWriteMapping<MODEL,DTO> |  (ApiWriteMapping<MODEL,DTO> & {
            constructor?: new () => DTO
        })
    ): (model: MODEL) => DTO {
        return this.createMapper<MODEL, DTO>({
            ...config,
            keyMapper: this.snakeToCamelCase
        }, 'constructor' in config ? config.constructor as (new () => DTO) : undefined );
    }



}
