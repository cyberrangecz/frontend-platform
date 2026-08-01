import {
    Component,
    computed,
    DestroyRef,
    inject,
    OnInit,
    signal,
} from '@angular/core';
import { Router } from '@angular/router';
import { SentinelAuthService, UserRole } from '@sentinel/auth';
import { AgendaPortalLink } from '../../model/agenda-portal-link';
import { PortalAgendaContainer } from '../../model/portal-agenda-container';
import { RoleResolver } from '../../utils/role-resolver';
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
    portalAgendaContainers = signal<PortalAgendaContainer[]>([]);

    /**
     * Whether the user's roles grant access to no agenda at all.
     */
    hasNoAgendas = computed(() => this.portalAgendaContainers().length === 0);

    destroyRef = inject(DestroyRef);

    private authService = inject(SentinelAuthService);
    private router = inject(Router);

    /**
     * Keeps only the links whose access condition holds, preserving the given order.
     *
     * @param entries Pairs of an access condition and the link it guards.
     * @returns The guarded links whose condition is met.
     */
    private static grantedLinks(
        ...entries: [granted: boolean, link: AgendaPortalLink][]
    ): AgendaPortalLink[] {
        return entries.filter(([granted]) => granted).map(([, link]) => link);
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

    private initRoutes(): void {
        const containers: PortalAgendaContainer[] = [
            {
                agendas: this.createParticipateButtons(),
                label: 'Participate',
                children: [],
                icon: 'play_circle',
            },
            {
                agendas: this.createDesignButtons(),
                label: 'Design',
                children: [],
                icon: 'design_services',
            },
            {
                agendas: this.createOrganizeButtons(),
                label: 'Organize',
                children: [],
                icon: 'event',
            },
            {
                agendas: this.createManageButtons(),
                label: 'Manage',
                children: [],
                icon: 'manage_accounts',
            },
        ];
        this.portalAgendaContainers.set(
            containers.filter((container) => container.agendas.length > 0),
        );
    }

    private createParticipateButtons(): AgendaPortalLink[] {
        return HomeComponent.grantedLinks([
            RoleResolver.isTrainingTrainee(this.roles),
            new AgendaPortalLink(
                'Training Run',
                'run',
                'Training Run lets you start or resume a training session or view the results of a completed training.',
                'games',
            ),
        ]);
    }

    private createDesignButtons(): AgendaPortalLink[] {
        return HomeComponent.grantedLinks(
            [
                RoleResolver.isSandboxDesigner(this.roles),
                new AgendaPortalLink(
                    'Sandbox Definition',
                    'sandbox-definition',
                    'In the Sandbox Definition agenda, you can manage sandbox definitions—descriptions of virtual networks and computers that can be instantiated in isolated sandboxes.',
                    'event_note',
                ),
            ],
            [
                RoleResolver.isTrainingDesigner(this.roles),
                new AgendaPortalLink(
                    'Training Definition',
                    'linear-definition',
                    'Training Definition is the blueprint for trainings. You can manage existing trainings and design new ones.',
                    'assignment',
                ),
            ],
        );
    }

    private createOrganizeButtons(): AgendaPortalLink[] {
        return HomeComponent.grantedLinks(
            [
                RoleResolver.isSandboxOrganizer(this.roles),
                new AgendaPortalLink(
                    'Pool',
                    'pool',
                    'As an instructor, you can create pools of sandboxes—the basic organizational units for instantiating sandbox definitions.',
                    'subscriptions',
                ),
            ],
            [
                RoleResolver.isSandboxOrganizer(this.roles),
                new AgendaPortalLink(
                    'Images',
                    'sandbox-image',
                    'In the Images agenda, you can view available cloud images.',
                    'donut_large',
                ),
            ],
            [
                RoleResolver.isTrainingOrganizer(this.roles),
                new AgendaPortalLink(
                    'Training Instance',
                    'linear-instance',
                    'You can create training instances required for organizing hands-on training sessions.',
                    'event',
                ),
            ],
        );
    }

    private createManageButtons(): AgendaPortalLink[] {
        const granted = RoleResolver.isUserAndGroupAdmin(this.roles);
        return HomeComponent.grantedLinks(
            [
                granted,
                new AgendaPortalLink(
                    'Groups',
                    'group',
                    'In Groups, you can manage groups and grant access rights to their members.',
                    'group',
                ),
            ],
            [
                granted,
                new AgendaPortalLink(
                    'Users',
                    'user',
                    'The Users agenda lets you assign users to existing groups.',
                    'person',
                ),
            ],
            [
                granted,
                new AgendaPortalLink(
                    'Microservices',
                    'microservice',
                    'You can also manage the microservices that provide the CyberRangeᶜᶻ Platform’s functionality. Make sure you understand the implications before making any changes.',
                    'account_tree',
                ),
            ],
        );
    }

    private subscribeUserChange() {
        this.authService.activeUser$
            .pipe(takeUntilDestroyed(this.destroyRef))
            .subscribe(() => {
                this.initRoutes();
            });
    }
}
