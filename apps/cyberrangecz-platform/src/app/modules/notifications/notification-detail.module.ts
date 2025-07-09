import {NgModule} from "@angular/core";
import {CommonModule} from "@angular/common";
import {RouterModule} from "@angular/router";
import {SentinelNotificationDetailComponent} from "@sentinel/layout/notification";

@NgModule({
    imports: [
        CommonModule,
        RouterModule.forChild([
            {
                path: '',
                component: SentinelNotificationDetailComponent,
            },
        ]),
    ],
})
export class NotificationDetailModule {
}
