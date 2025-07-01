import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {InfoLevel} from '@crczp/training-model';
import {SentinelMarkdownViewComponent} from "@sentinel/components/markdown-view";
import {MatButton} from "@angular/material/button";

@Component({
    selector: 'crczp-info-level',
    templateUrl: './info-level.component.html',
    styleUrls: ['./info-level.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        SentinelMarkdownViewComponent,
        MatButton
    ]
})
/**
 * Component to display training run's level of type INFO. Only displays markdown and allows user to continue immediately.
 */
export class InfoLevelComponent {
    @Input() level: InfoLevel;
    @Input() isLast: boolean;
    @Input() isBacktracked: boolean;
    @Output() next: EventEmitter<void> = new EventEmitter();

    onNext(): void {
        this.next.emit();
    }
}
