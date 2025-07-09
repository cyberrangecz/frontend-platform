import {OwnerSpecified} from './owner-specified';

export class VirtualImage {
    osDistro!: string;
    osType!: string;
    name!: string;
    diskFormat!: string;
    containerFormat!: string;
    visibility!: string;
    size!: number;
    status!: string;
    minRam!: number;
    minDisk!: number;
    tags: string[] = [];
    defaultUser!: string;
    updatedAt!: Date;
    createdAt!: Date;
    ownerSpecified!: OwnerSpecified;
}
