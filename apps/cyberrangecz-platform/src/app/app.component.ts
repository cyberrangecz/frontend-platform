import {AfterViewInit, Component, OnInit} from '@angular/core';
import {ActivatedRoute, NavigationEnd, Router} from '@angular/router';
import {SentinelAuthService, User} from '@sentinel/auth';
import {AgendaContainer} from '@sentinel/layout';
import {Observable} from 'rxjs';
import {filter, map, tap} from 'rxjs/operators';
import {NOTIFICATIONS_PATH} from './paths';
import {LoadingService} from './services/shared/loading.service';
import {NavConfigFactory} from './utils/nav-config-factory';
import {PortalDynamicEnvironment} from './portal-dynamic-environment';
import packagejson from '../../../../package.json';
import {NavBuilder} from "@crczp/common";

/**
 * Main component serving as wrapper for layout and router outlet
 */
@Component({
    selector: 'crczp-app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.scss'],
    standalone: false
})
export class AppComponent implements OnInit, AfterViewInit {
    isLoading$: Observable<boolean>;
    activeUser$: Observable<User | undefined>;
    title$: Observable<string>;
    subtitle$: Observable<string>;
    agendaContainers$: Observable<AgendaContainer[]>;
    notificationRoute = NOTIFICATIONS_PATH;
    version: string = '';

    constructor(
        private router: Router,
        private activatedRoute: ActivatedRoute,
        private loadingService: LoadingService,
        private authService: SentinelAuthService,
    ) {
    }

    ngOnInit(): void {
        console.log("ngOnInit");
        this.activeUser$ = this.authService.activeUser$.pipe(
            tap(activeUser => console.log(activeUser)),
        );
        console.log(this.authService.getActiveUserAuthorizationHeader())
        this.title$ = this.getTitleFromRouter();
        this.subtitle$ = this.getSubtitleFromRouter();
        this.agendaContainers$ = this.authService.activeUser$.pipe(
            filter((user) => user !== null && user !== undefined),
            map((user) => NavBuilder.buildNav(NavConfigFactory.buildNavConfig(user))),
            tap((data) => console.log(data))
        );
        this.isLoading$ = this.loadingService.isLoading$; // <-- causes angular error
        this.version = PortalDynamicEnvironment.getConfig().version || packagejson.version;
    }

    ngAfterViewInit(): void {
        this.router.events.pipe(
            tap((event) => console.log(event)),
            filter((event) => event instanceof NavigationEnd)
        ).subscribe();
    }

    onLogin(): void {
        console.log("onLogin");
        this.authService.login();
    }

    onLogout(): void {
        this.authService.logout();
    }

    private getTitleFromRouter(): Observable<string> {
        return this.router.events.pipe(
            filter((event) => event instanceof NavigationEnd),
            map(() => {
                let route = this.activatedRoute;
                while (route.firstChild) {
                    route = route.firstChild;
                }
                return route;
            }),
            filter((route) => route.outlet === 'primary'),
            map((route) => route.snapshot),
            map((snapshot) => snapshot.data['title']),
        );
    }

    private getSubtitleFromRouter(): Observable<string> {
        return this.router.events.pipe(
            filter((event) => event instanceof NavigationEnd),
            map(() => {
                let route = this.activatedRoute;
                while (route.firstChild) {
                    route = route.firstChild;
                }
                return route;
            }),
            filter((route) => route.outlet === 'primary'),
            map((route) => route.snapshot),
            map((snapshot) => snapshot.data['subtitle']),
        );
    }
}
