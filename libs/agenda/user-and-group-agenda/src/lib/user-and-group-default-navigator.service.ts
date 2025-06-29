import { Injectable } from '@angular/core';
import {
    GROUP_DETAIL_PATH,
    GROUP_EDIT_PATH,
    GROUP_NEW_PATH,
    GROUP_PATH,
    MICROSERVICE_NEW_PATH,
    MICROSERVICE_PATH,
    USER_DETAIL_PATH,
    USER_PATH,
} from './default-paths';
import { UserAndGroupNavigator } from './user-and-group-navigator.service';

/**
 *
 */
@Injectable()
export class UserAndGroupDefaultNavigator extends UserAndGroupNavigator {
    toGroupEdit(id: number | string): string {
        return `${GROUP_PATH}/${id}/${GROUP_EDIT_PATH}`;
    }

    toGroupOverview(): string {
        return GROUP_PATH;
    }

    toGroupDetail(id: number | string): string {
        return `${GROUP_PATH}/${id}/${GROUP_DETAIL_PATH}`;
    }

    toNewGroup(): string {
        return `${GROUP_PATH}/${GROUP_NEW_PATH}`;
    }

    toMicroserviceOverview(): string {
        return MICROSERVICE_PATH;
    }

    toNewMicroservice(): string {
        return `${MICROSERVICE_PATH}/${MICROSERVICE_NEW_PATH}`;
    }

    toUserOverview(): string {
        return USER_PATH;
    }

    toUserDetail(id: number | string): string {
        return `${USER_PATH}/${id}/${USER_DETAIL_PATH}`;
    }
}
