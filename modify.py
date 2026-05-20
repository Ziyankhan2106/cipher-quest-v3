import re
import os

with open('app.py', 'r', encoding='utf-8') as f:
    content = f.read()

# Replace STORY_DICTIONARIES
story_words_code = """
STORY_WORDS = [
    "Thor", "BMW", "India", "FIFA", "Nike", "RAM", "AI", "Anime", "Loki", "Tesla",
    "Japan", "Roblox", "Puma", "Linux", "Hacker", "Manga", "Audi", "Brazil", "Apex", "Jordan",
    "Python", "Meme", "Superman", "Dodge", "Canada", "Cricket", "Reebok", "Server", "Startup", "Discord",
    "Wolverine", "Skyline", "Germany", "Minecraft", "Adidas", "Frontend", "Cyberpunk", "Streaming", "BlackPanther", "Lamborghini",
    "Australia", "RocketLeague", "UnderArmour", "MachineLearning", "NeuralNetwork", "FormulaOne", "CounterStrike", "JavaScript", "Koenigsegg", "LeagueOfLegends"
]
"""

content = re.sub(r'STORY_DICTIONARIES = \{[^}]+\}', story_words_code, content)

# Replace MP_WORDS_EASY etc
mp_words_code = """
MP_WORDS = [
    "Flash", "Honda", "China", "RocketLeague", "Champion", "Cloud", "Crypto", "Netflix", "Ironman", "Porsche",
    "Italy", "LeagueOfLegends", "Converse", "VSCode", "Firewall", "Drone", "Avengers", "Jaguar", "Dubai", "FormulaOne",
    "Ryzen", "Compiler", "Hawkeye", "Bentley", "Argentina", "Minecraft", "Nvidia", "Terminal", "Encryption", "Streaming",
    "GreenLantern", "Maserati", "Switzerland", "CounterStrike", "KaliLinux", "Database", "Algorithm", "Cyberpunk", "Spiderman", "Supra",
    "USA", "Apex", "NodeJS", "Esports", "Discord", "TensorFlow", "JavaScript", "MachineLearning", "NeuralNetwork", "CounterStrike"
]
"""
content = re.sub(r'MP_WORDS_EASY = \[.*?MP_WORDS_EXPERT = \[.*?\]', mp_words_code, content, flags=re.DOTALL)

