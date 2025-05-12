import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { ClipboardModule } from '@angular/cdk/clipboard';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatIconModule } from '@angular/material/icon';

/**
 * Material components for training instance overview module
 */
@NgModule({
    imports: [MatIconModule, MatButtonModule, ClipboardModule, MatTooltipModule, MatProgressSpinnerModule],
    exports: [MatIconModule, MatButtonModule, ClipboardModule, MatTooltipModule, MatProgressSpinnerModule],
})
export class TrainingInstanceOverviewMaterialModule {}
