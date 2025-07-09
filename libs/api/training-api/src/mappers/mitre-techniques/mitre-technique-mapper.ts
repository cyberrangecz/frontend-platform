import {MitreTechnique} from '@crczp/training-model';
import {MitreTechniqueDTO} from '../../dto/mitre-techniques/mitre-technique-dto';

/**
 * @dynamic
 */
export class MitreTechniqueMapper {
    static fromDTO(dto: MitreTechniqueDTO): MitreTechnique {
        const result = new MitreTechnique();
        result.id = dto.id;
        result.techniqueKey = dto.technique_key;
        return result;
    }

    static fromDTOs(dtos: MitreTechniqueDTO[]): MitreTechnique[] {
        return dtos.map((dto) => MitreTechniqueMapper.fromDTO(dto));
    }

    static toDTO(mitreTechnique: MitreTechnique): MitreTechniqueDTO {
        const result = new MitreTechniqueDTO();
        result.id = mitreTechnique.id;
        result.technique_key = mitreTechnique.techniqueKey;
        return result;
    }

    static toDTOs(mitreTechniques: MitreTechnique[]): MitreTechniqueDTO[] {
        return mitreTechniques.map((mitreTechnique) => MitreTechniqueMapper.toDTO(mitreTechnique));
    }
}
