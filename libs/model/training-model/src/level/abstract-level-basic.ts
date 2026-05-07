import { Z } from 'zod-class';
import { z } from 'zod';
import { AbstractLevelTypeEnum } from '../enums/abstract-level-type.enum';

/**
 * Raw zod schema for common level fields.
 * Use this (not {@link AbstractLevelBasic.schema()}) when extending with {@link z.ZodObject.extend}.
 */
export const abstractLevelBasicSchema = z.object({
    id: z.number(),
    title: z.string(),
    order: z.number(),
    estimatedDuration: z.number(),
    minimalPossibleSolveTime: z.number(),
    maxScore: z.number(),
    type: z.nativeEnum(AbstractLevelTypeEnum),
});

/**
 * Shared Z.class base containing common fields safe for all roles across all level types.
 * Subclasses that add no extra fields extend this directly.
 * Subclasses with extra fields: {@link Z.class}({@link abstractLevelBasicSchema}.extend({...})).
 */
export class AbstractLevelBasic extends Z.class({
    id: z.number(),
    title: z.string(),
    order: z.number(),
    estimatedDuration: z.number(),
    minimalPossibleSolveTime: z.number(),
    maxScore: z.number(),
    type: z.nativeEnum(AbstractLevelTypeEnum),
}) {
    declare id: number;
    declare title: string;
    declare order: number;
    declare estimatedDuration: number;
    declare minimalPossibleSolveTime: number;
    declare maxScore: number;
    declare type: AbstractLevelTypeEnum;
}
