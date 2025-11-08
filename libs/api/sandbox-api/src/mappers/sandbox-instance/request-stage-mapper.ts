import {
    CloudResource,
    NetworkingAnsibleAllocationStage,
    NetworkingAnsibleCleanupStage,
    RequestStage,
    RequestStageState,
    TerraformAllocationStage,
    TerraformCleanupStage,
    UserAnsibleAllocationStage,
    UserAnsibleCleanupStage
} from '@crczp/sandbox-model';
import { AnsibleAllocationStageDTO } from '../../dto/sandbox-instance/stages/ansible-allocation-stage-dto';
import { AnsibleCleanupStageDTO } from '../../dto/sandbox-instance/stages/ansible-cleanup-stage-dto';
import { TerraformAllocationStageDTO } from '../../dto/sandbox-instance/stages/terraform-allocation-stage-dto';
import { TerraformCleanupStageDTO } from '../../dto/sandbox-instance/stages/terraform-cleanup-stage-dto';
import { CloudResourceDTO } from '../../dto/sandbox-instance/stages/cloud-resource-dto';
import { RequestStageDTO } from '../../dto/sandbox-instance/stages/request-stage-dto';

/**
 * @dynamic
 */
export class RequestStageMapper {
    static fromTerraformAllocationDTO(
        dto: TerraformAllocationStageDTO,
    ): TerraformAllocationStage {
        const stage = new TerraformAllocationStage();
        this.setGeneralAttributes(dto, stage);
        stage.status = dto.status;
        stage.statusReason = dto.status_reason;
        return stage;
    }

    static fromTerraformCleanupDTO(
        dto: TerraformCleanupStageDTO,
    ): TerraformCleanupStage {
        const stage = new TerraformCleanupStage();
        this.setGeneralAttributes(dto, stage);
        return stage;
    }

    static fromNetworkingAnsibleAllocationDTO(
        dto: AnsibleAllocationStageDTO,
    ): NetworkingAnsibleAllocationStage {
        const stage = new NetworkingAnsibleAllocationStage();
        this.setGeneralAttributes(dto, stage);
        this.setAnsibleAllocationGeneralAttributes(dto, stage);
        return stage;
    }

    static fromUserAnsibleAllocationDTO(
        dto: AnsibleAllocationStageDTO,
    ): UserAnsibleAllocationStage {
        const stage = new UserAnsibleAllocationStage();
        this.setGeneralAttributes(dto, stage);
        this.setAnsibleAllocationGeneralAttributes(dto, stage);
        return stage;
    }

    static fromNetworkingAnsibleCleanupDTO(
        dto: AnsibleCleanupStageDTO,
    ): NetworkingAnsibleCleanupStage {
        const stage = new NetworkingAnsibleCleanupStage();
        this.setGeneralAttributes(dto, stage);
        return stage;
    }

    static fromUserAnsibleCleanupDTO(
        dto: AnsibleCleanupStageDTO,
    ): UserAnsibleCleanupStage {
        const stage = new UserAnsibleCleanupStage();
        this.setGeneralAttributes(dto, stage);
        return stage;
    }

    static fromCloudResourceDTOs(dtos: CloudResource[]): CloudResource[] {
        return dtos.map((dto) => RequestStageMapper.fromCloudResourceDTO(dto));
    }

    static fromCloudResourceDTO(dto: CloudResourceDTO): CloudResource {
        const result = new CloudResource();
        result.name = dto.name;
        result.type = dto.type;
        result.status = dto.status;
        return result;
    }

    private static setGeneralAttributes(
        dto: RequestStageDTO,
        stage: RequestStage,
    ) {
        stage.id = dto.id;
        stage.requestId = dto.request_id;
        stage.state = this.resolveStageState(dto);
        stage.errorMessage = dto.error_message;

        if (dto.start) {
            stage.start = new Date(dto.start);
        }
        if (dto.end) {
            stage.end = new Date(dto.end);
        }
    }

    private static setAnsibleAllocationGeneralAttributes(
        dto: AnsibleAllocationStageDTO,
        stage: UserAnsibleAllocationStage | NetworkingAnsibleAllocationStage,
    ) {
        stage.repoUrl = dto.repo_url;
        stage.rev = dto.rev;
    }

    private static resolveStageState(dto: RequestStageDTO): RequestStageState {
        if (dto.failed) {
            return RequestStageState.FAILED;
        }
        if (
            (dto.start === undefined || dto.start === null) &&
            (dto.end === undefined || dto.end === null)
        ) {
            return RequestStageState.QUEUED;
        }
        if (
            dto.start !== undefined &&
            dto.start !== null &&
            (dto.end === undefined || dto.end === null)
        ) {
            return RequestStageState.RUNNING;
        }
        return RequestStageState.FINISHED;
    }
}
