import { Z } from 'zod-class';
import { z } from 'zod';
import { AbstractLevelTypeEnum } from '../enums/abstract-level-type.enum';

/**
 * Shared Z.class base containing common fields safe for all roles across all level types.
 * Subclasses that add no extra fields extend this directly.
 * Subclasses with extra fields: `AbstractLevelBasic.extend({...})`.
 */
export class AbstractLevelBasic extends Z.class({
    id: z.number(),
    title: z.string(),
    order: z.number(),
    estimatedDuration: z.number(),
    maxScore: z.number(),
    type: z.nativeEnum(AbstractLevelTypeEnum),
}) {
    declare id: number;
    declare title: string;
    declare order: number;
    declare estimatedDuration: number;
    declare maxScore: number;
    declare type: AbstractLevelTypeEnum;
}
