import { RequestStageType } from '@crczp/sandbox-model';

export const TERRAFORM_STAGE_TYPES = [RequestStageType.TERRAFORM_ALLOCATION, RequestStageType.TERRAFORM_CLEANUP];
export const ANSIBLE_STAGE_TYPES = [
    RequestStageType.NETWORKING_ANSIBLE_ALLOCATION,
    RequestStageType.NETWORKING_ANSIBLE_CLEANUP,
    RequestStageType.USER_ANSIBLE_ALLOCATION,
    RequestStageType.USER_ANSIBLE_CLEANUP,
];

export const ANSIBLE_NETWORKING_TYPES = [
    RequestStageType.NETWORKING_ANSIBLE_ALLOCATION,
    RequestStageType.NETWORKING_ANSIBLE_CLEANUP,
];

export const ANSIBLE_USER_TYPES = [RequestStageType.USER_ANSIBLE_ALLOCATION, RequestStageType.USER_ANSIBLE_CLEANUP];
