import type { ApiClient } from '../../api/api-client';
import type { ChainRecord, SharedFixture } from '../../shared-fixture';
import { listAllocationUnits, listSandboxes, type AllocationUnitRecord } from './pool-data';

/** The sandbox a browser's chain allocated in the shared pool. */
export interface ChainSandbox {
    poolId: number;
    allocationUnit: AllocationUnitRecord;
    allocationRequestId: number;
    sandboxUuid: string;
}

interface TopologyHost {
    name: string;
    is_accessible: boolean;
}

interface TopologyRouter extends TopologyHost {
    subnets: { hosts: TopologyHost[] }[];
}

/** Finds the allocation unit and the sandbox that the chain of a browser left in the shared pool. */
export async function locateChainSandbox(
    sandbox: ApiClient,
    shared: SharedFixture,
    chain: ChainRecord,
): Promise<ChainSandbox> {
    const poolId = shared.pool.id;
    const unit = (await listAllocationUnits(sandbox, poolId)).find(
        (candidate) => candidate.id === chain.allocationUnitId,
    );
    const ownSandbox = (await listSandboxes(sandbox, poolId)).find(
        (candidate) => candidate.allocation_unit_id === chain.allocationUnitId,
    );
    if (!unit || !ownSandbox) {
        throw new Error(`The chain's allocation unit ${chain.allocationUnitId} has no sandbox in pool ${poolId}`);
    }
    return {
        poolId,
        allocationUnit: unit,
        allocationRequestId: unit.allocation_request.id,
        sandboxUuid: ownSandbox.id,
    };
}

/** The name of the first host of the sandbox that offers console access. */
export async function firstAccessibleHostName(sandbox: ApiClient, sandboxUuid: string): Promise<string> {
    const topology = await sandbox.get<{ routers: TopologyRouter[] }>(`/sandboxes/${sandboxUuid}/topology`);
    const hosts = topology.routers.flatMap((router) => router.subnets.flatMap((subnet) => subnet.hosts));
    const host = hosts.find((candidate) => candidate.is_accessible);
    if (!host) {
        throw new Error(`Sandbox ${sandboxUuid} has no accessible host`);
    }
    return host.name;
}
