/**
 * Progress of the request that builds or removes a sandbox. Each stage is IN_QUEUE, RUNNING,
 * FINISHED or FAILED.
 */
export interface SandboxRequestDTO {
    id: number;
    allocation_unit_id: number;
    stages: string[];
}

/**
 * A sandbox the trainee allocated for themselves.
 */
export interface TraineeSandboxDTO {
    id: number;
    pool_id: number;
    sandbox_id?: string;
    created_at?: string;
    allocation_request?: SandboxRequestDTO;
    cleanup_request?: SandboxRequestDTO;
    allow_remove: boolean;
    training_instance_id?: number;
    training_instance_title?: string;
}
