import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatRippleModule } from '@angular/material/core';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDividerModule } from '@angular/material/divider';
import { MatSliderModule } from '@angular/material/slider';
import { MatInputModule } from '@angular/material/input';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';

/**
 * Material components imports for sandbox pool detail module
 */
@NgModule({
    imports: [
        MatButtonModule,
        MatDialogModule,
        MatCardModule,
        MatIconModule,
        MatRippleModule,
        MatTooltipModule,
        MatDividerModule,
        MatSliderModule,
        MatInputModule,
        FormsModule,
        ReactiveFormsModule,
    ],
    exports: [
        MatButtonModule,
        MatDialogModule,
        MatCardModule,
        MatIconModule,
        MatRippleModule,
        MatTooltipModule,
        MatDividerModule,
        MatSliderModule,
        MatInputModule,
        FormsModule,
        ReactiveFormsModule,
    ],
})
export class PoolDetailMaterialModule {}
