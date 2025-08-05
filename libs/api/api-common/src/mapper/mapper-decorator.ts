import { ApiReadMapping, ApiWriteMapping } from './mapper-types';
import { MapperBuilder } from './mapper-builder';
import {
    InjectionToken,
    ModuleWithProviders,
    NgModule,
    Type,
} from '@angular/core';

type EmptyConstructor<T> = new () => T;
type GenericConstructor<T> = new (...args: any[]) => T;

@NgModule()
export class MappersModule {
    public static getMapperToken<From, To>(
        fromType: Type<From>,
        toType: Type<To>
    ): InjectionToken<(from: From) => To> {
        return new InjectionToken<(from: From) => To>(
            `Mapper<${fromType.name}->${toType.name}>`
        );
    }

    public static provideMappers(): ModuleWithProviders<MappersModule> {
        return {
            ngModule: MappersModule,
            providers: [
                Array.from(readMappers)
                    .concat(Array.from(Array.from(writeMappers)))
                    .map(([from, val]) =>
                        Array.from(val).map(([to, mapper]) => ({
                            provide: this.getMapperToken(from, to),
                            useValue: mapper,
                        }))
                    ),
            ],
        };
    }
}

const readMappers = new Map<
    EmptyConstructor<any>,
    Map<EmptyConstructor<any>, (from: any) => any>
>();

const writeMappers = new Map<
    EmptyConstructor<any>,
    Map<EmptyConstructor<any>, (from: any) => any>
>();

function registerMapper<FROM, TO>(
    dtoClass: EmptyConstructor<FROM>,
    key: EmptyConstructor<TO>,
    mapper: (from: FROM) => TO,
    store: Map<
        EmptyConstructor<FROM>,
        Map<EmptyConstructor<any>, (from: any) => any>
    >
) {
    if (!store.has(dtoClass)) {
        store.set(dtoClass, new Map());
    }
    if (store.get(dtoClass)?.get(key) !== undefined) {
        throw new Error("Duplicated mapper for key '" + key + "'");
    }

    store.get(dtoClass)?.set(key, mapper);
}

function registerReadMapper<DTO, MODEL>(
    registererClass: EmptyConstructor<DTO>,
    key: EmptyConstructor<MODEL>,
    mapper: (from: DTO) => MODEL
) {
    registerMapper(registererClass, key, mapper, readMappers);
}

function registerWriteMapper<MODEL, DTO>(
    registererClass: EmptyConstructor<MODEL>,
    key: EmptyConstructor<DTO>,
    mapper: (from: MODEL) => DTO
) {
    registerMapper(registererClass, key, mapper, writeMappers);
}

/*
export function getReadMapper<DTO, MODEL>(
    registeredBy: new (...args: any[]) => DTO,
    key: MapperKey<MODEL | DTO>
): ((from: DTO) => MODEL) | undefined {
    return readMappers.get(registeredBy)?.get(key) as ((from: DTO) => MODEL) | undefined;
}

export function getWriteMapper<MODEL, DTO>(
    registeredBy: new (...args: any[]) => MODEL | DTO,
    key: MapperKey<DTO | MODEL>
): ((from: MODEL) => DTO) | undefined {
    return writeMappers.get(registeredBy)?.get(key) as ((from: MODEL) => DTO) | undefined;
}*/

function NoArgConstructorMixin<T>(Base: new () => T) {
    const genericBase = Base as GenericConstructor<any>;
    return class extends genericBase {
        constructor(...args: any[]) {
            if (args.length > 0) {
                throw new Error('No arguments allowed in a DTO bean class');
            }
            super(args);
        }
    };
}

export function ApiReadMapper<DTO, MODEL>(
    mappings: ApiReadMapping<DTO, MODEL> & {
        resultClass: EmptyConstructor<MODEL>;
    }
) {
    return function (from: EmptyConstructor<DTO>) {
        const mappingFunction = MapperBuilder.createDTOtoModelMapper<
            DTO,
            MODEL
        >({
            ...mappings,
            constructor: mappings.resultClass,
        });

        registerReadMapper<DTO, MODEL>(
            from,
            mappings.resultClass,
            mappingFunction
        );

        // Return the mixin-extended class instead of invoking it
        return NoArgConstructorMixin<DTO>(from);
    };
}

export function ApiWriteMapper<MODEL, DTO>(
    mappings: ApiWriteMapping<MODEL, DTO> & {
        resultClass: EmptyConstructor<DTO>;
    }
) {
    return function (from: EmptyConstructor<MODEL>) {
        const mappingFunction = MapperBuilder.createModelToDtoMapper<
            MODEL,
            DTO
        >({ ...mappings, constructor: mappings.resultClass });

        registerWriteMapper<MODEL, DTO>(
            from,
            mappings.resultClass,
            mappingFunction
        );

        return NoArgConstructorMixin<MODEL>(from);
    };
}
