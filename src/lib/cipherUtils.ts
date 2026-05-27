/**
 * Cipher implementation utilities for CipherQuest Lab
 */

export interface CipherMission {
  id: string;
  level: number;
  type: string;
  encryptedText: string;
  originalText: string;
  schemeHint: string; // The encoding scheme (e.g. "Reverse Cipher")
  difficulty: 'easy' | 'medium' | 'hard';
  params?: any;
}

const CIPHERLAB_WORDS = [
    "Porsche", "Apple", "Google", "Samsung", "Bugatti", "Firefox", "Chrome", "Safari", "Opera", "Edge",
    "Ferrari", "Intel", "AMD", "Nvidia", "Qualcomm", "Sony", "Nintendo", "Xbox", "PlayStation", "Switch",
    "AstonMartin", "Logitech", "Razer", "Corsair", "Asus", "Acer", "Lenovo", "Dell", "Surface", "Microsoft",
    "McLaren", "Ubuntu", "Debian", "Fedora", "ArchLinux", "CentOS", "RedHat", "Kali", "Parrot", "Mint",
    "Chevrolet", "Docker", "Kubernetes", "Jenkins", "GitLab", "GitHub", "Bitbucket", "Jira", "Confluence", "Trello"
];

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function applyCaesar(str: string, shift: number): string {
    return str.split('').map(c => {
        if (c >= 'A' && c <= 'Z') {
            let idx = (c.charCodeAt(0) - 65 + shift) % 26;
            if (idx < 0) idx += 26;
            return String.fromCharCode(idx + 65);
        }
        return c;
    }).join('');
}

