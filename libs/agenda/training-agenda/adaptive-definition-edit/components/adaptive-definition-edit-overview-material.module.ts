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
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatStepperModule } from '@angular/material/stepper';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Material components for training definition edit overview module
 */
@NgModule({
    imports: [
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        MatDividerModule,
        MatListModule,
        MatStepperModule,
        MatMenuModule,
        MatTooltipModule,
        MatCheckboxModule,
        MatSidenavModule,
        MatRadioModule,
        MatCardModule,
        MatProgressSpinnerModule,
        MatExpansionModule,
    ],
    exports: [
        MatFormFieldModule,
        MatInputModule,
        MatSelectModule,
        MatButtonModule,
        MatIconModule,
        MatDialogModule,
        MatDividerModule,
        MatListModule,
        MatStepperModule,
        MatMenuModule,
        MatTooltipModule,
        MatCheckboxModule,
        MatSidenavModule,
        MatRadioModule,
        MatCardModule,
        MatProgressSpinnerModule,
        MatExpansionModule,
    ],
})
export class AdaptiveDefinitionEditOverviewMaterialModule {}