# Add shared encryption logic before `get_story_mission`
shared_logic = """
def apply_caesar(s: str, shift: int) -> str:
    res = []
    for c in s:
        if 'A' <= c <= 'Z':
            res.append(chr(((ord(c) - 65 + shift) % 26) + 65))
        else:
            res.append(c)
    return "".join(res)

def generate_cipher(plaintext: str, m_type: str):
    plaintext = plaintext.upper()
    expected = ""
    rule = ""
    mapping = None

    if m_type == 'reverse':
        expected = plaintext[::-1]
        rule = "REVERSE STRING"
    elif m_type == 'caesar':
        shift = random.randint(1, 25)
        expected = apply_caesar(plaintext, shift)
        rule = f"SHIFT +{shift}"
    elif m_type == 'atbash':
        expected = "".join(chr(90 - (ord(c) - 65)) if 'A' <= c <= 'Z' else c for c in plaintext)
        rule = "ATBASH (A=Z, B=Y, C=X, ...)"
    elif m_type == 'monoalphabetic':
        available = list("ABCDEFGHIJKLMNOPQRSTUVWXYZ")
        shuffled = list(available)
        random.shuffle(shuffled)
        mapping = {available[i]: shuffled[i] for i in range(26)}
        expected = "".join(mapping.get(c, c) for c in plaintext)
        full_map = ", ".join(f"{k}={v}" for k, v in mapping.items())
        rule = f"RANDOM SUB ({full_map})"
    elif m_type == 'fixed-number':
        def char_to_num(c):
            if '0' <= c <= '9': return ord(c) - 48
            if 'a' <= c <= 'z': return ord(c) - 97 + 10
            if 'A' <= c <= 'Z': return ord(c) - 65 + 36
            if c == '.': return 62
            if c == '?': return 63
            if c == '!': return 64
            if c == ',': return 65
            return -1
        expected = "-".join(str(char_to_num(c)) for c in plaintext)
        rule = "FIXED NUMBER ENCODING (0-9→0-9, a-z→10-35, A-Z→36-61, .?!,→62-65) SEPARATE WITH HYPHEN"
    elif m_type == 'reverse-caesar':
        shift = random.randint(1, 25)
        expected = apply_caesar(plaintext[::-1], shift)
        rule = f"REVERSE THEN SHIFT +{shift}"
    elif m_type == 'alternating':
        s1 = random.randint(1, 10)
        s2 = -random.randint(1, 10)
        expected = "".join(apply_caesar(plaintext[i], s1 if i % 2 == 0 else s2) for i in range(len(plaintext)))
        rule = f"ALTERNATING SHIFTS: even positions +{s1}, odd positions {s2}"
    elif m_type == 'positional':
        expected = "".join(apply_caesar(plaintext[i], i + 1) for i in range(len(plaintext)))
        rule = "POSITIONAL SHIFT: char at index i shifts by (i+1)"
    elif m_type == 'vowel-scrambler':
        v = {'A':'1', 'E':'2', 'I':'3', 'O':'4', 'U':'5'}
        expected = "".join(v.get(c, c) for c in plaintext)
        rule = "VOWELS → NUMBERS (A=1, E=2, I=3, O=4, U=5), CONSONANTS UNCHANGED"
    elif m_type == 'keyed-substitution':
        keys = ["CIPHER", "NEXUS", "MATRIX", "STEALTH", "GHOST"]
        key = random.choice(keys)
        alpha = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"
        seen = set()
        keyed_alpha = []
        for char in (key + alpha):
            if char not in seen:
                seen.add(char)
                keyed_alpha.append(char)
        keyed_alpha = "".join(keyed_alpha)
        mapping_dict = {alpha[i]: keyed_alpha[i] for i in range(26)}
        expected = "".join(mapping_dict.get(c, c) for c in plaintext)
        rule = f"KEYED SUB (KEY={key}): A-Z maps to {keyed_alpha}"
    elif m_type == 'modular-shift':
        shift = random.randint(1, 25)
        expected = apply_caesar(plaintext, shift)
        rule = f"MODULAR SHIFT: (alphabet_index + {shift}) mod 26"
    elif m_type == 'vigenere':
        keys = ["NEO", "TRINITY", "MORPHEUS", "SMITH"]
        key = random.choice(keys)
        expected = "".join(apply_caesar(c, ord(key[i % len(key)]) - 65) if 'A' <= c <= 'Z' else c for i, c in enumerate(plaintext))
        rule = f"VIGENERE (KEY={key}): each char shifts by key[i % keyLen] index"
    elif m_type == 'affine':
        as_list = [3, 5, 7, 9, 11, 15, 17, 19, 21, 23, 25]
        a = random.choice(as_list)
        b = random.randint(1, 25)
        expected = "".join(chr(((a * (ord(c) - 65) + b) % 26) + 65) if 'A' <= c <= 'Z' else c for c in plaintext)
        rule = f"AFFINE: ({a} * alphabet_index + {b}) mod 26"
    elif m_type == 'permutation':
        expected = "".join(plaintext[i] for i in range(len(plaintext)) if i % 2 == 0) + "".join(plaintext[i] for i in range(len(plaintext)) if i % 2 != 0)
        rule = "PERMUTATION: all even-index chars first, then all odd-index chars"
    elif m_type == 'blocked-rotate':
        word_key = "CAT"
        bs = 3
        res = ""
        for i in range(0, len(plaintext), bs):
            block = plaintext[i:i+bs][::-1]
            for j in range(len(block)):
                key_shift = ord(word_key[j % len(word_key)]) - 65
                res += apply_caesar(block[j], key_shift)
        expected = res
        rule = f"BLOCKED ROTATE: split into blocks of {bs}, REVERSE each block, then shift each char by corresponding key letter (KEY={word_key}, cycles within each block)"
    elif m_type == 'pairing':
        res = ""
        for i in range(0, len(plaintext), 2):
            if i + 1 < len(plaintext):
                v1 = ord(plaintext[i]) - 65
                v2 = ord(plaintext[i+1]) - 65
                res += chr(((v1 + v2) % 26) + 65)
                res += chr(((v1 * v2) % 26) + 65)
            else:
                res += plaintext[i]
        expected = res
        rule = "PAIRING: consecutive pairs (a,b) → (a+b mod 26)(a*b mod 26); last char alone if odd length"
    elif m_type == 'rotate-add':
        rev = plaintext[::-1]
        expected = "".join(apply_caesar(plaintext[i], ord(rev[i]) - 65) for i in range(len(plaintext)))
        rule = "ROTATE-ADD: shift plaintext[i] by value of reversed[i] (A=0, B=1, ...)"
    elif m_type == 'encrypt-additively':
        shifts = [1, 3, 5, 7]
        expected = "".join(apply_caesar(plaintext[i], shifts[i % len(shifts)]) for i in range(len(plaintext)))[::-1]
        rule = "ENCRYPT ADDITIVELY: shift each char by (+1,+3,+5,+7 repeating), then REVERSE the entire result"
    elif m_type == 'mini-rsa':
        small_primes = [3, 5, 7, 11, 13, 17, 19, 23]
        valid_combos = []
        for pi in small_primes:
            for qi in small_primes:
                if pi >= qi: continue
                ni = pi * qi
                phii = (pi - 1) * (qi - 1)
                for ei in [3, 5, 7]:
                    if phii % ei == 0: continue
                    di = -1
                    for k in range(1, phii):
                        if (ei * k) % phii == 1:
                            di = k
                            break
                    if di > 0:
                        valid_combos.append({"p": pi, "q": qi, "e": ei, "d": di, "n": ni})
        picked = random.choice(valid_combos)
        p, q, e, d, n = picked["p"], picked["q"], picked["e"], picked["d"], picked["n"]
        rule = f"MINI RSA: p={p}, q={q}, n=p*q={n}, e={e}, d={d}. Encrypt: y = (x^{e}) mod {n} where x = letter index (A=0...). If result ≥ 26 keep as number, else convert back to letter."
        res = []
        for c in plaintext:
            if 'A' <= c <= 'Z':
                x = ord(c) - 65
                y = pow(x, e, n)
                res.append(chr(y + 65) if y < 26 else str(y))
            else:
                res.append(c)
        expected = "-".join(res)
    elif m_type == 'merkle':
        def hash_two(a, b): return (a * 3 + b * 7) % 26
        leaves = [ord(c) - 65 for c in plaintext]
        size = 1
        while size < len(leaves): size *= 2
        while len(leaves) < size: leaves.append(0)
        level_nodes = leaves[:]
        while len(level_nodes) > 1:
            next_level = []
            for i in range(0, len(level_nodes), 2):
                next_level.append(hash_two(level_nodes[i], level_nodes[i+1]))
            level_nodes = next_level
        root = level_nodes[0]
        expected = chr(root + 65)
        rule = "MINI MERKLE TREE: each letter is a leaf (A=0, B=1...). Pad to next power of 2 with A. Combine pairs: hash(a,b) = (a*3 + b*7) mod 26, repeat until 1 root. Output is the root letter."
    else:
        expected = plaintext[::-1]
        rule = "REVERSE STRING"

    return expected, rule, mapping

@app.route("/api/story/mission/<mission_id>")
"""

