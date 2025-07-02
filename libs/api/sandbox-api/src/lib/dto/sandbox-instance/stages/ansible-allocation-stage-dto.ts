import {RequestStageDTO} from './request-stage-dto';

export class AnsibleAllocationStageDTO extends RequestStageDTO {
    repo_url: string;
    rev: string;
}