export const ciphers = {
    // 1
    reverse: (text: string) => text.split('').reverse().join(''),
    // 2
    caesar: (text: string, shift: number) => applyCaesar(text, shift),
    // 3
    atbash: (text: string) => {
        return text.split('').map(char => {
            if (char >= 'A' && char <= 'Z') return String.fromCharCode(90 - (char.charCodeAt(0) - 65));
            return char;
        }).join('');
    },
    // 4
    monoalphabetic: (text: string) => {
        const available = ALPHABET.split('');
        const shuffled = [...available].sort(() => Math.random() - 0.5);
        const map: Record<string, string> = {};
        for(let i=0; i<26; i++) map[available[i]] = shuffled[i];
        const enc = text.split('').map(c => map[c] || c).join('');
        const fullMap = Object.entries(map).map(([k,v]) => `${k}=${v}`).join(', ');
        return { enc, rule: `RANDOM SUB (${fullMap})` };
    },
    // 5
    fixedNumber: (text: string) => {
        const mapChar = (c: string) => {
            if (c >= '0' && c <= '9') return c.charCodeAt(0) - 48;
            if (c >= 'a' && c <= 'z') return c.charCodeAt(0) - 97 + 10;
            if (c >= 'A' && c <= 'Z') return c.charCodeAt(0) - 65 + 36;
            if (c === '.') return 62; if (c === '?') return 63;
            if (c === '!') return 64; if (c === ',') return 65;
            return -1;
        };
        return text.split('').map(mapChar).join('-');
    },
    // 6
    reverseCaesar: (text: string, shift: number) => applyCaesar(text.split('').reverse().join(''), shift),
    // 7
    alternating: (text: string, s1: number, s2: number) => {
        return text.split('').map((c, i) => applyCaesar(c, i % 2 === 0 ? s1 : s2)).join('');
    },
    // 8
    positional: (text: string) => {
        return text.split('').map((c, i) => applyCaesar(c, i + 1)).join('');
    },
    // 9
    vowelScrambler: (text: string) => {
        const v: Record<string, string> = {'A':'1', 'E':'2', 'I':'3', 'O':'4', 'U':'5'};
        return text.split('').map(c => v[c] || c).join('');
    },
    // 10
    keyedSubstitution: (text: string, key: string) => {
        const seen = new Set<string>();
        const keyedAlpha: string[] = [];
        for (const char of (key + ALPHABET)) {
            if (!seen.has(char)) {
                seen.add(char);
                keyedAlpha.push(char);
            }
        }
        const map: Record<string, string> = {};
        for(let i=0; i<26; i++) map[ALPHABET[i]] = keyedAlpha[i];
        const enc = text.split('').map(c => map[c] || c).join('');
        return { enc, rule: `KEYED SUB (KEY=${key})` };
    },
    // 11
    modularShift: (text: string, shift: number) => applyCaesar(text, shift),
    // 12
    vigenere: (text: string, key: string) => {
        return text.split('').map((c, i) => {
            if (c >= 'A' && c <= 'Z') {
                return applyCaesar(c, key[i % key.length].charCodeAt(0) - 65);
            }
            return c;
        }).join('');
    },
    // 13
    affine: (text: string, a: number, b: number) => {
        return text.split('').map(c => {
            if (c >= 'A' && c <= 'Z') {
                return String.fromCharCode(((a * (c.charCodeAt(0) - 65) + b) % 26) + 65);
            }
            return c;
        }).join('');
    },
    // 14
    permutation: (text: string) => {
        const evens = text.split('').filter((_, i) => i % 2 === 0).join('');
        const odds = text.split('').filter((_, i) => i % 2 !== 0).join('');
        return evens + odds;
    },
    // 15
    blockedRotate: (text: string, key: string, bs: number) => {
        let res = "";
        for (let i = 0; i < text.length; i += bs) {
            const block = text.slice(i, i + bs).split('').reverse().join('');
            for (let j = 0; j < block.length; j++) {
                res += applyCaesar(block[j], key[j % key.length].charCodeAt(0) - 65);
            }
        }
        return res;
    },
    // 16
    pairing: (text: string) => {
        let res = "";
        for (let i = 0; i < text.length; i += 2) {
            if (i + 1 < text.length) {
                const v1 = text.charCodeAt(i) - 65;
                const v2 = text.charCodeAt(i+1) - 65;
                res += String.fromCharCode(((v1 + v2) % 26) + 65);
                res += String.fromCharCode(((v1 * v2) % 26) + 65);
            } else {
                res += text[i];
            }
        }
        return res;
    },
    // 17
    rotateAdd: (text: string) => {
        const rev = text.split('').reverse().join('');
        return text.split('').map((c, i) => applyCaesar(c, rev.charCodeAt(i) - 65)).join('');
    },
    // 18
    encryptAdditively: (text: string) => {
        const shifts = [1, 3, 5, 7];
        return text.split('').map((c, i) => applyCaesar(c, shifts[i % shifts.length])).reverse().join('');
    },
    // 19
    miniRsa: (text: string) => {
        const p = 5, q = 3, n = 15, e = 3, d = 11;
        const res = text.split('').map(c => {
            if (c >= 'A' && c <= 'Z') {
                const x = c.charCodeAt(0) - 65;
                const y = Math.pow(x, e) % n;
                return y < 26 ? String.fromCharCode(y + 65) : y.toString();
            }
            return c;
        });
        return { enc: res.join('-'), rule: `MINI RSA: p=${p}, q=${q}, n=${n}, e=${e}, d=${d}` };
    },
    // 20
    merkle: (text: string) => {
        const hashTwo = (a: number, b: number) => (a * 3 + b * 7) % 26;
        let leaves = text.split('').map(c => c.charCodeAt(0) - 65);
        let size = 1;
        while (size < leaves.length) size *= 2;
        while (leaves.length < size) leaves.push(0);
        let levelNodes = [...leaves];
        while (levelNodes.length > 1) {
            const nextLevel: number[] = [];
            for (let i = 0; i < levelNodes.length; i += 2) {
                nextLevel.push(hashTwo(levelNodes[i], levelNodes[i+1]));
            }
            levelNodes = nextLevel;
        }
        const enc = String.fromCharCode(levelNodes[0] + 65);
        return enc;
    }
};

