import { Z } from 'zod-class';
import { z } from 'zod';

const osType = z.enum(['linux', 'windows', 'other']);

export type OsType = z.infer<typeof osType>;

export class HostNode extends Z.class({
    name: z.string(),
    osType: osType,
    guiAccess: z.boolean(),
    isAccessible: z.boolean(),
    ip: z.string().nullable(),
}) {}

export class Subnet extends Z.class({
    name: z.string(),
    cidr: z.string(),
    hosts: z.array(z.lazy(() => HostNode.schema())),
}) {}

export class RouterNode extends HostNode.extend({
    subnets: z.array(z.lazy(() => Subnet.schema())),
}) {}

export class Topology extends Z.class({
    routers: z.array(z.lazy(() => RouterNode.schema())),
}) {}
