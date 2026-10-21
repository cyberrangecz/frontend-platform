import {Component, EventEmitter, Input, Output, ChangeDetectionStrategy} from '@angular/core';
import {COMMA, ENTER} from '@angular/cdk/keycodes';
import {MatChipGrid, MatChipInput, MatChipInputEvent, MatChipRemove, MatChipRow} from '@angular/material/chips';
import {
    MatExpansionPanel,
    MatExpansionPanelDescription,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle
} from "@angular/material/expansion";
import {MatFormField, MatLabel} from "@angular/material/input";
import {MatIcon} from "@angular/material/icon";

@Component({
    selector: 'crczp-expected-commands-select',
    templateUrl: './expected-commands-select.component.html',
    styleUrls: ['./expected-commands-select.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatExpansionPanel,
        MatExpansionPanelHeader,
        MatExpansionPanelTitle,
        MatExpansionPanelDescription,
        MatLabel,
        MatFormField,
        MatChipGrid,
        MatChipRow,
        MatChipRemove,
        MatIcon,
        MatChipInput
    ]
})
export class ExpectedCommandsSelectComponent {
    @Input() expectedCommands: string[];
    @Output() expectedCommandsChange: EventEmitter<string[]> = new EventEmitter();

    readonly separatorKeysCodes = [ENTER, COMMA] as const;

    add(event: MatChipInputEvent) {
        if (this.addIfNew(event.value)) {
            this.expectedCommandsChange.emit(this.expectedCommands);
        }
        event.chipInput?.clear();
    }

    remove(expectedCommand: string) {
        const index = this.expectedCommands.indexOf(expectedCommand);

        if (index >= 0) {
            this.expectedCommands.splice(index, 1);
        }
        this.expectedCommandsChange.emit(this.expectedCommands);
    }

    paste(event: ClipboardEvent): void {
        event.preventDefault();
        const addedCommands = event.clipboardData
            .getData('Text')
            .split(/;|,|\n/)
            .map((value) => this.addIfNew(value));
        if (addedCommands.includes(true)) {
            this.expectedCommandsChange.emit(this.expectedCommands);
        }
    }

    private addIfNew(command: string | undefined): boolean {
        const trimmedCommand = (command || '').trim();
        if (!trimmedCommand || this.expectedCommands.includes(trimmedCommand)) {
            return false;
        }
        this.expectedCommands.push(trimmedCommand);
        return true;
    }
}
