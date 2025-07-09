/**
 * Class representing a port of a node in network topology. Association between port and node is created by nodeName attribute
 */
export class NodePort {
    name: string;
    nodeName: string;
    ip?: string;
    mac?: string;

    toString(): string {
        let result = 'Name: ' + this.name + '\n';
        if (this.ip !== null && this.ip !== '') {
            result += 'IP address: ' + this.ip + '\n';
        }
        if (this.mac !== null && this.mac !== '') {
            result += 'MAC address: ' + this.mac + '\n';
        }
        return result;
    }
}
