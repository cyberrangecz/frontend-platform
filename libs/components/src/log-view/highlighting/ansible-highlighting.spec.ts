import { formatJsonInText } from '../format-json-fragments';
import { LOGGING_ERROR_MARKER } from '../logging-error-marker';
import { ANSIBLE_RESULT_START, ansibleSupport } from './ansible-highlighting';
import { medianRunTime, tokenizerFor } from './highlighting-testing';

const [ansibleLanguage] = ansibleSupport;
const tokenize = tokenizerFor(ansibleLanguage);

describe('ansibleSupport', () => {
    describe('banners', () => {
        it('colours a play header and its padding', () => {
            expect(
                tokenize('PLAY [Configure web servers] ***********'),
            ).toEqual([
                'playHeader:PLAY [Configure web servers]',
                'padding:***********',
            ]);
        });

        it.each([
            ['TASK [debug] ***********', 'TASK [debug]'],
            ['TASK [Gathering Facts] ***', 'TASK [Gathering Facts]'],
            [
                'TASK [common : Install packages] ***',
                'TASK [common : Install packages]',
            ],
            [
                'RUNNING HANDLER [restart nginx] ***',
                'RUNNING HANDLER [restart nginx]',
            ],
        ])('colours the whole task header of %s', (line, header) => {
            expect(tokenize(line)).toEqual([
                `taskHeader:${header}`,
                `padding:${line.slice(header.length + 1)}`,
            ]);
        });

        it('colours the playbook line and the task path line whole', () => {
            expect(
                tokenize(
                    'PLAYBOOK: site.yml ***\ntask path: /home/user/site.yml:12',
                ),
            ).toEqual([
                'playHeader:PLAYBOOK: site.yml ***',
                'taskPath:task path: /home/user/site.yml:12',
            ]);
        });

        it('colours the banner printed once every host has failed', () => {
            expect(tokenize('NO MORE HOSTS LEFT ****')).toEqual([
                'statusFailed:NO MORE HOSTS LEFT',
                'padding:****',
            ]);
        });
    });

    describe('task status lines', () => {
        it.each([
            ['ok: [web]', 'statusOk:ok:', 'hostName:[web]'],
            [
                'changed: [10.10.30.5]',
                'statusChanged:changed:',
                'hostName:[10.10.30.5]',
            ],
            [
                'skipping: [db.example.com]',
                'statusSkipping:skipping:',
                'hostName:[db.example.com]',
            ],
            [
                'changed: [web1 -> localhost]',
                'statusChanged:changed:',
                'hostName:[web1 -> localhost]',
            ],
        ])(
            'colours the status word and the host of %s',
            (line, status, host) => {
                expect(tokenize(line)).toEqual([status, host]);
            },
        );

        it('colours a fatal result with its marker and JSON payload', () => {
            expect(
                tokenize(
                    'fatal: [web]: FAILED! => {"changed": false, "msg": "No package matching \'nginx\' is available", "rc": 1}',
                ),
            ).toEqual([
                'fatalError:fatal:',
                'hostName:[web]',
                'statusFailed:FAILED!',
                'arrow:=>',
                'bracket:{',
                'jsonKey:"changed"',
                'booleanFalse:false',
                'jsonKey:"msg"',
                'string:"No package matching \'nginx\' is available"',
                'jsonKey:"rc"',
                'number:1',
                'bracket:}',
            ]);
        });

        it('colours an unreachable host', () => {
            expect(
                tokenize(
                    'fatal: [10.10.30.5]: UNREACHABLE! => {"changed": false, "unreachable": true}',
                ),
            ).toEqual([
                'fatalError:fatal:',
                'hostName:[10.10.30.5]',
                'statusUnreachable:UNREACHABLE!',
                'arrow:=>',
                'bracket:{',
                'jsonKey:"changed"',
                'booleanFalse:false',
                'jsonKey:"unreachable"',
                'booleanTrue:true',
                'bracket:}',
            ]);
        });

        it('colours a failed loop item and leaves the item text plain', () => {
            expect(
                tokenize(
                    'failed: [web] (item=nginx) => {"ansible_loop_var": "item", "item": "nginx"}',
                ),
            ).toEqual([
                'statusFailed:failed:',
                'hostName:[web]',
                'arrow:=>',
                'bracket:{',
                'jsonKey:"ansible_loop_var"',
                'string:"item"',
                'jsonKey:"item"',
                'string:"nginx"',
                'bracket:}',
            ]);
        });

        it('keeps a loop item without a JSON payload out of result colouring', () => {
            expect(tokenize('ok: [web] => (item=[1, 2])\nok: [db]')).toEqual([
                'statusOk:ok:',
                'hostName:[web]',
                'arrow:=>',
                'statusOk:ok:',
                'hostName:[db]',
            ]);
        });

        it('colours included files, ignored failures and unmatched plays', () => {
            expect(
                tokenize(
                    [
                        'included: /etc/ansible/roles/web/tasks/main.yml for web, db',
                        '...ignoring',
                        'skipping: no hosts matched',
                    ].join('\n'),
                ),
            ).toEqual([
                'statusIncluded:included:',
                'string:/etc/ansible/roles/web/tasks/main.yml',
                'statusIgnoring:...ignoring',
                'statusSkipping:skipping: no hosts matched',
            ]);
        });

        it('colours a bracketed word as a host only after a status word', () => {
            expect(tokenize('msg: see [nginx] for details')).toEqual([]);
        });
    });

    describe('status word boundary', () => {
        it('colours a status word that ends its line or is followed by a space', () => {
            expect(tokenize('ok:\nE:\nok: [web]')).toEqual([
                'statusOk:ok:',
                'errorLine:E:',
                'statusOk:ok:',
                'hostName:[web]',
            ]);
        });

        it.each([
            'ok:value',
            'changed:true',
            'failed:1',
            'fatal:error',
            'E:\\data\\logs',
            'ERROR!unexpected',
        ])('leaves the look-alike line start %s plain', (line) => {
            expect(tokenize(line)).toEqual([]);
        });
    });

    describe('messages', () => {
        it.each([
            "ERROR! the role 'foo' was not found in /etc/ansible/roles",
            '[ERROR]: Task failed: Module failed: No package matching nginx',
            `${LOGGING_ERROR_MARKER} Failed to refresh logs.`,
            'E: Unable to locate package nginx',
        ])('colours the whole error line %s', (line) => {
            expect(tokenize(line)).toEqual([`errorLine:${line}`]);
        });

        it('colours the warning and deprecation prefixes', () => {
            expect(
                tokenize(
                    [
                        '[WARNING]: Could not match supplied host pattern, ignoring: all',
                        '[DEPRECATION WARNING]: The include action is deprecated.',
                    ].join('\n'),
                ),
            ).toEqual([
                'warning:[WARNING]:',
                'deprecation:[DEPRECATION WARNING]:',
            ]);
        });
    });

    describe('PLAY RECAP', () => {
        const recap = [
            'PLAY RECAP *********************************************************',
            '10.10.30.5                 : ok=3    changed=1    unreachable=0    failed=0    skipped=2    rescued=0    ignored=0',
            'web-1.example.com          : ok=1    changed=0    unreachable=1    failed=1    skipped=0    rescued=1    ignored=1',
        ];

        it('colours IP and dotted hosts and the non-zero counters', () => {
            expect(tokenize(recap.join('\n'))).toEqual([
                `playRecap:${recap[0]}`,
                'recapHost:10.10.30.5',
                'recapOk:ok=3',
                'recapChanged:changed=1',
                'recapSkipped:skipped=2',
                'recapHost:web-1.example.com',
                'recapOk:ok=1',
                'recapUnreachable:unreachable=1',
                'recapFailed:failed=1',
                'recapRescued:rescued=1',
                'recapIgnored:ignored=1',
            ]);
        });

        it('ends at the next playbook line, which keeps its own colours', () => {
            const log = [
                ...recap,
                'PLAYBOOK: second.yml ***',
                'PLAY [Second play] ***',
                'TASK [Gathering Facts] ***',
                'ok: [web]',
            ].join('\n');

            expect(tokenize(log).slice(11)).toEqual([
                'playHeader:PLAYBOOK: second.yml ***',
                'playHeader:PLAY [Second play]',
                'padding:***',
                'taskHeader:TASK [Gathering Facts]',
                'padding:***',
                'statusOk:ok:',
                'hostName:[web]',
            ]);
        });

        it('ends at a blank line', () => {
            expect(
                tokenize(`${recap.join('\n')}\n\nreport: ok=3 failed=1`).slice(
                    11,
                ),
            ).toEqual([]);
        });
    });

    describe('task results', () => {
        const fatalLine =
            'fatal: [web]: FAILED! => {"changed": false, "msg": "isn\'t there", "rc": 1, "results": [{"item": "a"}]}';

        it('leaves the result after a one-line payload', () => {
            expect(
                tokenize(
                    `${fatalLine}\n...ignoring\nTASK [Install nginx] ***`,
                ).slice(-3),
            ).toEqual([
                'statusIgnoring:...ignoring',
                'taskHeader:TASK [Install nginx]',
                'padding:***',
            ]);
        });

        it('colours a prettified payload line by line and leaves it after the closing bracket', () => {
            const log = formatJsonInText(
                `${fatalLine}\nTASK [next] ***`,
                ANSIBLE_RESULT_START,
            );

            expect(log.split('\n')).toHaveLength(11);
            expect(tokenize(log)).toEqual([
                'fatalError:fatal:',
                'hostName:[web]',
                'statusFailed:FAILED!',
                'arrow:=>',
                'bracket:{',
                'jsonKey:"changed"',
                'booleanFalse:false',
                'jsonKey:"msg"',
                'string:"isn\'t there"',
                'jsonKey:"rc"',
                'number:1',
                'jsonKey:"results"',
                'bracket:[',
                'bracket:{',
                'jsonKey:"item"',
                'string:"a"',
                'bracket:}',
                'bracket:]',
                'bracket:}',
                'taskHeader:TASK [next]',
                'padding:***',
            ]);
        });

        it('colours the multi-line output of the debug module', () => {
            expect(
                tokenize(
                    'ok: [web] => {\n    "msg": "Hello 10.10.30.5"\n}\n\nPLAY RECAP ***',
                ),
            ).toEqual([
                'statusOk:ok:',
                'hostName:[web]',
                'arrow:=>',
                'bracket:{',
                'jsonKey:"msg"',
                'string:"Hello 10.10.30.5"',
                'bracket:}',
                'playRecap:PLAY RECAP ***',
            ]);
        });
    });

    describe('prose', () => {
        it('never starts a string at an apostrophe within a word', () => {
            expect(
                tokenize("the user's home isn't set\nok: [web]\nit's \"done"),
            ).toEqual(['statusOk:ok:', 'hostName:[web]']);
        });

        it('colours quoted text, paths, times and versions', () => {
            expect(
                tokenize(
                    "Installing 'community.general:8.0.0' to '/root/.ansible/collections' \"now\" at /tmp/x",
                ),
            ).toEqual([
                'statusChanged:Installing',
                "string:'community.general:8.0.0'",
                "string:'/root/.ansible/collections'",
                'string:"now"',
                'string:/tmp/x',
            ]);
            expect(
                tokenize(
                    'Tuesday 22 October 2026  10:00:00 +0000 (0:00:01.234)       0:00:05.678 ****',
                ),
            ).toEqual([
                'timestamp:10:00:00',
                'timestamp:0:00:01.234',
                'timestamp:0:00:05.678',
                'padding:****',
            ]);
        });

        it('never colours an IP address as a version', () => {
            expect(tokenize('connect to host 10.10.30.5 port 22')).toEqual([]);
        });

        it('colours the settings of a verbose run', () => {
            expect(
                tokenize(
                    [
                        'ansible-playbook [core 2.15.3]',
                        '  config file = /etc/ansible/ansible.cfg',
                        '  python version = 3.10.12 (main, Nov 20 2023, 15:14:05) [GCC 11.4.0] (/usr/bin/python3)',
                    ].join('\n'),
                ),
            ).toEqual([
                'version:2.15.3',
                'settingName:config file',
                'string:/etc/ansible/ansible.cfg',
                'settingName:python version',
                'version:3.10.12',
                'timestamp:15:14:05',
                'version:11.4.0',
                'string:/usr/bin/python3',
            ]);
        });
    });

    describe('ansible-galaxy', () => {
        it('colours role install lines with or without a v prefix', () => {
            expect(
                tokenize(
                    [
                        'Starting galaxy role install process',
                        "- downloading role 'docker', owned by geerlingguy",
                        '- extracting geerlingguy.docker to /root/.ansible/roles/geerlingguy.docker',
                        '- geerlingguy.docker (7.4.1) was installed successfully',
                        '- geerlingguy.pip (v2.1.0) was installed successfully',
                        '- dependency geerlingguy.pip is already installed, skipping.',
                    ].join('\n'),
                ),
            ).toEqual([
                'galaxyStage:Starting galaxy role install process',
                'statusChanged:- downloading role',
                "string:'docker'",
                'statusChanged:- extracting',
                'string:/root/.ansible/roles/geerlingguy.docker',
                'statusOk:- geerlingguy.docker (7.4.1) was installed successfully',
                'statusOk:- geerlingguy.pip (v2.1.0) was installed successfully',
                'statusSkipping:- dependency geerlingguy.pip is already installed, skipping.',
            ]);
        });

        it('colours collection install lines', () => {
            expect(
                tokenize(
                    [
                        'Starting galaxy collection install process',
                        'Process install dependency map',
                        'Starting collection install process',
                        'Downloading https://galaxy.ansible.com/download/community-general-8.0.0.tar.gz to /root/.ansible/tmp/community-general-8.0.0',
                        'community.general:8.0.0 was installed successfully',
                        "'community.docker:3.4.0' is already installed, skipping.",
                    ].join('\n'),
                ),
            ).toEqual([
                'galaxyStage:Starting galaxy collection install process',
                'galaxyStage:Process install dependency map',
                'galaxyStage:Starting collection install process',
                'statusChanged:Downloading',
                'string:/root/.ansible/tmp/community-general-8.0.0',
                'statusOk:community.general:8.0.0 was installed successfully',
                "statusSkipping:'community.docker:3.4.0' is already installed, skipping.",
            ]);
        });
    });

    describe('long lines', () => {
        const prose = "host 10.10.30.5 isn't \"up\", retry=3 'x' /tmp/a ";
        const repeatToLength = (length: number): string =>
            prose.repeat(Math.ceil(length / prose.length)).slice(0, length);

        it.each([
            ['prose', (text: string) => text],
            [
                'a result message',
                (text: string) =>
                    `fatal: [web]: FAILED! => {"msg": "${text.replace(/"/g, '\\"')}"}`,
            ],
        ])(
            'tokenizes a ~2.5k- and a ~10k-character %s line in time linear in their length',
            (_, toLine) => {
                const shortLine = toLine(repeatToLength(2_475));
                const longLine = toLine(repeatToLength(9_900));
                const ratio =
                    medianRunTime(() => tokenize(longLine)) /
                    medianRunTime(() => tokenize(shortLine));

                expect(ratio).toBeLessThan(9);
            },
        );

        it('keeps highlighting the line after a line of over 10k characters', () => {
            const longLine = `fatal: [web]: FAILED! => {"msg": "${repeatToLength(10_000).replace(/"/g, "'")}"}`;

            expect(tokenize(`${longLine}\nTASK [next] ***`).slice(-2)).toEqual([
                'taskHeader:TASK [next]',
                'padding:***',
            ]);
        });
    });
});
