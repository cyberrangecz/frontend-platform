import { z } from 'zod';

type AnyConstructor = abstract new (...args: never[]) => object;

type ShapeOutput<Shape extends z.ZodRawShape> = z.output<z.ZodObject<Shape>>;

type ShapeInput<Shape extends z.ZodRawShape> = z.input<z.ZodObject<Shape>>;

type ExtendedShape<
    Shape extends z.ZodRawShape,
    Augmentation extends z.ZodRawShape,
> = z.core.util.Extend<Shape, Augmentation>;

/**
 * Class whose instances hold the parsed output of an object schema, typed field by field.
 *
 * @typeParam Shape Object schema shape the class validates.
 * @typeParam Base Members inherited from the class this one was extended from.
 */
export interface ZodClass<Shape extends z.ZodRawShape, Base extends object = object> {
    /** Validates the data against the schema and assigns the parsed output to the new instance. */
    new (data: ShapeInput<Shape>): Omit<Base, keyof ShapeOutput<Shape>> & ShapeOutput<Shape>;

    /** Object schema validated by the class. */
    readonly objectSchema: z.ZodObject<Shape>;

    /**
     * Schema that parses into instances of the class it is called on, subclasses included,
     * usable wherever a zod schema is, nested in other schemas or `z.lazy` included.
     */
    schema<Class extends AnyConstructor>(this: Class): z.ZodType<InstanceType<Class>, ShapeInput<Shape>>;

    /**
     * Parses the data into an instance of the class it is called on.
     *
     * @throws {z.ZodError} When the data does not satisfy the schema.
     */
    parse<Class extends AnyConstructor>(this: Class, data: unknown): InstanceType<Class>;

    /**
     * Derives a subclass validating this class's shape plus the augmentation, which overrides
     * fields of the same name. The subclass keeps the members of the class it extends.
     */
    extend<Class extends AnyConstructor, Augmentation extends z.ZodRawShape>(
        this: Class,
        augmentation: Augmentation,
    ): ZodClass<ExtendedShape<Shape, Augmentation>, InstanceType<Class>>;
}

const schemasByClass = new WeakMap<object, z.ZodType>();

/** Runtime behaviour of every schema-backed class, keyed on the object schema of the concrete class. */
abstract class ZodClassBase {
    static objectSchema: z.ZodObject;

    constructor(data: unknown) {
        Object.assign(this, (new.target as typeof ZodClassBase).objectSchema.parse(data));
    }

    static schema(this: typeof ZodClassBase): z.ZodType {
        let schema = schemasByClass.get(this);
        if (!schema) {
            schema = this.objectSchema.transform((output) =>
                Object.assign(Object.create(this.prototype), output),
            );
            schemasByClass.set(this, schema);
        }
        return schema;
    }

    static parse(this: typeof ZodClassBase, data: unknown): unknown {
        return this.schema().parse(data);
    }

    static extend(this: typeof ZodClassBase, augmentation: z.ZodRawShape): typeof ZodClassBase {
        const objectSchema = this.objectSchema.extend(augmentation);
        return class extends this {
            static override objectSchema = objectSchema;
        };
    }
}

export const Z = {
    /**
     * Creates a class validating its constructor data against an object schema of the shape.
     *
     * @param shape Fields of the object schema.
     * @returns A class to extend, whose instances carry the parsed schema output.
     */
    class<Shape extends z.ZodRawShape>(shape: Shape): ZodClass<Shape> {
        const objectSchema = z.object(shape);
        return class extends ZodClassBase {
            static override objectSchema = objectSchema;
        } as unknown as ZodClass<Shape>;
    },
};
