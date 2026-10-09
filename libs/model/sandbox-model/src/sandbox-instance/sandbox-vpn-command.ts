import { Z } from 'zod-class';
import { z } from 'zod';

/**
 * NetBird VPN client configuration of a single sandbox.
 * Carries the ready-to-run client invocation alongside the values composing it. The invocation and
 * the setup key it embeds are absent while the sandbox holds no VPN access credential.
 */
export class SandboxVpnCommand extends Z.class({
    managementUrl: z.string(),
    setupKey: z.string().nullable(),
    routes: z.array(z.string()),
    command: z.string().nullable(),
}) {}
