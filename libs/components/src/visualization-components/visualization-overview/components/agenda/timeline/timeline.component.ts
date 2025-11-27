import {
    Component,
    EventEmitter,
    Input,
    OnInit,
    Output,
    ViewChild,
} from '@angular/core';
import { LineComponent } from './line/line.component';
import { TraineeModeInfo } from '../../../shared/interfaces/trainee-mode-info';

@Component({
    selector: 'crczp-visualization-overview-timeline',
    templateUrl: './timeline.component.html',
    styleUrls: ['./timeline.component.css'],
    // eslint-disable-next-line
    standalone: false,
})
export class TimelineComponent implements OnInit {
    /**
     * Defines if all players should be displayed
     */
    @Input() enableAllPlayers = true;
    /**
     * Main svg dimensions.
     */
    @Input() size: { width: number; height: number };
    /**
     * Id of training definition
     */
    @Input() trainingDefinitionId: number;
    /**
     * Id of training instance
     */
    @Input() trainingInstanceId: number;
    public fullWidthTable = false;
    /**
     * Use if visualization should use anonymized data (without names and credentials of other users) from trainee point of view
     */
    @Input() traineeModeInfo: TraineeModeInfo;
    /**
     * Id of trainee which should be highlighted
     */
    @Input() highlightedTrainee: number;
    @Input() standalone: boolean;
    /**
     * Emits Id of trainee which should be highlighted
     */
    @Output() selectedTrainee: EventEmitter<number> = new EventEmitter();
    @ViewChild(LineComponent, { static: true }) lineComponent: LineComponent;

    ngOnInit(): void {
        if (this.traineeModeInfo) {
            this.highlightedTrainee = this.traineeModeInfo.trainingRunId;
        }
    }
    setTableWidth(fullWidth: boolean): void {
        this.fullWidthTable = fullWidth;
    }

    selectPlayer(id: number): void {
        if (this.highlightedTrainee !== id) {
            this.selectedTrainee.emit(id);
        }
    }
}
