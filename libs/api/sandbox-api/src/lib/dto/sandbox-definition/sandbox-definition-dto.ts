import { CreatedByDTO } from '../sandbox-instance/created-by-dto';

export class SandboxDefinitionDTO {
    id: number;
    name: string;
    rev: string;
    url?: string;
    created_by: CreatedByDTO;
}
