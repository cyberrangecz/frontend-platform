import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatNativeDateModule } from '@angular/material/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialogModule } from '@angular/material/dialog';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatSliderModule } from '@angular/material/slider';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Module for Angular Material in the graph components
 */
@NgModule({
    imports: [
        MatMenuModule,
        MatIconModule,
        MatButtonModule,
        MatTabsModule,
        MatButtonToggleModule,
        MatSidenavModule,
        MatDividerModule,
        MatCheckboxModule,
        MatCardModule,
        MatSlideToggleModule,
        MatExpansionModule,
        MatSliderModule,
        MatRadioModule,
        MatDialogModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatSnackBarModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
    ],
    exports: [
        MatMenuModule,
        MatSliderModule,
        MatIconModule,
        MatButtonModule,
        MatTabsModule,
        MatButtonToggleModule,
        MatSidenavModule,
        MatDividerModule,
        MatCheckboxModule,
        MatCardModule,
        MatSlideToggleModule,
        MatExpansionModule,
        MatRadioModule,
        MatDialogModule,
        MatDatepickerModule,
        MatNativeDateModule,
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatSnackBarModule,
        MatProgressSpinnerModule,
        MatTooltipModule,
    ],
})
export class GraphMaterialModule {}
