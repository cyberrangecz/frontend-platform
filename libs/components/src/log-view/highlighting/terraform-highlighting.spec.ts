import { LOGGING_ERROR_MARKER } from '../logging-error-marker';
import { medianRunTime, tokenizerFor } from './highlighting-testing';
import { terraformSupport } from './terraform-highlighting';

const [terraformLanguage] = terraformSupport;
const tokenize = tokenizerFor(terraformLanguage);

describe('terraformSupport', () => {
    describe('resource progress', () => {
        it.each([
            [
                'Creating...',
                'openstack_networking_network_v2.network: Creating...',
            ],
            [
                'Destroying...',
                'openstack_compute_instance_v2.server: Destroying... [id=5f1c]',
            ],
            [
                'Modifying...',
                'openstack_compute_instance_v2.server: Modifying... [id=5f1c]',
            ],
            ['Reading...', 'data.openstack_images_image_v2.image: Reading...'],
            [
                'Refreshing state...',
                'openstack_compute_keypair_v2.key: Refreshing state... [id=key]',
            ],
        ])('colours %s after the resource address', (message, line) => {
            const [address] = line.split(':');
            expect(tokenize(line).slice(0, 2)).toEqual([
                `resourceAddress:${address}`,
                `inProgress:${message}`,
            ]);
        });

        it.each(['creating', 'destroying', 'modifying', 'reading'])(
            'colours a Still %s... line with its elapsed time',
            (verb) => {
                expect(
                    tokenize(
                        `openstack_compute_instance_v2.server: Still ${verb}... [10s elapsed]`,
                    ),
                ).toEqual([
                    'resourceAddress:openstack_compute_instance_v2.server',
                    `inProgress:Still ${verb}...`,
                    'elapsedTime:10s elapsed',
                ]);
            },
        );

        it('colours the id and the elapsed time inside one bracket', () => {
            expect(
                tokenize(
                    'module.sandbox.openstack_compute_instance_v2.server["man"]: Still destroying... [id=0b6c-41f2, 1m30s elapsed]',
                ),
            ).toEqual([
                'resourceAddress:module.sandbox.openstack_compute_instance_v2.server["man"]',
                'inProgress:Still destroying...',
                'resourceId:id=0b6c-41f2',
                'elapsedTime:1m30s elapsed',
            ]);
        });

        it.each([
            ['Creation complete after', '2s'],
            ['Destruction complete after', '1m0s'],
            ['Modifications complete after', '2m0s'],
            ['Read complete after', '0s'],
        ])('colours a %s line with its time and id', (message, time) => {
            expect(
                tokenize(
                    `openstack_compute_instance_v2.server[0]: ${message} ${time} [id=5f1c-9a2e]`,
                ),
            ).toEqual([
                'resourceAddress:openstack_compute_instance_v2.server[0]',
                `complete:${message}`,
                `elapsedTime:${time}`,
                'resourceId:id=5f1c-9a2e',
            ]);
        });

        it('colours the address of a provisioner output line', () => {
            expect(
                tokenize(
                    'null_resource.provision (local-exec): Executing: ["/bin/sh" "-c" "echo done"]',
                ),
            ).toEqual([
                'resourceAddress:null_resource.provision',
                'string:"/bin/sh"',
                'string:"-c"',
                'string:"echo done"',
            ]);
        });

        it.each([
            'Apply complete! Resources: 12 added, 0 changed, 0 destroyed.',
            'Destroy complete! Resources: 12 destroyed.',
        ])('colours the closing summary %s as one token', (line) => {
            expect(tokenize(line)).toEqual([`complete:${line}`]);
        });

        it('colours an hour-long elapsed time as one token', () => {
            expect(
                tokenize(
                    'openstack_compute_instance_v2.server: Still creating... [1h2m3s elapsed]',
                ),
            ).toContain('elapsedTime:1h2m3s elapsed');
        });
    });

    describe('diagnostics', () => {
        it('colours an Error block with its context lines and leaves the detail plain', () => {
            const block = [
                'Error: Error creating OpenStack server: Quota exceeded for cores',
                '',
                '  with openstack_compute_instance_v2.server["attacker"],',
                '  on main.tf line 42, in resource "openstack_compute_instance_v2" "server":',
                '  42: resource "openstack_compute_instance_v2" "server" {',
                '',
                'Requested 2, but already used 20 of 20 cores',
            ].join('\n');

            expect(tokenize(block)).toEqual([
                'error:Error: Error creating OpenStack server: Quota exceeded for cores',
                'diagnosticContext:  with openstack_compute_instance_v2.server["attacker"],',
                'diagnosticContext:  on main.tf line 42, in resource "openstack_compute_instance_v2" "server":',
                'string:"openstack_compute_instance_v2"',
                'string:"server"',
                'number:2',
                'number:20',
                'number:20',
            ]);
        });

        it('colours a Warning line and its context line', () => {
            expect(
                tokenize(
                    'Warning: Argument is deprecated\n\n  on provider.tf line 3:',
                ),
            ).toEqual([
                'warning:Warning: Argument is deprecated',
                'diagnosticContext:  on provider.tf line 3:',
            ]);
        });

        it('colours the line marking a log that failed to load as an error', () => {
            const line = `${LOGGING_ERROR_MARKER} Failed to refresh logs.`;

            expect(tokenize(`apply finished\n${line}`)).toEqual([
                `error:${line}`,
            ]);
        });

        it('leaves Error: in the middle of a line to the other rules', () => {
            expect(tokenize('the step printed Error: none')).toEqual([]);
        });
    });

    describe('plan', () => {
        it('colours the resource heading, diff markers and attribute values', () => {
            const plan = [
                'OpenTofu will perform the following actions:',
                '',
                '  # openstack_compute_instance_v2.server will be created',
                '  + resource "openstack_compute_instance_v2" "server" {',
                '      + access_ip_v4        = (known after apply)',
                '      + name                = "server"',
                '      + stop_before_destroy = false',
                '      + power_state         = "active"',
                '      + admin_pass          = (sensitive value)',
                '      + count               = 3',
                '    }',
                '',
                'Plan: 1 to add, 0 to change, 0 to destroy.',
            ].join('\n');

            expect(tokenize(plan)).toEqual([
                'heading:OpenTofu will perform the following actions:',
                'resourceAddress:openstack_compute_instance_v2.server',
                'planAdd:+',
                'string:"openstack_compute_instance_v2"',
                'string:"server"',
                'planAdd:+',
                'attributeName:access_ip_v4',
                'placeholderValue:(known after apply)',
                'planAdd:+',
                'attributeName:name',
                'string:"server"',
                'planAdd:+',
                'attributeName:stop_before_destroy',
                'booleanFalse:false',
                'planAdd:+',
                'attributeName:power_state',
                'string:"active"',
                'planAdd:+',
                'attributeName:admin_pass',
                'placeholderValue:(sensitive value)',
                'planAdd:+',
                'attributeName:count',
                'number:3',
                'heading:Plan: 1 to add, 0 to change, 0 to destroy.',
            ]);
        });

        it.each([
            [
                'planChange',
                '  ~ resource "openstack_networking_port_v2" "port" {',
                '~',
            ],
            [
                'planDestroy',
                '  - resource "openstack_networking_port_v2" "port" {',
                '-',
            ],
            [
                'planReplace',
                '-/+ resource "openstack_compute_instance_v2" "server" {',
                '-/+',
            ],
            [
                'planReplace',
                '+/- resource "openstack_compute_instance_v2" "server" {',
                '+/-',
            ],
            [
                'planRead',
                ' <= data "openstack_images_image_v2" "image" {',
                '<=',
            ],
        ])('colours a %s marker', (kind, line, marker) => {
            expect(tokenize(line)[0]).toBe(`${kind}:${marker}`);
        });

        it('colours an in-place change with its old and new values', () => {
            expect(
                tokenize(
                    '      ~ enabled = true -> false # forces replacement',
                ),
            ).toEqual([
                'planChange:~',
                'attributeName:enabled',
                'booleanTrue:true',
                'booleanFalse:false',
                'comment:# forces replacement',
            ]);
        });

        it('mutes the hidden attributes note', () => {
            expect(
                tokenize('        # (12 unchanged attributes hidden)'),
            ).toEqual(['comment:# (12 unchanged attributes hidden)']);
        });

        it('colours an output value after apply', () => {
            expect(
                tokenize(
                    'Outputs:\n\nserver_ip = "10.10.0.5"\npassword = <sensitive>',
                ),
            ).toEqual([
                'heading:Outputs:',
                'attributeName:server_ip',
                'string:"10.10.0.5"',
                'attributeName:password',
                'placeholderValue:<sensitive>',
            ]);
        });
    });

    describe('values', () => {
        it('keeps IP addresses, versions and ids out of the number kind', () => {
            expect(
                tokenize(
                    'fixed_ip 10.10.0.5 v1.8.2 id 0b6c-41f2 at 12:30 and 7',
                ),
            ).toEqual(['number:7']);
        });

        it('colours true and false only as whole words', () => {
            expect(tokenize('untrue true falsehood false')).toEqual([
                'booleanTrue:true',
                'booleanFalse:false',
            ]);
        });
    });

    it('tokenizes a ~2k- and a ~7k-character separator, quote and indentation line in time linear in their length', () => {
        const piece = '- - ~ "a  # (x [id= 1m ';
        const shortLine = ` ${piece.repeat(80)}`;
        const longLine = ` ${piece.repeat(320)}`;

        const ratio =
            medianRunTime(() => tokenize(longLine)) /
            medianRunTime(() => tokenize(shortLine));

        expect(ratio).toBeLessThan(9);
    });

    describe('regressions', () => {
        it('leaves English words that are HCL keywords plain', () => {
            expect(
                tokenize(
                    'Include this file in your version control repository so that OpenTofu can guarantee to make the same selections by default when for each resource provider data is read',
                ),
            ).toEqual([]);
        });

        it('keeps a shell glob from commenting out the rest of the log', () => {
            expect(
                tokenize(
                    'null_resource.cleanup (local-exec): rm -rf /tmp/*\nnull_resource.cleanup: Creation complete after 1s [id=42]',
                ),
            ).toEqual([
                'resourceAddress:null_resource.cleanup',
                'resourceAddress:null_resource.cleanup',
                'complete:Creation complete after',
                'elapsedTime:1s',
                'resourceId:id=42',
            ]);
        });

        it('keeps a URL from commenting out the rest of its line', () => {
            expect(
                tokenize('see https://opentofu.org/docs then retry 3'),
            ).toEqual(['number:3']);
        });

        it('styles no built-in function names, so no token name is invalid', () => {
            expect(
                tokenize('format join lookup merge length file templatefile'),
            ).toEqual([]);
        });

        it('keeps a lone double quote from colouring later lines as a string', () => {
            expect(
                tokenize(
                    'module.vm (remote-exec): say "hello\nplain line\nflag = true',
                ),
            ).toEqual([
                'resourceAddress:module.vm',
                'attributeName:flag',
                'booleanTrue:true',
            ]);
        });
    });
});
