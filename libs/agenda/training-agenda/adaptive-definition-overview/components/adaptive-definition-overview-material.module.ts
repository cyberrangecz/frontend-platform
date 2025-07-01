import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Material components imports for training definition overview
 */
@NgModule({
    imports: [
        MatDividerModule,
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatDialogModule,
        MatProgressBarModule,
        MatTooltipModule,
    ],
    exports: [
        MatDividerModule,
        MatButtonModule,
        MatInputModule,
        MatIconModule,
        MatDialogModule,
        MatProgressBarModule,
        MatTooltipModule,
    ],
})
export class AdaptiveDefinitionOverviewMaterialModule {}
