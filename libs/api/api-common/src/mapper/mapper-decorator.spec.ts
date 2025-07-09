import {ApiReadMapper, MappersModule} from './mapper-decorator';
import {beforeEach, describe, expect} from 'vitest';
import {TestBed} from '@angular/core/testing';


describe("Testing of properties mapping", () => {

    class ModelClass {
        public normalProperty!: string;
        public indirectProperty!: number;
    }

    @ApiReadMapper<DtoClass, ModelClass>({
            mappedProperties: ['normalProperty'],
            mappers: {
                indirectProperty: from => from.normal_property.length
            },
            resultClass: ModelClass
        },
    )
    class DtoClass {
        public normal_property!: string;
    }

    let mapper: (from: DtoClass) => ModelClass

    beforeEach(()=>{
        TestBed.configureTestingModule({
            imports: [
                MappersModule.provideMappers()
            ]
        })

        mapper = TestBed.inject(MappersModule.getMapperToken(DtoClass,ModelClass));
    })



    test('Should get mapper and map to class instance',()=>{

        expect(mapper, 'should find mapper').toBeDefined()

        if(mapper){
            const dto = new DtoClass()
            dto.normal_property = 'normal_property';

            const model = mapper(dto);

            expect(model,'should be created').toBeDefined()
            expect(model,'should be mapped to object, not class instance').toBeInstanceOf(ModelClass)
            expect(model.normalProperty,'should have correct direct properties').toStrictEqual(dto.normal_property)
            expect(model.indirectProperty,'should have correct indirec properties').toStrictEqual(dto.normal_property.length)
        }
    })
})



