import {
    Component,
    ElementRef,
    EventEmitter,
    HostListener,
    inject,
    Input,
    OnChanges,
    OnInit,
    Output,
} from '@angular/core';
import { CommentFormGroup, MAXIMUM_COMMENT_LENGTH } from './comment-form-group';
import { MatFormFieldModule } from '@angular/material/form-field';
import { AbstractControl, ReactiveFormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatInputModule } from '@angular/material/input';
import { MatFabButton } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
    selector: 'crczp-editable-comment',
    standalone: true,
    imports: [
        MatFormFieldModule,
        ReactiveFormsModule,
        MatTooltipModule,
        MatInputModule,
        MatIconModule,
        MatFabButton,
    ],
    templateUrl: './editable-comment.component.html',
    styleUrls: ['./editable-comment.component.css'],
})
export class EditableCommentComponent implements OnInit, OnChanges {
    @Input() value: string;
    @Input() resetOnFocusOut = true;
    @Output() commentChanged: EventEmitter<string> = new EventEmitter<string>();
    commentFormGroup: CommentFormGroup;
    editOpacity = 0;
    editionEnabled = false;
    readonly maximumCommentLength = MAXIMUM_COMMENT_LENGTH;
    private elementRef = inject(ElementRef);

    get commentControl(): AbstractControl {
        return this.commentFormGroup.formGroup.get('comment')!;
    }

    @HostListener('focusout', ['$event'])
    onFocusOut(event: FocusEvent) {
        if (!this.resetOnFocusOut) {
            return;
        }
        const relatedTarget = event.relatedTarget as HTMLElement;
        if (
            relatedTarget &&
            this.elementRef.nativeElement.contains(relatedTarget)
        ) {
            return;
        }
        this.commentControl.setValue(this.value);
        this.editionEnabled = false;
    }

    ngOnInit() {
        if (!this.commentFormGroup) {
            this.initFormGroup();
        }
    }

    toggleEditButton(show: boolean) {
        this.editOpacity = show ? 100 : 0;
    }

    toggleEdition(value = !this.editionEnabled) {
        this.editionEnabled = value;
    }

    /**
     * Publishes the edited comment and closes edit mode, unless the value breaks a validator.
     */
    saveComment() {
        if (this.commentFormGroup.formGroup.invalid) {
            return;
        }
        this.commentChanged.emit(this.commentControl.value);
        this.toggleEdition(false);
    }

    ngOnChanges() {
        if (!this.commentFormGroup) {
            this.initFormGroup();
        } else {
            this.commentControl.setValue(this.value);
        }
    }

    private initFormGroup() {
        this.commentFormGroup = new CommentFormGroup(this.value);
    }
}