export function generateMission(level: number, usedWords: string[] = []): CipherMission {
    let availableWords = CIPHERLAB_WORDS.filter(w => !usedWords.includes(w.toUpperCase()));
    if (availableWords.length === 0) availableWords = CIPHERLAB_WORDS;
    
    const word = availableWords[Math.floor(Math.random() * availableWords.length)].toUpperCase();
    const id = `mission_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
    
    let difficulty: 'easy' | 'medium' | 'hard' = 'easy';
    if (level >= 10) difficulty = 'hard';
    else if (level >= 5) difficulty = 'medium';

    const rand = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;
    
    const orderedTypes = [
        'reverse', 'caesar', 'atbash', 'monoalphabetic', 'fixed-number',
        'reverse-caesar', 'alternating', 'positional', 'vowel-scrambler', 'keyed-substitution',
        'modular-shift', 'vigenere', 'affine', 'permutation', 'blocked-rotate',
        'pairing', 'rotate-add', 'encrypt-additively', 'mini-rsa', 'merkle'
    ];
    
    const type = orderedTypes[level % orderedTypes.length];
    
    let encryptedText = "";
    let schemeHint = "";

    if (type === 'reverse') {
        encryptedText = ciphers.reverse(word);
        schemeHint = "REVERSE STRING";
    } else if (type === 'caesar') {
        const shift = rand(1, 25);
        encryptedText = ciphers.caesar(word, shift);
        schemeHint = `SHIFT +${shift}`;
    } else if (type === 'atbash') {
        encryptedText = ciphers.atbash(word);
        schemeHint = "ATBASH (A=Z, B=Y, ...)";
    } else if (type === 'monoalphabetic') {
        const out = ciphers.monoalphabetic(word);
        encryptedText = out.enc;
        schemeHint = out.rule;
    } else if (type === 'fixed-number') {
        encryptedText = ciphers.fixedNumber(word);
        schemeHint = "FIXED NUMBER ENCODING";
    } else if (type === 'reverse-caesar') {
        const shift = rand(1, 25);
        encryptedText = ciphers.reverseCaesar(word, shift);
        schemeHint = `REVERSE THEN SHIFT +${shift}`;
    } else if (type === 'alternating') {
        const s1 = rand(1, 10);
        const s2 = -rand(1, 10);
        encryptedText = ciphers.alternating(word, s1, s2);
        schemeHint = `ALTERNATING SHIFTS: +${s1}, ${s2}`;
    } else if (type === 'positional') {
        encryptedText = ciphers.positional(word);
        schemeHint = "POSITIONAL SHIFT";
    } else if (type === 'vowel-scrambler') {
        encryptedText = ciphers.vowelScrambler(word);
        schemeHint = "VOWELS TO NUMBERS";
    } else if (type === 'keyed-substitution') {
        const keys = ["CIPHER", "NEXUS", "MATRIX", "STEALTH", "GHOST"];
        const key = keys[Math.floor(Math.random() * keys.length)];
        const out = ciphers.keyedSubstitution(word, key);
        encryptedText = out.enc;
        schemeHint = out.rule;
    } else if (type === 'modular-shift') {
        const shift = rand(1, 25);
        encryptedText = ciphers.modularShift(word, shift);
        schemeHint = `MODULAR SHIFT +${shift}`;
    } else if (type === 'vigenere') {
        const keys = ["NEO", "TRINITY", "MORPHEUS", "SMITH"];
        const key = keys[Math.floor(Math.random() * keys.length)];
        encryptedText = ciphers.vigenere(word, key);
        schemeHint = `VIGENERE (KEY=${key})`;
    } else if (type === 'affine') {
        const asList = [3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25];
        const a = asList[Math.floor(Math.random() * asList.length)];
        const b = rand(1, 25);
        encryptedText = ciphers.affine(word, a, b);
        schemeHint = `AFFINE (a=${a}, b=${b})`;
    } else if (type === 'permutation') {
        encryptedText = ciphers.permutation(word);
        schemeHint = "PERMUTATION (evens then odds)";
    } else if (type === 'blocked-rotate') {
        encryptedText = ciphers.blockedRotate(word, "CAT", 3);
        schemeHint = "BLOCKED ROTATE";
    } else if (type === 'pairing') {
        encryptedText = ciphers.pairing(word);
        schemeHint = "PAIRING";
    } else if (type === 'rotate-add') {
        encryptedText = ciphers.rotateAdd(word);
        schemeHint = "ROTATE ADD";
    } else if (type === 'encrypt-additively') {
        encryptedText = ciphers.encryptAdditively(word);
        schemeHint = "ENCRYPT ADDITIVELY";
    } else if (type === 'mini-rsa') {
        const out = ciphers.miniRsa(word);
        encryptedText = out.enc;
        schemeHint = out.rule;
    } else if (type === 'merkle') {
        encryptedText = ciphers.merkle(word);
        schemeHint = "MINI MERKLE TREE";
    }

    return { id, level, type, encryptedText, originalText: word, schemeHint, difficulty };
}

export function calculateScore(basePoints: number, timeSpent: number, totalTime: number, hintsCount: number): number {
  const timeFactor = Math.max(0.2, (totalTime - timeSpent) / totalTime);
  const hintDeduction = hintsCount * 50;
  return Math.max(10, Math.floor(basePoints * timeFactor) - hintDeduction);
}
