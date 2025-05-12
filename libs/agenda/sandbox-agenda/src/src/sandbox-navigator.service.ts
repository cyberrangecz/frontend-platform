/**
 * Creates routes to navigate between components and pages of sandbox agenda. Default implementation is provived,
 * but can be overridden by client if custom routes are desired
 */
export abstract class SandboxNavigator {
    /**
     * Returns route to sandbox definition page
     */
    abstract toSandboxDefinitionOverview(): string;

    /**
     * Returns route to new sandbox definition page
     */
    abstract toNewSandboxDefinition(): string;

    /**
     * Returns route to pool detail page
     * @param id id of the pool
     */
    abstract toPool(id: number | string): string;

    /**
     * Returns route to pool overview page
     */
    abstract toPoolOverview(): string;

    /**
     * Returns route to images page
     */
    abstract toImages(): string;

    /**
     * Returns route to create pool page
     */
    abstract toCreatePool(): string;

    /**
     * Returns route to update pool page
     * @param poolId id of the pool to update
     */
    abstract toUpdatePool(poolId: number): string;

    /**
     * Returns route to sandbox instance topology page
     * @param sandboxDefinitionId id of the sandbox definition
     */
    abstract toSandboxDefinitionTopology(sandboxDefinitionId: number | string): string;

    /**
     * Returns route to sandbox instance topology page
     * @param poolId id of the pool associated with the sandbox instance
     * @param sandboxUuid id of the sandbox
     */
    abstract toSandboxInstanceTopology(poolId: number | string, sandboxUuid: number | string): string;

    /**
     *
     * @param poolId
     * @param requestId
     */
    abstract toAllocationUnit(poolId: number | string, requestId: number | string): string;

    /**
     * Returns path to creation request detail page
     * @param poolId id of the pool associated with the request
     * @param requestId id of the request
     */
    abstract toAllocationRequest(poolId: number | string, requestId: number | string): string;

    /**
     * Returns path to cleanup request detail page
     * @param poolId id of the pool associated with the request
     * @param requestId id of the request
     */
    abstract toCleanupRequest(poolId: number | string, requestId: number | string): string;
}
