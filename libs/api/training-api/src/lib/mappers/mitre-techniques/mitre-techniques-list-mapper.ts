import { MitreTechnique } from '@crczp/training-model';
import { MitreTechniquePythonDTO, MitreTechniquesListDTO } from '../../dto/mitre-techniques/mitre-techniques-list-dto';

/**
 * @dynamic
 */
export class MitreTechniquesListMapper {
    static fromDTO(dto: MitreTechniquesListDTO): MitreTechnique[] {
        return MitreTechniquesListMapper.fromTechniqueDTOs(dto.techniques);
    }

    static fromTechniqueDTOs(dtos: MitreTechniquePythonDTO[]): MitreTechnique[] {
        return dtos.map((dto) => MitreTechniquesListMapper.fromTechniqueDTO(dto));
    }

    static fromTechniqueDTO(dto: MitreTechniquePythonDTO): MitreTechnique {
        const result = new MitreTechnique();
        result.techniqueKey = dto.code;
        result.techniqueName = dto.name;
        return result;
    }
}
