export interface Mission {
  id: string;
  name: string;
  description: string;
  type: string;
  storyIntro?: string;
}

export interface Chapter {
  id: number;
  title: string;
  speaker: string;
  speakerColor: string;
  missions: Mission[];
}

export interface AvatarVariant {
  id: string;
  icon: string;
  colorName: string;
  colorHex: string;
}

export const AVATAR_VARIANTS: AvatarVariant[] = [
  { id: 'cyan', icon: 'layers', colorName: 'Cyber Cyan', colorHex: 'var(--current-theme-color)' },
  { id: 'green', icon: 'memory', colorName: 'Matrix Green', colorHex: '#00ff88' },
  { id: 'purple', icon: 'api', colorName: 'Neon Purple', colorHex: '#b200ff' },
  { id: 'orange', icon: 'local_fire_department', colorName: 'Plasma Orange', colorHex: '#ff8800' },
  { id: 'magenta', icon: 'adjust', colorName: 'Laser Magenta', colorHex: '#ff00aa' }
];

export const CHAPTERS: Chapter[] = [
  {
    id: 1,
    title: 'SECTOR 1: THE OUTSKIRTS',
    speaker: 'JUNKYARD',
    speakerColor: 'text-amber-500',
    missions: [
      { id: '1-1', name: 'Gateway Firewall Proxy', description: 'Reverse the String', type: 'reverse', storyIntro: 'Listen up, {NAME}. The Syndicate is knocking on the Outer Gate. We gotta scramble our outbound routing logs right now. Take this standard packet and reverse the sequence so they can\'t trace the origin.' },
      { id: '1-2', name: 'Neon Glitch Evasion', description: 'Shift by (+/- X)', type: 'caesar', storyIntro: 'They broke the outer wall! To get our data through the glitching neon grid safely, we need a linear character shift. Calculate the delta and encrypt the feed before they sniff it.' },
      { id: '1-3', name: 'Alleyway Mirror Drop', description: 'A-Z, B-Y, C-X and so on', type: 'atbash', storyIntro: 'Extraction point is set in the alleys. We\'re transmitting coordinates using an inverted alphabet protocol. Don\'t mess this up, or their drones will read it loud and clear.' },
      { id: '1-4', name: 'Black Market Secure Line', description: 'Create your own mapping', type: 'monoalphabetic', storyIntro: 'A local smuggler offered us a secure tunnel, but we have to match his custom frequency map. Restructure our plaintext using his bespoke substitution matrix.' },
      { id: '1-5', name: 'Cargo Tag Forgery', description: '0-9, a-z = 10-35, A-Z = 36-51, .?!, = 52,53,54,55', type: 'fixed-number', storyIntro: 'To bypass the cargo scanners into Sector 2, we must disguise our data as numerical shipping blocks. Convert this alphanumeric payload into raw integers. See you on the other side.' }
    ]
  },
  {
    id: 2,
    title: 'SECTOR 2: THE NEON SLUMS',
    speaker: 'SILK',
    speakerColor: 'text-fuchsia-500',
    missions: [
      { id: '2-1', name: 'Shadow Protocol Shell', description: 'Reverse then Shift by (+/- X)', type: 'reverse-caesar', storyIntro: 'Welcome to the Slums, {NAME}. Syndicate sniffers are crawling everywhere here. Apply layered obfuscation: reverse the payload, then apply a standard shift. Keep it quiet.' },
      { id: '2-2', name: 'Synth-Wave Pulse Encryption', description: '+/- X, +/- Y alternating', type: 'alternating', storyIntro: 'The sniffers are adapting to our frequency. We need a dynamic wave signature. Modulate the data shift periodically, alternating between two frequencies so they lose the lock.' },
      { id: '2-3', name: 'Elevator Depth Charge', description: '+1 then +2 and beyond', type: 'positional', storyIntro: 'We are diving deep into the underground infrastructure. The encryption must scale with our depth index. Apply a progressively higher shift to each character as we go down.' },
      { id: '2-4', name: 'Vocal Scrambler Bypass', description: 'Replace Vowels and Spaces with Numbers and Symbols', type: 'vowel-scrambler', storyIntro: 'They tapped our voice comms. Strip the vowels from our transmission and inject distinct numerical symbols. That\'ll scramble the audio feed into static on their end.' },
      { id: '2-5', name: 'Rogue VIP Ghosting', description: 'Say the Key is XIATUV then ABCDE... = XIATUV_BCDEFGHJK...', type: 'keyed-substitution', storyIntro: 'I managed to steal a VIP keycard. To spoof our identity in their system, we must alter our data signature using the VIP\'s keyword as the alphabet array base. Make it convincing.' }
    ]
  },
  {
    id: 3,
    title: 'SECTOR 3: THE CORPORATE GRID',
    speaker: 'PROXY',
    speakerColor: 'text-emerald-500',
    missions: [
      { id: '3-1', name: 'Traffic Grid Modulus', description: '((index_of_the_alphabet) + key_number) mod 26', type: 'modular-shift', storyIntro: 'Welcome to the MegaCorp Grid, Operator {NAME}. To blend in with corporate traffic, we must wrap our data using strict modular arithmetic. Calculate the modulo 26 shifts exactly.' },
      { id: '3-2', name: 'Poly-Auth Trojan', description: '((index_of_the_alphabet) + index_of_key) mod 26', type: 'vignere', storyIntro: 'The Syndicate is auditing all corporate logs. We must disguise our presence with Polyalphabetic encryption. Use the target employee ID to dynamically shift our text.' },
      { id: '3-3', name: 'Corporate Vault Injection', description: '(A*(index of alphabet) + B) mod 26', type: 'affine', storyIntro: 'We are targeting their financial vaults now. Map our characters to linear algebraic equations using multiplier A and B. It creates an untraceable deposit signature.' },
      { id: '3-4', name: 'Packet Dispersion Routing', description: 'Reorder using a rule', type: 'permutation', storyIntro: 'The core defenses are heavily monitored. Fragment our heavy payload and shuffle the layout. The data will reassemble automatically upon infiltration past the sentries.' },
      { id: '3-5', name: 'Security Drone Hijack', description: 'ABCDEF -> CBAFED (key = CAT) = (CBA + CAT) + (FED + CAT)', type: 'blocked-rotate', storyIntro: 'Combat drones are swarming our position. To hijack their targeting array, divide our override sequence into blocks, reverse the rotors, and embed their local key.' }
    ]
  },
  {
    id: 4,
    title: 'SECTOR 4: THE SYNDICATE CORE',
    speaker: 'KNOX',
    speakerColor: 'text-[var(--current-theme-color)]',
    missions: [
      { id: '4-1', name: 'DNA Sequencing Spoof', description: 'Full A-Z Random Mapping', type: 'monoalphabetic', storyIntro: 'Operator {NAME}, we are inside the Syndicate genetics lab. To inject our lethal payload, we must obfuscate it using their full random DNA mapping protocol.' },
      { id: '4-2', name: 'Power Core Implosion', description: '(I_Original + I_Reverse)', type: 'rotate-add', storyIntro: 'Approaching the main reactor. Fold our explosive data structure on top of itself and sum the output. The reactor will process it as a critical failure wave.' },
      { id: '4-3', name: 'Additive Surge Strike', description: '(1,3,5,7) then flip the block', type: 'encrypt-additively', storyIntro: 'The Syndicate firewall is rebuilding itself. Hit them with a constant changing stream of shifts across the grid to keep them blinded.' },
      { id: '4-4', name: 'Executive Mainframe Lockout', description: 'Encrypt with y = (x^a) mod n', type: 'mini-rsa', storyIntro: 'The CEO mainframe is vulnerable. We have their public key. Encrypt our final lockout command using asymmetric cryptography so they can never regain access.' },
      { id: '4-5', name: 'Syndicate Merkle Wipe', description: 'Hash 2^n to get 1 root', type: 'merkle', storyIntro: 'This is it. They are securing backups via a Merkle root. We must encrypt a malicious root hash to silently wipe their entire server state. Do not fail.' }
    ]
  }
];
