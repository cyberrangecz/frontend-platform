export type PoolSort =
    | 'id'
    | 'definition_id'
    | 'created_by_id'
    | 'size'
    | 'max_size'
    | 'rev'
    | 'rev_sha'
    | 'comment'
    | 'visible'
    | 'send_emails';
export type SandboxDefinitionSort =
    | 'id'
    | 'name'
    | 'url'
    | 'rev'
    | 'created_by_id';
export type SandboxDefinitionRefSort = 'name';
export type SandboxInstanceSort = 'id' | 'allocation_unit_id' | 'ready';
export type SandboxAllocationUnitSort =
    | 'id'
    | 'pool_id'
    | 'created_by_id'
    | 'comment';
export type AllocationRequestSort = 'id' | 'allocation_unit_id' | 'created';
export type ResourceUsageSort = never; // TODO: define when needed
export type VmImageSort =
    | 'name'
    | 'os_distro'
    | 'os_type'
    | 'disk_format'
    | 'container_format'
    | 'visibility'
    | 'size'
    | 'status'
    | 'min_ram'
    | 'min_disk'
    | 'created_at'
    | 'updated_at'
    | 'default_user';
export type PoolLockSort = 'id' | 'pool_id';
