import {Component, ElementRef, EventEmitter, Input, OnChanges, Output, ViewChild} from '@angular/core';
import {MitreTechnique} from '@crczp/training-model';
import {COMMA, ENTER, SEMICOLON} from '@angular/cdk/keycodes';
import {MatChipGrid, MatChipInput, MatChipInputEvent, MatChipRow} from '@angular/material/chips';
import {ReactiveFormsModule, UntypedFormControl} from '@angular/forms';
import {
    MatAutocomplete,
    MatAutocompleteSelectedEvent,
    MatAutocompleteTrigger,
    MatOption
} from '@angular/material/autocomplete';
import {
    MatExpansionPanel,
    MatExpansionPanelDescription,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle
} from "@angular/material/expansion";

import {MatError, MatFormField, MatHint, MatInput, MatLabel} from "@angular/material/input";
import {MatIcon} from "@angular/material/icon";

@Component({
    selector: 'crczp-mitre-technique-select',
    templateUrl: './mitre-technique-select.component.html',
    styleUrls: ['./mitre-technique-select.component.css'],
    imports: [
    MatExpansionPanel,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle,
    MatExpansionPanelDescription,
    MatFormField,
    MatLabel,
    MatChipGrid,
    MatAutocomplete,
    MatHint,
    MatOption,
    MatError,
    MatChipInput,
    MatAutocompleteTrigger,
    MatInput,
    MatIcon,
    MatChipRow,
    ReactiveFormsModule
]
})
export class MitreTechniqueSelectComponent implements OnChanges {
    @Input() mitreTechniques: MitreTechnique[];
    @Input() mitreTechniquesList: MitreTechnique[];

    @Output() mitreTechniquesChange: EventEmitter<MitreTechnique[]> = new EventEmitter();

    @ViewChild('techniqueInput') techniqueInput: ElementRef<HTMLInputElement>;

    chipListCtrl = new UntypedFormControl();
    filteredTechniquesList: MitreTechnique[];

    readonly separatorKeysCodes = [ENTER, COMMA, SEMICOLON] as const;

    ngOnChanges(): void {
        this.filteredTechniquesList = this.mitreTechniquesList;
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
        this.filteredTechniquesList = this.filter(event.target.value);
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

    private filter(value: string): MitreTechnique[] {
        const filterValue = value.toLowerCase();
        return this.mitreTechniquesList.filter((technique) => {
            const techniqueString = `${technique.techniqueKey} - ${technique.techniqueName}`;
            return techniqueString.toLowerCase().includes(filterValue);
        });
    }
}
