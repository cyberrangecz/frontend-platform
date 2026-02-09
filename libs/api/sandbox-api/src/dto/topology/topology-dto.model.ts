import { Z } from 'zod-class';
import { z } from 'zod';

export class HostNodeDTO extends Z.class({
    name: z.string(),
    os_type: z.string(),
    gui_access: z.boolean(),
    is_accessible: z.boolean(),
    ip: z.string().nullable(),
}) {}

export class SubnetDTO extends Z.class({
    name: z.string(),
    cidr: z.string(),
    hosts: z.array(HostNodeDTO.schema()),
}) {}

export class RouterNodeDTO extends HostNodeDTO.extend({
    subnets: z.array(SubnetDTO.schema()),
}) {}

export class TopologyDTO extends Z.class({
    routers: z.array(RouterNodeDTO.schema()),
}) {}
