import { VirtualImageDTO } from '../dto/vm-images/virtual-image-d-t-o';

export type PoolSort =
    | 'allocation_units'
    | 'comment'
    | 'created_by'
    | 'created_by_id'
    | 'definition'
    | 'definition_id'
    | 'id'
    | 'lock'
    | 'management_certificate'
    | 'max_size'
    | 'private_management_key'
    | 'public_management_key'
    | 'rev'
    | 'rev_sha'
    | 'sandboxrequestgroup'
    | 'send_emails'
    | 'size'
    | 'uuid'
    | 'visible';
export type SandboxDefinitionSort =
    | 'created_by'
    | 'created_by_id'
    | 'id'
    | 'name'
    | 'pool'
    | 'rev'
    | 'url';
export type SandboxDefinitionRefSort = never; // TODO: define when needed
export type SandboxInstanceSort =
    | 'allocation_unit'
    | 'allocation_unit_id'
    | 'id'
    | 'lock'
    | 'private_user_key'
    | 'public_user_key'
    | 'ready';
export type AllocationRequestSort = 'id';
export type ResourceUsageSort = never; // TODO: define when needed
export type VmImageSort = keyof VirtualImageDTO;
export type PoolLockSort = never; // TODO: define when needed
export type AllocationOutputSort = 'content';
