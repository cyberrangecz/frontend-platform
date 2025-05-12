import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatPaginatorModule } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSortModule } from '@angular/material/sort';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTableModule } from '@angular/material/table';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatTreeModule } from '@angular/material/tree';

@NgModule({
    declarations: [],
    imports: [
        CommonModule,
        MatTableModule,
        MatDialogModule,
        MatPaginatorModule,
        MatSortModule,
        MatProgressSpinnerModule,
        MatToolbarModule,
        MatSidenavModule,
        MatTreeModule,
        MatProgressBarModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatStepperModule,
        MatCheckboxModule,
        MatMenuModule,
        MatDividerModule,
        MatRadioModule,
        MatButtonModule,
        MatCardModule,
        MatTooltipModule,
        MatExpansionModule,
    ],
    exports: [
        CommonModule,
        MatTableModule,
        MatDialogModule,
        MatPaginatorModule,
        MatSortModule,
        MatProgressSpinnerModule,
        MatToolbarModule,
        MatSidenavModule,
        MatTreeModule,
        MatProgressBarModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatStepperModule,
        MatCheckboxModule,
        MatMenuModule,
        MatDividerModule,
        MatRadioModule,
        MatButtonModule,
        MatCardModule,
        MatTooltipModule,
        MatExpansionModule,
    ],
})
/**
 * Helper mock module for automatic import of all material components
 */
export class MaterialTestingModule {}
