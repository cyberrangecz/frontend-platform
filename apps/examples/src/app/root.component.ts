import { Component } from '@angular/core';
import { ProgressVisualizationComponent } from '../progress/components/progress-visualization.component';

@Component({
    imports: [ProgressVisualizationComponent],
    templateUrl: './root.component.html',
    styleUrl: './root.component.scss',
})
export class RootComponent {}
