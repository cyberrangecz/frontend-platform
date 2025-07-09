import {MapperBuilder} from "./mapper-builder";
import {describe, expect, test} from "vitest";

describe("Testing of properties mapping", () => {

    test('camel case should translate correctly', () => {
        const snake_case = [
            'standard',
            'one_underscore',
            'two_under_scores',
        ]

        const camelCase = [
            'standard',
            'oneUnderscore',
            'twoUnderScores',
        ]

        const camelToSnakeConversions = camelCase.map(MapperBuilder.camelToSnakeCase);

        camelToSnakeConversions.forEach((value, index) => {
            expect(value, 'Should translate to snake_case').toStrictEqual(snake_case[index]);
        });

    })

    test('snake case should translate correctly', () => {
        const snake_case = [
            'standard',
            'one_underscore',
            'two_under_scores',
        ]

        const camelCase = [
            'standard',
            'oneUnderscore',
            'twoUnderScores',
        ]

        const snakeToCamelConversions = snake_case.map(MapperBuilder.snakeToCamelCase);

        snakeToCamelConversions.forEach((value, index) => {
            expect(value, 'Should translate to camelCase').toStrictEqual(camelCase[index]);
        });

    })

    test('should map directly mappable DTO to MODEL', () => {

        const mappedObj = {
            property_a: 'property_a',
            property_a_b: 1
        }

        const mapperFunction =
            MapperBuilder.createDTOtoModelMapper<typeof mappedObj, {
                propertyA: string, propertyAB: number
            }>({
                mappedProperties: ["propertyA", "propertyAB"],
            });

        const result = mapperFunction(mappedObj)

        expect(result.propertyA, 'Should map directly').toStrictEqual(mappedObj.property_a);
        expect(result.propertyAB, 'Should map directly').toStrictEqual(mappedObj.property_a_b);
    })

    test('should map directly mappable MODEL to DTO', () => {

        const mappedObj = {
            someProperty: 'Hi',
            otherProperty: 100
        }

        const mapperFunction =
            MapperBuilder.createModelToDtoMapper<typeof mappedObj, {
                some_property: string, other_property: number
            }>({
                mappedProperties: ['other_property', 'some_property'],
            })

        const result = mapperFunction(mappedObj)

        expect(result.some_property, 'Should map directly').toStrictEqual(mappedObj.someProperty);
        expect(result.other_property, 'Should map directly').toStrictEqual(mappedObj.otherProperty);
    })

    test('should map from DTO using mappers', () => {

        const mappedObj = {
            property_a: 'value',
        }

        const mapperFunction =
            MapperBuilder.createDTOtoModelMapper<typeof mappedObj, {
                propertyA: string, propertyAB: number
            }>({
                mappers: {
                    propertyAB: dto => dto.property_a.length
                },
                mappedProperties: ["propertyA"]
            })

        const result = mapperFunction(mappedObj)

        expect(result.propertyA, 'Should map directly').toStrictEqual(mappedObj.property_a);
        expect(result.propertyAB, 'Should map using mapper').toStrictEqual(mappedObj.property_a.length);
    })

    test('should map from MODEL using mappers', () => {

        const mappedObj = {
            someProperty: 'some value',
        }

        const mapperFunction =
            MapperBuilder.createModelToDtoMapper<typeof mappedObj, {
                some_property: string,
                unrealized_property: { key: string }
            }>({
                mappers: {
                    unrealized_property: dto => ({ key: dto.someProperty })
                },
                mappedProperties: ["some_property"]
            })

        const result = mapperFunction(mappedObj)

        expect(result.some_property, 'Should map directly').toStrictEqual(mappedObj.someProperty);
        expect(result.unrealized_property, 'Should map using mapper').toStrictEqual({ key: mappedObj.someProperty });
    })
});
