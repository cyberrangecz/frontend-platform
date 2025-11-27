import {ChangeDetectionStrategy, Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import {SankeyData} from '../../model/sankey/sankey-data';
import {
    MatExpansionPanel,
    MatExpansionPanelContent,
    MatExpansionPanelDescription,
    MatExpansionPanelHeader,
    MatExpansionPanelTitle
} from "@angular/material/expansion";
import {MatDivider} from "@angular/material/divider";
import {SankeyVisualizationComponent} from "../sankey-visualization/sankey-visualization.component";
import {MatIcon} from "@angular/material/icon";

@Component({
    selector: 'crczp-adaptive-instance-simulator-instance-simulator',
    templateUrl: './instance-simulator.component.html',
    styleUrls: ['./instance-simulator.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatExpansionPanelDescription,
        MatExpansionPanel,
        MatExpansionPanelTitle,
        MatExpansionPanelHeader,
        MatDivider,
        SankeyVisualizationComponent,
        MatIcon,
        MatExpansionPanelContent
    ]
})
export class InstanceSimulatorComponent implements OnChanges {
    @Input() simulatorData: SankeyData;

    ngOnChanges(changes: SimpleChanges): void {
        if ('simulatorData' in changes && !changes['simulatorData'].isFirstChange()) {
            this.simulatorData = {...this.simulatorData};
        }
    }
}
