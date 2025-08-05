import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { StageAdapter } from '../../model/adapters/stage-adapter';
import { MatCard, MatCardContent, MatCardHeader, MatCardTitle } from '@angular/material/card';
import {
    MatExpansionPanel,
    MatExpansionPanelContent,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle
} from '@angular/material/expansion';
import { RequestStageHeaderComponent } from './header/request-stage-header.component';
import { RequestStageDetailComponent } from './detail/request-stage-detail.component';

/**
 * Component of request stage basic info
 */
@Component({
    selector: 'crczp-request-stage',
    templateUrl: './request-stage.component.html',
    styleUrls: ['./request-stage.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatCard,
        MatCardHeader,
        MatCardContent,
        MatExpansionPanel,
        RequestStageHeaderComponent,
        MatExpansionPanelHeader,
        RequestStageDetailComponent,
        MatCardTitle,
        MatExpansionPanelTitle,
        MatExpansionPanelContent
    ]
})
export class RequestStageComponent {
    @Input() stage: StageAdapter;
    @Output() stageDetailPanelChange: EventEmitter<boolean> = new EventEmitter<boolean>();

    onPanelStateChange(opened: boolean): void {
        this.stageDetailPanelChange.emit(opened);
    }
}
