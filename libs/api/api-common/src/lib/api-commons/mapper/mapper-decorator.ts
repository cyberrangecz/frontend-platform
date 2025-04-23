import { ApiReadMapping, ApiWriteMapping } from './mapper-types';
import { MapperBuilder } from './mapper-builder';
import { InjectionToken, ModuleWithProviders, NgModule, Type } from '@angular/core';

@NgModule()
export class MappersModule {

    public static getMapperToken<From, To>(fromType: Type<From>, toType: Type<To>): InjectionToken<(from: From) => To> {
        console.log('token name',`Mapper<${fromType.name}->${toType.name}>`)

        return new InjectionToken<(from: From) => To>(`Mapper<${fromType.name}->${toType.name}>`);
    }


    public static provideMappers(): ModuleWithProviders<MappersModule> {
        return {
            ngModule: MappersModule,
            providers: [
                Array.from(readMappers)
                    .concat(Array.from(Array.from(writeMappers)))
                    .map(
                        ([from, val]) => Array.from(val).map(
                            ([to, mapper]) => (
                                { provide: this.getMapperToken(from, to), useValue: mapper }
                            )
                        )
                    )
            ]
        }
    }
}

const readMappers = new Map<MapperKey<any>, Map<MapperKey<any>, Function>>();

const writeMappers = new Map<MapperKey<any>, Map<MapperKey<any>, Function>>();

function registerMapper<FROM, TO>(
    dtoClass: Function,
    key: MapperKey<TO>,
    mapper: (from: FROM) => TO,
    store: Map<Function, Map<MapperKey<any>, Function>>
) {
    if (!store.has(dtoClass)) {
        store.set(dtoClass, new Map());
    }
    if (store.get(dtoClass)?.get(key) !== undefined) {
        throw new Error("Duplicated mapper for key '" + key + "'");
    }

    store.get(dtoClass)!.set(key, mapper);
}

function registerReadMapper<DTO, MODEL>(
    registererClass: Function,
    key: MapperKey<MODEL>,
    mapper: (from: DTO) => MODEL
) {
    registerMapper(
        registererClass,
        key,
        mapper,
        readMappers
    )
}

function registerWriteMapper<MODEL, DTO>(
    registererClass: Function,
    key: MapperKey<DTO>,
    mapper: (from: MODEL) => DTO
) {
    registerMapper(
        registererClass,
        key,
        mapper,
        writeMappers
    )
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


type MapperKey<T = {}> = new () => T;

function NoArgConstructorMixin<T extends { new(...args: any[]): any }>(Base: T) {
    return class extends Base {
        constructor(...args: any[]) {
            if (args.length > 0) {
                throw new Error('No arguments allowed in a DTO bean class')
            }
            super()
        }
    };
}

export function ApiReadMapper<DTO, MODEL>(
    mappings: ApiReadMapping<DTO, MODEL> & {
        resultClass: MapperKey<MODEL>
    }
) {
    return function (from: Function) {
        const mappedConstructor = from as MapperKey<DTO>;

        const mappingFunction = MapperBuilder.createDTOtoModelMapper<DTO, MODEL>({
            ...mappings,
            constructor: mappings.resultClass,
        });

        registerReadMapper<DTO, MODEL>(
            mappedConstructor,
            mappings.resultClass,
            mappingFunction
        );

        // Return the mixin-extended class instead of invoking it
        return NoArgConstructorMixin(mappedConstructor);
    };
}

export function ApiWriteMapper<MODEL, DTO>(
    mappings: ApiWriteMapping<MODEL, DTO> & {
        resultClass: MapperKey<DTO>
    }
) {
    return function (from: Function) {

        const mappingFunction = MapperBuilder.createModelToDtoMapper<MODEL, DTO>(
            { ...mappings, constructor: mappings.resultClass },
        );

        registerWriteMapper<MODEL, DTO>(
            from,
            mappings.resultClass,
            mappingFunction
        );

        return NoArgConstructorMixin(from())
    };
}
