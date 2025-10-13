import { Z } from 'zod-class';
import { z } from 'zod';

class ConnectableNode extends Z.class({
    name: z.string(),
    osType: z.string(),
    guiAccess: z.boolean(),
}) {}

export class HostNode extends ConnectableNode.extend({
    ip: z.string(),
}) {}

export class Subnet extends Z.class({
    name: z.string(),
    cidr: z.string(),
    hosts: HostNode.schema().array(),
}) {}

export class RouterNode extends ConnectableNode.extend({
    subnets: Subnet.schema().array(),
}) {}

export class Topology extends Z.class({
    routers: RouterNode.schema().array(),
}) {}
