import { Component, EventEmitter, Input, Output } from '@angular/core';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent } from '@angular/material/chips';

@Component({
    selector: 'crczp-expected-commands-select',
    templateUrl: './expected-commands-select.component.html',
    styleUrls: ['./expected-commands-select.component.css'],
})
export class ExpectedCommandsSelectComponent {
    @Input() expectedCommands: string[];
    @Output() expectedCommandsChange: EventEmitter<string[]> = new EventEmitter();

    readonly separatorKeysCodes = [ENTER, COMMA] as const;

    add(event: MatChipInputEvent) {
        const value = (event.value || '').trim();
        if (value) {
            this.expectedCommands.push(value);
        }
        event.chipInput?.clear();
        this.expectedCommandsChange.emit(this.expectedCommands);
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
        event.clipboardData
            .getData('Text')
            .split(/;|,|\n/)
            .forEach((value) => {
                if (value.trim()) {
                    this.expectedCommands.push(value.trim());
                }
            });
    }
}
