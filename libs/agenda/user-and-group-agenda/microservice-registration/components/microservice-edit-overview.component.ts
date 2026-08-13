import { ChangeDetectionStrategy, Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { MicroserviceApi } from '@crczp/user-and-group-api';
import { Microservice } from '@crczp/user-and-group-model';
import { MicroserviceEditControlsComponent } from './microservice-edit-controls/microservice-edit-controls.component';
import { MicroserviceEditComponent } from './microservice-edit/microservice-edit.component';
import { ErrorHandlerService, NotificationService, UnsavedChangesTracker } from '@crczp/utils';
import { Routing } from '@crczp/routing-commons';

/**
 * Main smart component of microservice-registration state page
 */
@Component({
    selector: 'crczp-microservice-edit-overview',
    templateUrl: './microservice-edit-overview.component.html',
    styleUrls: ['./microservice-edit-overview.component.css'],
    changeDetection: ChangeDetectionStrategy.OnPush,
    imports: [MicroserviceEditControlsComponent, MicroserviceEditComponent],
})
export class MicroserviceEditOverviewComponent {
    /**
     * Blank microservice-registration seeding the registration form
     */
    readonly initialMicroservice = new Microservice('', '', []);
    /**
     * True if microservice-registration has default role, false otherwise
     */
    hasDefaultRole = true;
    /**
     * True if microservice-registration state form is valid, false otherwise
     */
    isFormValid = false;
    private readonly unsavedChanges = new UnsavedChangesTracker<'microservice'>();
    private microservice = this.initialMicroservice;
    private api = inject(MicroserviceApi);
    private router = inject(Router);
    private notificationService = inject(NotificationService);
    private errorHandler = inject(ErrorHandlerService);
    private destroyRef = inject(DestroyRef);

    /**
     * True if data in the component are saved and user can navigate to different page, false otherwise
     */
    canDeactivate(): boolean {
        return !this.unsavedChanges.hasAny();
    }

    /**
     * Changes internal state of the component when microservice-registration is edited
     * @param microservice edited microservice-registration
     */
    onChange(microservice: Microservice): void {
        this.microservice = microservice;
        this.hasDefaultRole = microservice.hasDefaultRole();
        this.isFormValid = this.hasDefaultRole && microservice.valid;
        this.unsavedChanges.set('microservice', true);
    }

    /**
     * Calls service to create microservice-registration and handles eventual error
     */
    create(): void {
        this.api
            .create(this.microservice)
            .pipe(
                this.unsavedChanges.clearOnSuccess('microservice'),
                takeUntilDestroyed(this.destroyRef),
            )
            .subscribe({
                next: () => {
                    this.router.navigate([
                        Routing.RouteBuilder.microservice.build(),
                    ]);
                    this.notificationService.emit(
                        'success',
                        'Microservice was created'
                    );
                },
                error: (err) =>
                    this.errorHandler.emitAPIError(
                        err,
                        'Creating microservice-registration'
                    ),
            });
    }
}
