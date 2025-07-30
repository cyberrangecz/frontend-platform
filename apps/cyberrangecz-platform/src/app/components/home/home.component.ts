import { Component, DestroyRef, inject, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { SentinelAuthService, UserRole } from '@sentinel/auth';
import { AgendaPortalLink } from '../../model/agenda-portal-link';
import { PortalAgendaContainer } from '../../model/portal-agenda-container';
import { RoleResolver } from '../../utils/role-resolver';
import { AgendaMenuItem } from '../../model/agenda-menu-item';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { PortalAgendaContainerComponent } from './portal-agenda-container/portal-agenda-container.component';
import { ValidPath } from '@crczp/routing-commons';

/**
 * Main component of homepage (portal) page. Portal page is a main crossroad of possible sub pages. Only those matching with user
 * role are accessible.
 */
@Component({
    selector: 'crczp-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.css'],
    imports: [PortalAgendaContainerComponent],
})
export class HomeComponent implements OnInit {
    elevated: string;
    roles: UserRole[];
    portalAgendaContainers: PortalAgendaContainer[] = [];

    destroyRef = inject(DestroyRef);

    private authService = inject(SentinelAuthService);
    private router = inject(Router);

    static createExpandedControlButtons(path: ValidPath[]): AgendaMenuItem[] {
        return [
            new AgendaMenuItem('timeline', 'Adaptive', path[0]),
            new AgendaMenuItem('videogame_asset', 'Linear', path[1]),
        ];
    }

    ngOnInit(): void {
        this.roles = this.authService.getRoles();
        this.initRoutes();
        this.subscribeUserChange();
    }

    /**
     * Navigates to specified route
     * @param route route to which should router navigate
     */
    navigateToRoute(route: ValidPath): void {
        this.router.navigate([route]);
    }

    setElevation(buttonName: string): void {
        this.elevated = buttonName;
    }

    private initRoutes() {
        this.portalAgendaContainers = [
            {
                agendas: this.createParticipateButtons(),
                label: 'Participate',
                displayed: RoleResolver.isTrainingTrainee(this.roles),
                children: [],
            },
            {
                agendas: this.createDesignButtons(),
                label: 'Design',
                displayed:
                    RoleResolver.isTrainingDesigner(this.roles) ||
                    RoleResolver.isSandboxDesigner(this.roles),
                children: [],
            },
            {
                agendas: this.createOrganizeButtons(),
                label: 'Organize',
                displayed:
                    RoleResolver.isTrainingOrganizer(this.roles) ||
                    RoleResolver.isSandboxOrganizer(this.roles),
                children: [],
            },
            {
                agendas: this.createManageButtons(),
                label: 'Manage',
                displayed: RoleResolver.isUserAndGroupAdmin(this.roles),
                children: [],
            },
        ];
    }

    private createParticipateButtons() {
        return [
            new AgendaPortalLink(
                'Training Run',
                !RoleResolver.isTrainingTrainee(this.roles),
                'run',
                'Training Run allows you to start a new training, return to unfinished one,' +
                    ' or to access results of those you already finished.',
                'games'
            ),
        ];
    }

    private createDesignButtons(): AgendaPortalLink[] {
        return [
            new AgendaPortalLink(
                'Sandbox Definition',
                !RoleResolver.isSandboxDesigner(this.roles),
                'sandbox-definition',
                'In the sandbox definition agenda, you can manage sandbox configurations, i.e., descriptions' +
                    ' of virtual networks and computers that can be instantiated in isolated sandboxes.',
                'event_note'
            ),
            new AgendaPortalLink(
                'Training Definition',
                !RoleResolver.isTrainingDesigner(this.roles),
                'linear-definition',
                'The training definition is a plot of the single-player trainings. You can manage your own and design new ones.',
                'assignment',
                HomeComponent.createExpandedControlButtons([
                    'adaptive-definition',
                    'linear-definition',
                ])
            ),
        ];
    }

    private createOrganizeButtons() {
        return [
            new AgendaPortalLink(
                'Pool',
                !RoleResolver.isSandboxOrganizer(this.roles),
                'pool',
                'As an instructor, you can create pools of sandboxes. ' +
                    'These are the elementary organisational units for instantiation of sandbox definitions.',
                'subscriptions'
            ),
            new AgendaPortalLink(
                'Images',
                !RoleResolver.isSandboxOrganizer(this.roles),
                'sandbox-image',
                'In the images agenda, you can view available cloud images.',
                'donut_large'
            ),
            new AgendaPortalLink(
                'Training Instance',
                !RoleResolver.isTrainingOrganizer(this.roles),
                'linear-instance',
                'You can also create training instances that are necessary if you want to organize a hands-on training session.',
                'event',
                HomeComponent.createExpandedControlButtons([
                    'adaptive-instance',
                    'linear-instance',
                ])
            ),
        ];
    }

    private createManageButtons() {
        const disabled = !RoleResolver.isUserAndGroupAdmin(this.roles);
        return [
            new AgendaPortalLink(
                'Groups',
                disabled,
                'group',
                'In groups, you can manage groups and grant access rights to the group members.',
                'group'
            ),
            new AgendaPortalLink(
                'Users',
                disabled,
                'user',
                'The users agenda serves for assigning users to existing groups.',
                'person'
            ),
            new AgendaPortalLink(
                'Microservices',
                disabled,
                'microservice',
                'You can also manage microservices that provide the CyberRangeᶜᶻ Platform`s functionality. ' +
                    'Please make sure, you know what you are doing before making any changes to the microservices.',
                'account_tree'
            ),
        ];
    }

    private subscribeUserChange() {
        this.authService.activeUser$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                this.initRoutes();
            });
    }
}
