import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTabsModule } from '@angular/material/tabs';
import { MatIconModule } from '@angular/material/icon';

/**
 * Material components import for training run results module
 */
@NgModule({
    imports: [MatButtonModule, MatProgressSpinnerModule, MatTabsModule, MatIconModule],
    exports: [MatButtonModule, MatProgressSpinnerModule, MatTabsModule, MatIconModule],
})
export class TrainingRunResultsMaterialModule {}
