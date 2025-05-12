import { NgModule } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

/**
 * Material components import for create sandbox definition module
 */
@NgModule({
    imports: [MatFormFieldModule, MatInputModule, MatButtonModule, MatDividerModule, MatIconModule, MatCardModule],
    exports: [MatFormFieldModule, MatInputModule, MatButtonModule, MatDividerModule, MatIconModule, MatCardModule],
})
export class CreateSandboxDefinitionMaterial {}
