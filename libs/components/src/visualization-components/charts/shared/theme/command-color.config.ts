/**
 * Half-width, in degrees, of the hue band reserved around each curated command in
 * the main-saturation plane. Generated main-plane colours keep at least this far
 * from every curated hue so the headline commands stay visually unambiguous.
 */
export const RESERVED_HUE_RADIUS_DEGREES = 2;

/**
 * Minimum hue spacing, in degrees, between generated colour slots within a plane.
 * Guarantees adjacent generated commands are separated by at least this much.
 */
export const SLOT_SPACING_DEGREES = 2;

/** Chroma multiplier of the main (primary) saturation plane, used by curated commands. */
export const MAIN_CHROMA_SCALE = 1;

/**
 * Chroma multiplier of the secondary saturation plane. Lower than the main plane so
 * its colours read as a distinct, muted band while keeping their hue.
 */
export const SECONDARY_CHROMA_SCALE = 0.6;

/**
 * Curated hue (in degrees) assigned to each well-known Linux and cybersecurity
 * command, keyed by lowercase command name. The set is drawn from the academic
 * survey of Kali penetration-testing tools (Tigner, Wimmer & Rebmann, 2021) and the
 * core shell commands used in cyber-range terminals. Hues are spread evenly with
 * Linux and offensive tooling interleaved, so a command-homogeneous chart still
 * spans the wheel. These hues are stable identities rendered at the main saturation;
 * each is withheld (±{@link RESERVED_HUE_RADIUS_DEGREES}) from the generated main
 * plane. Aliases and tool-family members share their base tool's hue. Commands
 * absent from this map receive an allocated colour from the remaining slot space.
 */
export const CURATED_COMMAND_HUES: Readonly<Record<string, number>> = {
    ls: 0,
    nmap: 6.4,
    cd: 12.9,
    masscan: 19.3,
    cat: 25.7,
    metasploit: 32.1,
    pwd: 38.6,
    sqlmap: 45,
    cp: 51.4,
    hydra: 57.9,
    mv: 64.3,
    medusa: 70.7,
    rm: 77.1,
    john: 83.6,
    mkdir: 90,
    hashcat: 96.4,
    chmod: 102.9,
    nikto: 109.3,
    chown: 115.7,
    wpscan: 122.1,
    ps: 128.6,
    gobuster: 135,
    kill: 141.4,
    dirb: 147.9,
    grep: 154.3,
    ffuf: 160.7,
    find: 167.1,
    wfuzz: 173.6,
    sudo: 180,
    burpsuite: 186.4,
    ssh: 192.9,
    netcat: 199.3,
    scp: 205.7,
    socat: 212.1,
    wget: 218.6,
    tcpdump: 225,
    curl: 231.4,
    wireshark: 237.9,
    ping: 244.3,
    'aircrack-ng': 250.7,
    netstat: 257.1,
    responder: 263.6,
    ip: 270,
    crackmapexec: 276.4,
    vim: 282.9,
    impacket: 289.3,
    tar: 295.7,
    smbclient: 302.1,
    dig: 308.6,
    enum4linux: 315,
    nano: 321.4,
    nessus: 327.9,
    lynis: 334.3,
    setoolkit: 340.7,
    ettercap: 347.1,
    gdb: 353.6,
    msfconsole: 32.1,
    msf: 32.1,
    msfvenom: 32.1,
    nc: 199.3,
    ncat: 199.3,
    jtr: 83.6,
    'john-the-ripper': 83.6,
    oclhashcat: 96.4,
    'airodump-ng': 250.7,
    'aireplay-ng': 250.7,
    'airmon-ng': 250.7,
    tshark: 237.9,
    dirbuster: 147.9,
    feroxbuster: 135,
    smbmap: 302.1,
    secretsdump: 289.3,
    psexec: 289.3,
    wmiexec: 289.3,
};