content = re.sub(r'@app\.route\("/api/story/mission/<mission_id>"\)', shared_logic, content)


# Rewrite get_story_mission
story_mission_code = """def get_story_mission(mission_id):
    mission_type_map = {
        '1-1': 'reverse', '1-2': 'caesar', '1-3': 'atbash', '1-4': 'monoalphabetic', '1-5': 'fixed-number',
        '2-1': 'reverse-caesar', '2-2': 'alternating', '2-3': 'positional', '2-4': 'vowel-scrambler', '2-5': 'keyed-substitution',
        '3-1': 'modular-shift', '3-2': 'vignere', '3-3': 'affine', '3-4': 'permutation', '3-5': 'blocked-rotate',
        '4-1': 'pairing', '4-2': 'rotate-add', '4-3': 'encrypt-additively', '4-4': 'mini-rsa', '4-5': 'merkle'
    }
    m_type = mission_type_map.get(mission_id, 'reverse')
    
    uid = request.session_user["uid"]
    profile = get_db().collection("users").document(uid).get().to_dict() or {}
    story_data = profile.get("storyData", {})
    used_words = story_data.get("usedWords", [])
    
    available_words = [w for w in STORY_WORDS if w.upper() not in used_words]
    if not available_words:
        available_words = STORY_WORDS  # Fallback if all used
        
    plaintext = random.choice(available_words).upper()
    
    # Save the used word so it doesn't repeat
    used_words.append(plaintext)
    story_data["usedWords"] = used_words
    get_db().collection("users").document(uid).update({"storyData": story_data})
    
    expected, rule, mapping = generate_cipher(plaintext, m_type)

    return jsonify({
        "plaintext": plaintext,
        "expectedCiphertext": expected,
        "rule": rule,
        "fullMapping": mapping if m_type == 'monoalphabetic' else None
    })
"""

content = re.sub(r'def get_story_mission\(mission_id\):.*?(?=@app\.route\("/api/story/hint", methods=\["POST"\]\))', story_mission_code + '\n\n', content, flags=re.DOTALL)


# Remove the old _caesar etc functions
content = re.sub(r'def _pick_word.*?def generate_mp_question\(level, used_words=None\):', r'def generate_mp_question(level, used_words=None):', content, flags=re.DOTALL)
content = re.sub(r'def _pick_word.*?def generate_mp_question\(level\):', r'def generate_mp_question(level, used_words=None):', content, flags=re.DOTALL)


# Rewrite generate_mp_question
mp_question_code = """def generate_mp_question(level, used_words=None):
    if used_words is None:
        used_words = []
    
    available = [w for w in MP_WORDS if w.upper() not in used_words]
    if not available:
        available = MP_WORDS
    
    plaintext = random.choice(available).upper()
    
    if level <= 2:
        m_type = random.choice(['reverse', 'caesar', 'atbash', 'monoalphabetic', 'fixed-number'])
        xp = 15
    elif level <= 4:
        m_type = random.choice(['reverse-caesar', 'alternating', 'positional', 'vowel-scrambler', 'keyed-substitution'])
        xp = 25
    elif level <= 6:
        m_type = random.choice(['modular-shift', 'vigenere', 'affine', 'permutation', 'blocked-rotate'])
        xp = 35
    else:
        m_type = random.choice(['pairing', 'rotate-add', 'encrypt-additively', 'mini-rsa', 'merkle'])
        xp = 50
        
    enc, rule, mapping = generate_cipher(plaintext, m_type)
    return enc, plaintext, m_type, rule, xp
"""

content = re.sub(r'def generate_mp_question\(level, used_words=None\):.*?(?=# ── Multiplayer \(Firestore via Admin SDK\))', mp_question_code + '\n\n', content, flags=re.DOTALL)


with open('app.py', 'w', encoding='utf-8') as f:
    f.write(content)
