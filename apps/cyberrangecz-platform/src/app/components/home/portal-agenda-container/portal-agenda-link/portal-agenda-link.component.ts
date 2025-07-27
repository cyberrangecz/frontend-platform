import {
    ChangeDetectionStrategy,
    Component,
    EventEmitter,
    Input,
    Output,
} from '@angular/core';
import { AgendaPortalLink } from '../../../../model/agenda-portal-link';
import { NgClass } from '@angular/common';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatMenu, MatMenuItem, MatMenuTrigger } from '@angular/material/menu';
import { ValidPath } from '@crczp/routing-commons';

@Component({
    selector: 'crczp-portal-agenda-link',
    templateUrl: './portal-agenda-link.component.html',
    styleUrls: ['./portal-agenda-link.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MatIcon,
        NgClass,
        MatButton,
        MatMenuItem,
        MatMenu,
        MatMenuTrigger,
    ],
})
export class PortalAgendaLinkComponent {
    @Input() portalAgendaLink: AgendaPortalLink;
    @Input() elevation: string;

    @Output() navigate: EventEmitter<ValidPath> = new EventEmitter();
    @Output() elevate: EventEmitter<string> = new EventEmitter();

    setElevation(elevation: string): void {
        this.elevate.emit(elevation);
    }

    setRoute(route: ValidPath): void {
        this.navigate.emit(route);
    }
}
