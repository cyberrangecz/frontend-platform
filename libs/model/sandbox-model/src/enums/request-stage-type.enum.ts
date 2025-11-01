export enum RequestStageType {
    TERRAFORM_ALLOCATION,
    NETWORKING_ANSIBLE_ALLOCATION,
    USER_ANSIBLE_ALLOCATION,
    TERRAFORM_CLEANUP,
    NETWORKING_ANSIBLE_CLEANUP,
    USER_ANSIBLE_CLEANUP,
}

export class RequestStageTypeMapper {
    /**
     * Maps stage type to order of execution
     * 0: Terraform
     * 1: User Ansible
     * 2: Networking Ansible
     * @param stageType
     */
    static toOrderOfExecution(stageType: RequestStageType): number | undefined {
        switch (stageType) {
            case RequestStageType.TERRAFORM_ALLOCATION:
            case RequestStageType.TERRAFORM_CLEANUP:
                return 0;
            case RequestStageType.NETWORKING_ANSIBLE_ALLOCATION:
            case RequestStageType.NETWORKING_ANSIBLE_CLEANUP:
                return 1;
            case RequestStageType.USER_ANSIBLE_ALLOCATION:
            case RequestStageType.USER_ANSIBLE_CLEANUP:
                return 2;
        }
    }
}
