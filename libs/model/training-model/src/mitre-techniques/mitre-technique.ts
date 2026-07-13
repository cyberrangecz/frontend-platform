import { Z } from 'zod-class';
import { z } from 'zod';

export class MitreTechniqueBasic extends Z.class({
    id: z.number(),
    techniqueKey: z.string(),
}) {}

export class MitreTechnique {
    id!: number;
    techniqueKey!: string;
    techniqueName!: string;
}
