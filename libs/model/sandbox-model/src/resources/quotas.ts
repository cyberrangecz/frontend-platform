import {Quota} from './quota';

export class Quotas {
    vcpu!: Quota;
    ram!: Quota;
    instances!: Quota;
    network!: Quota;
    subnet!: Quota;
    port!: Quota;
}
