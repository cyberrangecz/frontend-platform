import { describe, expect, it } from 'vitest';
import { topologyMapper } from './topology-mapper';
import { HostNode, RouterNode, Subnet, Topology } from '@crczp/sandbox-model';

const testDTO = {
    routers: [
        {
            name: 'router',
            os_type: 'linux',
            gui_access: false,
            subnets: [
                {
                    name: 'server-switch',
                    cidr: '192.168.20.0/24',
                    hosts: [
                        {
                            name: 'server',
                            os_type: 'linux',
                            gui_access: false,
                            ip: '192.168.20.5',
                        },
                    ],
                },
                {
                    name: 'client-switch',
                    cidr: '192.168.30.0/24',
                    hosts: [
                        {
                            name: 'client',
                            os_type: 'linux',
                            gui_access: false,
                            ip: '192.168.30.5',
                        },
                    ],
                },
            ],
        },
    ],
};

describe('topologyMapper', () => {
    it('should map DTO to Topology model correctly', () => {
        const result = topologyMapper(testDTO);
        expect(result).toBeInstanceOf(Topology);
        expect(result.routers).toHaveLength(1);
        const router = result.routers[0];
        expect(router).toBeInstanceOf(RouterNode);
        expect(router.name).toBe('router');
        expect(router.osType).toBe('linux');
        expect(router.guiAccess).toBe(false);
        expect(router.subnets).toHaveLength(2);
        expect(router.subnets[0]).toBeInstanceOf(Subnet);
        expect(router.subnets[0].name).toBe('server-switch');
        expect(router.subnets[0].cidr).toBe('192.168.20.0/24');
        expect(router.subnets[0].hosts).toHaveLength(1);
        expect(router.subnets[0].hosts[0]).toBeInstanceOf(HostNode);
        expect(router.subnets[0].hosts[0].name).toBe('server');
        expect(router.subnets[0].hosts[0].osType).toBe('linux');
        expect(router.subnets[0].hosts[0].guiAccess).toBe(false);
        expect(router.subnets[0].hosts[0].ip).toBe('192.168.20.5');
        expect(router.subnets[1].name).toBe('client-switch');
        expect(router.subnets[1].cidr).toBe('192.168.30.0/24');
        expect(router.subnets[1].hosts[0].name).toBe('client');
        expect(router.subnets[1].hosts[0].ip).toBe('192.168.30.5');
    });
});
