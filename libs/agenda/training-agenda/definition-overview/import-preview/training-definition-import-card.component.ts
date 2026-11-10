import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { ByteSizePipe } from '@crczp/markdown';
import { AbstractLevelTypeEnum } from '@crczp/training-model';
import { Utils } from '@crczp/utils';
import { ImportedLevelKind, TrainingDefinitionImportSummary } from './training-definition-import-summary';

interface LevelKindPresentation {
    label: string;
    levelType: AbstractLevelTypeEnum;
}

const LEVEL_KIND_PRESENTATIONS: Readonly<Record<ImportedLevelKind, LevelKindPresentation>> = {
    info: { label: 'Info', levelType: AbstractLevelTypeEnum.Info },
    assessment: { label: 'Assessment', levelType: AbstractLevelTypeEnum.Assessment },
    training: { label: 'Training', levelType: AbstractLevelTypeEnum.Training },
    access: { label: 'Access', levelType: AbstractLevelTypeEnum.Access },
};

const MINUTES_PER_HOUR = 60;

/** Shows the title, level counts, duration and file details of one definition to import. */
@Component({
    selector: 'crczp-training-definition-import-card',
    standalone: true,
    imports: [MatIconModule, ByteSizePipe],
    templateUrl: './training-definition-import-card.component.html',
    styleUrl: './training-definition-import-card.component.scss',
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TrainingDefinitionImportCardComponent {
    readonly entity = input.required<TrainingDefinitionImportSummary>();

    protected readonly levelCounts = computed(() =>
        (Object.keys(LEVEL_KIND_PRESENTATIONS) as ImportedLevelKind[]).map((kind) => ({
            label: LEVEL_KIND_PRESENTATIONS[kind].label,
            icon: Utils.LevelType.levelTypeToIcon(LEVEL_KIND_PRESENTATIONS[kind].levelType),
            count: this.entity().levelCounts[kind],
        })),
    );

    protected readonly duration = computed(() => {
        const minutes = this.entity().estimatedDurationMinutes;
        const hours = Math.floor(minutes / MINUTES_PER_HOUR);
        const rest = minutes % MINUTES_PER_HOUR;
        if (hours === 0) {
            return `${rest} min`;
        }
        return rest === 0 ? `${hours} h` : `${hours} h ${rest} min`;
    });
}
