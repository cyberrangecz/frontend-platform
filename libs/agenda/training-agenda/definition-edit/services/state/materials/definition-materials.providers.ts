import { DestroyRef, inject, Provider } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AttachmentSource, TrainingMaterials } from '@crczp/markdown';
import { AttachmentUrlCache, TrainingAttachmentApi } from '@crczp/training-api';
import {
    DefinitionLevelTexts,
    DefinitionTrainingMaterials,
    TrainingAttachmentSourceFactory,
} from '@crczp/training-agenda/internal';
import { TrainingDefinitionEditService } from '../edit/training-definition-edit.service';
import { LevelEditServiceTexts } from './level-edit-service-texts';

/**
 * Providers that give every markdown editor of the edited definition one shared materials store
 * and the attachment source reading from it, so all editors see the same files and quota.
 */
export function provideDefinitionMaterials(): Provider[] {
    return [
        { provide: DefinitionLevelTexts, useClass: LevelEditServiceTexts },
        {
            provide: DefinitionTrainingMaterials,
            useFactory: () => {
                const definition = toSignal(inject(TrainingDefinitionEditService).trainingDefinition$);
                return new DefinitionTrainingMaterials(
                    inject(TrainingAttachmentApi),
                    inject(DefinitionLevelTexts),
                    () => definition()?.id,
                );
            },
        },
        { provide: TrainingMaterials, useExisting: DefinitionTrainingMaterials },
        {
            provide: AttachmentSource,
            useFactory: () => {
                const definitionId = toSignal(inject(TrainingDefinitionEditService).trainingDefinition$)()?.id;
                inject(DestroyRef).onDestroy(inject(AttachmentUrlCache).hold(definitionId));
                return inject(TrainingAttachmentSourceFactory).create(
                    definitionId,
                    inject(DefinitionTrainingMaterials).pending,
                );
            },
        },
    ];
}
