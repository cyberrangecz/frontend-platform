import { ConsoleUrl } from '../model/others/console-url';

/**
 * @dynamic
 */
export class ConsoleUrlMapper {
    static fromJSON(json): ConsoleUrl[] {
        const res: ConsoleUrl[] = [];
        if (json) {
            Object.keys(json).forEach((key) => {
                const vmConsole = new ConsoleUrl();
                vmConsole.name = key;
                vmConsole.url = json[key];
                res.push(vmConsole);
            });
        }
        return res;
    }
}
