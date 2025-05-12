import { Component, DestroyRef, inject, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { User } from '@crczp/user-and-group-model';
import { USER_DATA_ATTRIBUTE_NAME } from '../../../public';
import {
    MatAccordion,
    MatExpansionPanel,
    MatExpansionPanelDescription,
    MatExpansionPanelTitle
} from '@angular/material/expansion';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { MatCard } from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { MatLine } from '@angular/material/core';
import { MatButton } from '@angular/material/button';
import { MatDivider } from '@angular/material/divider';

@Component({
    selector: 'crczp-user-detail',
    templateUrl: './user-detail.component.html',
    imports: [
        MatAccordion,
        MatButton,
        MatCard,
        MatDivider,
        MatExpansionPanel,
        MatExpansionPanelDescription,
        MatExpansionPanelTitle,
        MatIcon,
        MatLine,
        MatTooltip,
    ],
    styleUrls: ['./user-detail.component.css']
})
export class UserDetailComponent implements OnInit {
    constructor(private activeRoute: ActivatedRoute) {
    }

    @ViewChild(MatAccordion) accordion: MatAccordion;
    user: User;
    destroyRef = inject(DestroyRef);

    ngOnInit(): void {
        this.initTable();
    }

    private initTable() {
        this.activeRoute.data.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((data) => {
            this.user = data[USER_DATA_ATTRIBUTE_NAME];
        });
    }
}
