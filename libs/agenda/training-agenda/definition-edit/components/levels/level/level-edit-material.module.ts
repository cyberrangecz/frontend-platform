import { NgModule } from '@angular/core';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatChipsModule } from '@angular/material/chips';
import { MatDividerModule } from '@angular/material/divider';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatRadioModule } from '@angular/material/radio';
import { MatTooltipModule } from '@angular/material/tooltip';

/**
 * Material components imports for level detail edit
 */
@NgModule({
    imports: [
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatExpansionModule,
        MatTooltipModule,
        MatCheckboxModule,
        MatMenuModule,
        MatDividerModule,
        MatCardModule,
        MatRadioModule,
        MatChipsModule,
        MatAutocompleteModule,
    ],
    exports: [
        MatButtonModule,
        MatFormFieldModule,
        MatInputModule,
        MatIconModule,
        MatExpansionModule,
        MatTooltipModule,
        MatCheckboxModule,
        MatMenuModule,
        MatDividerModule,
        MatCardModule,
        MatRadioModule,
        MatChipsModule,
        MatAutocompleteModule,
    ],
})
export class LevelEditMaterialModule {}
