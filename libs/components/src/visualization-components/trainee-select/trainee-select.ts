import { CommonModule } from '@angular/common';
import {
    Component,
    computed,
    effect,
    input,
    model,
    output,
    signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import { TraineeProgressData } from '@crczp/visualization-model';

@Component({
    selector: 'crczp-trainee-select',
    imports: [
        FormsModule,
        CommonModule,
        MatFormField,
        MatInput,
        MatLabel,
        MatButton,
    ],
    templateUrl: './trainee-select.html',
    styleUrl: './trainee-select.scss',
})
export class TraineeSelect {
    trainees = input.required<TraineeProgressData[]>();
    traineeCount = input<number>(20);

    selectedTraineesChange = output<TraineeProgressData[]>();
    highlightedTraineeId = model<number | null>(null);

    traineeDeselectedIds = signal<{ [key: number]: void }>({});
    searchTerm = signal<string>('');

    filteredTrainees = computed(() => {
        const search = this.searchTerm().toLowerCase();
        const allTrainees = this.trainees().sort((a, b) =>
            a.name.localeCompare(b.name),
        );

        if (!search) {
            return allTrainees;
        }

        return allTrainees.filter((trainee) =>
            trainee.name.toLowerCase().includes(search),
        );
    });

    // Live counts for selected and total trainees
    selectedCount = computed(
        () =>
            this.totalCount() - Object.keys(this.traineeDeselectedIds()).length,
    );

    totalCount = computed(() => this.trainees().length);

    constructor() {
        effect(() => {
            const deselectedIds = this.traineeDeselectedIds();
            const allTrainees = this.trainees();

            // Only filter if there are deselected trainees
            const selected =
                Object.keys(deselectedIds).length === 0
                    ? allTrainees
                    : allTrainees.filter(
                          (trainee) => !(trainee.id in deselectedIds),
                      );
            this.selectedTraineesChange.emit(selected);
        });
    }

    onTraineeToggle(traineeId: number) {
        this.traineeDeselectedIds.update((current) => {
            const newState = { ...current };
            if (traineeId in newState) {
                delete newState[traineeId];
            } else {
                newState[traineeId] = void 0;
            }
            return newState;
        });
    }

    isTraineeSelected(traineeId: number): boolean {
        return !(traineeId in this.traineeDeselectedIds());
    }

    selectAll() {
        this.traineeDeselectedIds.set({});
    }

    deselectAll() {
        const allIds: { [key: number]: void } = {};
        this.trainees().forEach((trainee) => {
            allIds[trainee.id] = void 0;
        });
        this.traineeDeselectedIds.set(allIds);
    }

    invert() {
        const allTrainees = this.trainees();
        const current = this.traineeDeselectedIds();
        const newState: { [key: number]: void } = {};

        allTrainees.forEach((trainee) => {
            if (!(trainee.id in current)) {
                newState[trainee.id] = void 0;
            }
        });

        this.traineeDeselectedIds.set(newState);
    }

    onSearchChange(value: string) {
        this.searchTerm.set(value);
    }

    getTruncatedName(name: string): string {
        if (name.length > 20) {
            return name.substring(0, 20) + '...';
        }
        return name;
    }

    getImageSrc(picture: string): string {
        return `data:image/png;base64,${picture}`;
    }
}
