import { CommonModule } from '@angular/common';
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { NotificationResolver, SentinelNotificationOverviewComponent } from '@sentinel/layout/notification';

@NgModule({
    imports: [
        CommonModule,
        RouterModule.forChild([
            {
                path: '',
                component: SentinelNotificationOverviewComponent,
            },
            {
                path: ':id',
                loadComponent: () =>
                    import('@sentinel/layout/notification').then(
                        (m) => m.SentinelNotificationDetailComponent,
                    ),
                data: { title: 'Notification Detail', breadcrumb: 'Detail' },
                resolve: { sentinelNotification: NotificationResolver },
            },
        ]),
    ],
})
export class NotificationsRoutingModule {}
