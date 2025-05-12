import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { MatGridListModule } from '@angular/material/grid-list';

/**
 * Material components imports for sandbox pool detail module
 */
@NgModule({
    imports: [
        MatButtonModule,
        MatDialogModule,
        MatIconModule,
        MatTooltipModule,
        MatInputModule,
        MatGridListModule,
        FormsModule,
        ReactiveFormsModule,
    ],
    exports: [
        MatButtonModule,
        MatDialogModule,
        MatIconModule,
        MatTooltipModule,
        MatInputModule,
        MatGridListModule,
        FormsModule,
        ReactiveFormsModule,
    ],
})
export class PoolOverviewMaterialModule {}
