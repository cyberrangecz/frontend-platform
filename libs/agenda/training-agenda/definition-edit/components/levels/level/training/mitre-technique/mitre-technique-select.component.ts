import {ChangeDetectionStrategy, Component, computed, ElementRef, EventEmitter, inject, Input, Output, signal, ViewChild} from '@angular/core';
import {MitreTechnique} from '@crczp/training-model';
import {COMMA, ENTER, SEMICOLON} from '@angular/cdk/keycodes';
import {MatChipGrid, MatChipInput, MatChipInputEvent, MatChipRemove, MatChipRow} from '@angular/material/chips';
import {ReactiveFormsModule, UntypedFormControl} from '@angular/forms';
import {
    MatAutocomplete,
    MatAutocompleteSelectedEvent,
    MatAutocompleteTrigger,
    MatOption
} from '@angular/material/autocomplete';
import {MatError, MatFormField, MatHint, MatInput, MatLabel} from "@angular/material/input";
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
        MatError,
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
        ReactiveFormsModule,
        MatChipInput,
        MatAutocompleteTrigger,
        MatInput
    ]
})
export class MitreTechniqueSelectComponent {
    @Input() mitreTechniques: MitreTechnique[];

    @Output() mitreTechniquesChange: EventEmitter<MitreTechnique[]> = new EventEmitter();

    @ViewChild('techniqueInput') techniqueInput: ElementRef<HTMLInputElement>;

    chipListCtrl = new UntypedFormControl();
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

    readonly separatorKeysCodes = [ENTER, COMMA, SEMICOLON] as const;

    loadTechniques(): void {
        this.mitreTechniquesService.load();
    }

    add(event: MatChipInputEvent) {
        const value = (event.value || '').trim();
        if (value) {
            if (this.hasValidFormat(value)) {
                this.pushTechnique(value.trim());
                event.chipInput?.clear();
            } else {
                this.chipListCtrl.setErrors({wrongFormat: true});
                this.chipListCtrl.markAsTouched();
            }
        }
    }

    remove(technique) {
        const index = this.mitreTechniques.indexOf(technique);

        if (index >= 0) {
            this.mitreTechniques.splice(index, 1);
        }
        this.mitreTechniquesChange.emit(this.mitreTechniques);
    }

    paste(event: ClipboardEvent): void {
        event.preventDefault();
        event.clipboardData
            .getData('Text')
            .split(/;|,|\n/)
            .map((value: string) => value.trim())
            .forEach((value) => {
                if (value && this.hasValidFormat(value)) {
                    this.pushTechnique(value.trim());
                }
            });
    }

    selected(event: MatAutocompleteSelectedEvent): void {
        this.pushTechnique(event.option.value.techniqueKey);
        this.techniqueInput.nativeElement.value = '';
        this.chipListCtrl.setValue(null);
    }

    onInput(event: any): void {
        this.chipListCtrl.setErrors({wrongFormat: false});
        this.chipListCtrl.markAsUntouched();
        this.filterText.set(event.target.value);
    }

    private pushTechnique(technique: string): void {
        const mitreTechnique = new MitreTechnique();
        mitreTechnique.techniqueKey = technique;
        this.mitreTechniques.push(mitreTechnique);
        this.mitreTechniquesChange.emit(this.mitreTechniques);
    }

    private hasValidFormat(technique: string): boolean {
        const pattern = new RegExp('(^TA[0-9]{4}.T[0-9]{4}|^$)');
        const res = pattern.test(technique);
        return res;
    }
}
