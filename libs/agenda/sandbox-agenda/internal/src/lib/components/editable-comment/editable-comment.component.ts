import { Component, ElementRef, EventEmitter, HostListener, Input, OnChanges, OnInit, Output, inject } from '@angular/core';
import {CommentFormGroup} from './comment-form-group';
import {MatFormFieldModule} from '@angular/material/form-field';
import {ReactiveFormsModule} from '@angular/forms';
import {MatTooltipModule} from '@angular/material/tooltip';
import {MatInputModule} from '@angular/material/input';
import {MatFabButton} from '@angular/material/button';
import {MatIconModule} from '@angular/material/icon';

@Component({
    selector: 'crczp-editable-comment',
    standalone: true,
    imports: [MatFormFieldModule, ReactiveFormsModule, MatTooltipModule, MatInputModule, MatIconModule, MatFabButton],
    templateUrl: './editable-comment.component.html',
    styleUrls: ['./editable-comment.component.css'],
})
export class EditableCommentComponent implements OnInit, OnChanges {
    private elementRef = inject(ElementRef);

    @Input() value: string;
    @Input() resetOnFocusOut = true;
    @Output() commentChanged: EventEmitter<string> = new EventEmitter<string>();
    commentFormGroup: CommentFormGroup;
    editOpacity = 0;
    editionEnabled = false;

    @HostListener('focusout', ['$event'])
    onFocusOut(event: FocusEvent) {
        if (!this.resetOnFocusOut) {
            return;
        }
        const relatedTarget = event.relatedTarget as HTMLElement;
        if (relatedTarget && this.elementRef.nativeElement.contains(relatedTarget)) {
            return;
        }
        this.commentFormGroup.formGroup.get('comment').setValue(this.value);
        this.editionEnabled = false;
    }

    ngOnInit() {
        if (!this.commentFormGroup) {
            this.initFormGroup();
        }
    }

    private initFormGroup() {
        this.commentFormGroup = new CommentFormGroup(this.value);
    }

    toggleEditButton(show: boolean) {
        this.editOpacity = show ? 100 : 0;
    }

    toggleEdition(value: boolean = !this.editionEnabled) {
        this.editionEnabled = value;
    }

    saveComment() {
        this.commentChanged.emit(this.commentFormGroup.formGroup.get('comment').value);
        this.toggleEdition(false);
    }

    ngOnChanges() {
        if (!this.commentFormGroup) {
            this.initFormGroup();
        } else {
            this.commentFormGroup.formGroup.get('comment').setValue(this.value);
        }
    }
}
