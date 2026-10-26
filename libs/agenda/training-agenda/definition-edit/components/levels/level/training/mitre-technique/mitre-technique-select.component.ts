import {ChangeDetectionStrategy, Component, computed, ElementRef, EventEmitter, inject, Input, Output, signal, ViewChild} from '@angular/core';
import {MitreTechnique} from '@crczp/training-model';
import {MatChipGrid, MatChipInput, MatChipRemove, MatChipRow} from '@angular/material/chips';
import {
    MatAutocomplete,
    MatAutocompleteSelectedEvent,
    MatAutocompleteTrigger,
    MatOption
} from '@angular/material/autocomplete';
import {MatFormField, MatHint, MatInput, MatLabel} from "@angular/material/input";
import {MatIcon} from "@angular/material/icon";
import {MatButton} from "@angular/material/button";
import {MitreTechniquesService} from "../../../../../services/state/mitre-techniques/mitre-techniques.service";
import {
    MatExpansionPanel,
    MatExpansionPanelDescription,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle
} from "@angular/material/expansion";

@Component({
    selector: 'crczp-mitre-technique-select',
    templateUrl: './mitre-technique-select.component.html',
    styleUrls: ['./mitre-technique-select.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatHint,
        MatOption,
        MatAutocomplete,
        MatIcon,
        MatButton,
        MatChipRemove,
        MatChipRow,
        MatChipGrid,
        MatLabel,
        MatFormField,
        MatExpansionPanelDescription,
        MatExpansionPanelTitle,
        MatExpansionPanelHeader,
        MatExpansionPanel,
        MatChipInput,
        MatAutocompleteTrigger,
        MatInput
    ]
})
export class MitreTechniqueSelectComponent {
    @Input() mitreTechniques: MitreTechnique[];

    @Output() mitreTechniquesChange: EventEmitter<MitreTechnique[]> = new EventEmitter();

    @ViewChild('techniqueInput') techniqueInput: ElementRef<HTMLInputElement>;

    private readonly mitreTechniquesService = inject(MitreTechniquesService);
    private readonly filterText = signal('');

    readonly loadState = this.mitreTechniquesService.loadState;
    readonly filteredTechniquesList = computed(() => {
        const filterValue = this.filterText().toLowerCase();
        return this.mitreTechniquesService
            .techniques()
            .filter((technique) =>
                `${technique.techniqueKey} - ${technique.techniqueName}`
                    .toLowerCase()
                    .includes(filterValue),
            );
    });

    loadTechniques(): void {
        this.mitreTechniquesService.load();
    }

    remove(technique) {
        const index = this.mitreTechniques.indexOf(technique);

        if (index >= 0) {
            this.mitreTechniques.splice(index, 1);
        }
        this.mitreTechniquesChange.emit(this.mitreTechniques);
    }

    isSelected(technique: MitreTechnique): boolean {
        return this.mitreTechniques.some((selected) => selected.techniqueKey === technique.techniqueKey);
    }

    selected(event: MatAutocompleteSelectedEvent): void {
        this.pushTechnique(event.option.value.techniqueKey);
        this.techniqueInput.nativeElement.value = '';
        this.filterText.set('');
    }

    onInput(event: Event): void {
        this.filterText.set((event.target as HTMLInputElement).value);
    }

    private pushTechnique(technique: string): void {
        const mitreTechnique = new MitreTechnique();
        mitreTechnique.techniqueKey = technique;
        this.mitreTechniques.push(mitreTechnique);
        this.mitreTechniquesChange.emit(this.mitreTechniques);
    }
}
