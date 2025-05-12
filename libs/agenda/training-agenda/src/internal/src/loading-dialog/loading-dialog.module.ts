import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TitleCaseExceptPipe } from './pipes/title-case-except.pipe';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialogModule } from '@angular/material/dialog';
import { LoadingDialogComponent } from './loading-dialog.component';

@NgModule({
    declarations: [LoadingDialogComponent, TitleCaseExceptPipe],
    exports: [LoadingDialogComponent, TitleCaseExceptPipe],
    imports: [CommonModule, MatProgressSpinnerModule, MatDialogModule],
})
export class LoadingDialogModule {}
