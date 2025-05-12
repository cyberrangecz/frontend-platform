import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, Input, Output, ViewChild } from '@angular/core';
import { InfoLevel } from '@crczp/training-model';

@Component({
    selector: 'crczp-info-level',
    templateUrl: './info-level.component.html',
    styleUrls: ['./info-level.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
/**
 * Component to display training run's level of type INFO. Only displays markdown and allows user to continue immediately.
 */
export class InfoLevelComponent {
    @Input() level: InfoLevel;
    @Input() isLast: boolean;
    @Input() isBacktracked: boolean;
    @Output() next: EventEmitter<void> = new EventEmitter();
    @ViewChild('controls', { read: ElementRef, static: true }) controlsPanel: ElementRef;

    onNext(): void {
        this.next.emit();
    }

    // Workaround since position:sticky is not working due to overflow in mat-content
    getControlsPanelOffset(): string {
        return this.controlsPanel?.nativeElement.offsetHeight + 'px';
    }
}
