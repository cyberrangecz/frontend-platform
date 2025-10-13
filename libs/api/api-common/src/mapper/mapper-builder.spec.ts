import { MapperBuilder } from './mapper-builder';
import { describe, expect, test } from 'vitest';
import { Z } from 'zod-class';
import { z } from 'zod';

describe('Testing of properties mapping', () => {
    test('camel case should translate correctly', () => {
        const snake_case = ['standard', 'one_underscore', 'two_under_scores'];

        const camelCase = ['standard', 'oneUnderscore', 'twoUnderScores'];

        const camelToSnakeConversions = camelCase.map(
            MapperBuilder.camelToSnakeCase
        );

        camelToSnakeConversions.forEach((value, index) => {
            expect(value, 'Should translate to snake_case').toStrictEqual(
                snake_case[index]
            );
        });
    });

    test('snake case should translate correctly', () => {
        const snake_case = ['standard', 'one_underscore', 'two_under_scores'];

        const camelCase = ['standard', 'oneUnderscore', 'twoUnderScores'];

        const snakeToCamelConversions = snake_case.map(
            MapperBuilder.snakeToCamelCase
        );

        snakeToCamelConversions.forEach((value, index) => {
            expect(value, 'Should translate to camelCase').toStrictEqual(
                camelCase[index]
            );
        });
    });

    test('should map directly mappable DTO to MODEL', () => {
        class DirectlyMappableDTO extends Z.class({
            property_a: z.string(),
            property_a_b: z.number(),
        }) {}

        class DirectlyMappableModel extends Z.class({
            propertyA: z.string(),
            propertyAB: z.number(),
        }) {}

        const mapperFunction = MapperBuilder.createDTOtoModelMapper<
            DirectlyMappableDTO,
            DirectlyMappableModel
        >({
            mappedProperties: ['propertyA', 'propertyAB'],
            constructor: (data) => DirectlyMappableModel.schema().parse(data),
        });

        const mappedObj = new DirectlyMappableDTO({
            property_a: 'hello',
            property_a_b: 1,
        });

        const result = mapperFunction(mappedObj);

        expect(result.propertyA, 'Should map directly').toStrictEqual(
            mappedObj.property_a
        );
        expect(result.propertyAB, 'Should map directly').toStrictEqual(
            mappedObj.property_a_b
        );
    });

    test('should map directly mappable MODEL to DTO', () => {
        class DirectlyMappableModel extends Z.class({
            propertyA: z.string(),
            propertyAB: z.number(),
        }) {}

        class DirectlyMappableDTO extends Z.class({
            property_a: z.string(),
            property_a_b: z.number(),
        }) {}

        const mapperFunction = MapperBuilder.createModelToDtoMapper<
            DirectlyMappableModel,
            DirectlyMappableDTO
        >({
            mappedProperties: ['property_a', 'property_a_b'],
            constructor: (data) => DirectlyMappableDTO.schema().parse(data),
        });

        const mappedObj = new DirectlyMappableModel({
            propertyA: 'hello',
            propertyAB: 1,
        });

        const result = mapperFunction(mappedObj);

        expect(result.property_a, 'Should map directly').toStrictEqual(
            mappedObj.propertyA
        );
        expect(result.property_a_b, 'Should map directly').toStrictEqual(
            mappedObj.propertyAB
        );
    });

    test('should map from DTO using mappers', () => {
        class IndirectlyMappableDTO extends Z.class({
            property_a: z.number(),
        }) {}

        class IndirectlyMappableModel extends Z.class({
            propertyA: z.string(),
            propertyAB: z.number().nullable(),
        }) {}

        const mapperFunction = MapperBuilder.createDTOtoModelMapper<
            IndirectlyMappableDTO,
            IndirectlyMappableModel
        >({
            mappedProperties: [],
            mappers: {
                propertyA: (dto) => dto.property_a.toString(),
                propertyAB: (dto) => dto.property_a * -1,
            },
            constructor: (data: unknown) =>
                IndirectlyMappableModel.schema().parse(data),
        });

        const mappedObj = new IndirectlyMappableDTO({
            property_a: 1,
        });

        const result = mapperFunction(mappedObj);

        expect(result.propertyA, 'Should map directly').toStrictEqual(
            mappedObj.property_a.toString()
        );
        expect(result.propertyAB, 'Should map using mapper').toStrictEqual(
            mappedObj.property_a * -1
        );
    });
});
