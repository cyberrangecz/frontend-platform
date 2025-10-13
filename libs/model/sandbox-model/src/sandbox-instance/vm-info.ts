import {VMStatus} from '../enums/vm-status.enum';

export class VMInfo {
    name!: string;
    id!: string;
    status!: VMStatus;
    creationTime!: Date;
    updateTime!: Date;
    imageId!: string;
    flavorName!: string;
}
