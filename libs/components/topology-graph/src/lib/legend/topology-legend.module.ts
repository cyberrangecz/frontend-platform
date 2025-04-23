import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TopologyLegendComponent } from './topology-legend.component';
import { MatCardModule } from '@angular/material/card';

@NgModule({
    imports: [CommonModule, MatCardModule],
    declarations: [TopologyLegendComponent],
    providers: [],
    exports: [TopologyLegendComponent],
})
export class TopologyLegendModule {}
