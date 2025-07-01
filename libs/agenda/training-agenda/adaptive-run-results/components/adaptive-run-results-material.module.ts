import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

/**
 * Material components import for adaptive run results module
 */
@NgModule({
    imports: [MatButtonModule, MatProgressSpinnerModule, MatCardModule],
    exports: [MatButtonModule, MatProgressSpinnerModule, MatCardModule],
})
export class AdaptiveRunResultsMaterialModule {}
