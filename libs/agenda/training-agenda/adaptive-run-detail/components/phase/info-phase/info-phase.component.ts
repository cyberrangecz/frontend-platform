import {ChangeDetectionStrategy, Component, EventEmitter, Input, Output} from '@angular/core';
import {InfoPhase} from '@crczp/training-model';
import {SentinelMarkdownViewComponent} from "@sentinel/components/markdown-view";
import {MatButton} from "@angular/material/button";

@Component({
    selector: 'crczp-info-phase',
    templateUrl: './info-phase.component.html',
    styleUrls: ['./info-phase.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        SentinelMarkdownViewComponent,
        MatButton
    ]
})
export class InfoPhaseComponent {
    @Input() phase: InfoPhase;
    @Input() isLast: boolean;
    @Input() isBacktracked: boolean;
    @Output() next: EventEmitter<void> = new EventEmitter();

    onNext(): void {
        this.next.emit();
    }
}
