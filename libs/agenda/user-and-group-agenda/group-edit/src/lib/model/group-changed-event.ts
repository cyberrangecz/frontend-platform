import { Group } from '@crczp/user-and-group-model';

/**
 * Event emitted when edited group-overview is changed
 */
export class GroupChangedEvent {
    group: Group;
    isValid: boolean;

    constructor(group: Group, isValid: boolean) {
        this.group = group;
        this.isValid = isValid;
    }
}
