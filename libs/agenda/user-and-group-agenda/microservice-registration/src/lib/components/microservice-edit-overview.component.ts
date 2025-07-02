import { ChangeDetectionStrategy, Component, OnInit, inject } from '@angular/core';
import {Router} from '@angular/router';
import {MicroserviceApi} from '@crczp/user-and-group-api';
import {Microservice} from '@crczp/user-and-group-model';
import {
    UserAndGroupDefaultNavigator,
    UserAndGroupErrorHandler,
    UserAndGroupNavigator,
    UserAndGroupNotificationService
} from '@crczp/user-and-group-agenda';
import {MicroserviceEditCanDeactivate} from '../services/microservice-edit-can-deactivate.service';
import {MicroserviceEditControlsComponent} from './microservice-edit-controls/microservice-edit-controls.component';
import {MicroserviceEditComponent} from './microservice-edit/microservice-edit.component';

/**
 * Main smart component of microservice-registration state page
 */
@Component({
    selector: 'crczp-microservice-edit-overview',
    templateUrl: './microservice-edit-overview.component.html',
    styleUrls: ['./microservice-edit-overview.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [
        MicroserviceEditControlsComponent,
        MicroserviceEditComponent
    ],
    providers: [
        MicroserviceEditCanDeactivate,
        {provide: UserAndGroupNavigator, useClass: UserAndGroupDefaultNavigator}
    ]
})
export class MicroserviceEditOverviewComponent implements OnInit {
    private api = inject(MicroserviceApi);
    private navigator = inject(UserAndGroupNavigator);
    private router = inject(Router);
    private notificationService = inject(UserAndGroupNotificationService);
    private errorHandler = inject(UserAndGroupErrorHandler);

    /**
     * Edited/created microservice-registration
     */
    microservice: Microservice;
    /**
     * True if microservice-registration has default role, false otherwise
     */
    hasDefaultRole: boolean;
    /**
     * True if microservice-registration state form is valid, false otherwise
     */
    isFormValid: boolean;
    /**
     * True if form data are saved, false otherwise
     */
    canDeactivateForm = true;

    ngOnInit(): void {
        this.initMicroservice();
    }

    /**
     * True if data in the component are saved and user can navigate to different page, false otherwise
     */
    canDeactivate(): boolean {
        return this.canDeactivateForm;
    }

    /**
     * Changes internal state of the component when microservice-registration is edited
     * @param microservice edited microservice-registration
     */
    onChange(microservice: Microservice): void {
        if (microservice.valid) {
            this.microservice.name = microservice.name;
            this.microservice.endpoint = microservice.endpoint;
            this.microservice.roles = microservice.roles;
        }
        this.hasDefaultRole = microservice.hasDefaultRole();
        this.isFormValid = this.hasDefaultRole && microservice.valid;
        this.canDeactivateForm = false;
    }

    /**
     * Calls service to create microservice-registration and handles eventual error
     */
    create(): void {
        this.api.create(this.microservice).subscribe(
            () => {
                this.router.navigate([this.navigator.toMicroserviceOverview()]);
                this.notificationService.emit('success', 'Microservice was created');
                this.canDeactivateForm = true;
            },
            (err) => this.errorHandler.emit(err, 'Creating microservice-registration')
        );
    }

    private initMicroservice() {
        this.microservice = new Microservice('', '', []);
    }
}
