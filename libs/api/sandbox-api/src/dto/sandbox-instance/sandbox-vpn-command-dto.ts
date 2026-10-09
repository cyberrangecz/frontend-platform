import { Z } from 'zod-class';
import { z } from 'zod';

export class SandboxVpnCommandDTO extends Z.class({
    management_url: z.string(),
    setup_key: z.string().nullable(),
    routes: z.array(z.string()),
    command: z.string().nullable(),
}) {}
