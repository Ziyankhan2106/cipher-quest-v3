import os
import traceback

import json
import secrets
import time
import functools
import random
import math
import string

from flask import (
    Flask,
    request,
    jsonify,
    redirect,
    send_from_directory,
    make_response,
)
from google import genai
from google.cloud.firestore import FieldFilter
from dotenv import load_dotenv
import firebase_admin
from firebase_admin import credentials, firestore, auth as fb_auth

# ── Config ────────────────────────────────────────────────────────────────────

load_dotenv()

app = Flask(__name__, static_folder=None)

PORT = int(os.getenv("PORT", 5000))
SESSION_COOKIE = "cq_session"
SESSION_TTL_S = 60 * 60 * 24 * 7  # 7 days
IS_PROD = os.getenv("NODE_ENV", "development") == "production"

# ── Firebase Admin init ───────────────────────────────────────────────────────

firebase_ready = False
_db = None


def _get_service_account():
    raw = os.getenv("FIREBASE_SERVICE_ACCOUNT_JSON")
    if not raw:
        return None
    try:
        sa = json.loads(raw)
        if "private_key" in sa:
            sa["private_key"] = sa["private_key"].replace("\\n", "\n")
        return sa
    except json.JSONDecodeError as exc:
        print(f"Invalid FIREBASE_SERVICE_ACCOUNT_JSON: {exc}")
        return None


def _init_firebase():
    global firebase_ready, _db
    sa = _get_service_account()
    if sa is None:
        print("Firebase Admin is not configured. Auth APIs will return errors.")
        return
    try:
        cred = credentials.Certificate(sa)
        firebase_admin.initialize_app(cred)
        _db = firestore.client()
        firebase_ready = True
        print("Firebase Admin initialized successfully.")
    except Exception as exc:
        print(f"Firebase Admin init failed: {exc}")


_init_firebase()


def get_db():
    return _db


# ── AI Init ──────────────────────────────────────────────────────────────────

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
ai_client = None
if GEMINI_API_KEY:
    try:
        ai_client = genai.Client(api_key=GEMINI_API_KEY)
    except Exception as e:
        print(f"AI Client init failed: {e}")


# ── Session helpers ───────────────────────────────────────────────────────────


def _create_session(uid: str):
    token = secrets.token_hex(48)
    expires_at = int(time.time() * 1000) + SESSION_TTL_S * 1000
    get_db().collection("sessions").document(token).set(
        {
            "uid": uid,
            "expiresAt": expires_at,
            "createdAt": firestore.SERVER_TIMESTAMP,
        }
    )
    return token, expires_at


def _delete_session(token: str):
    if not token:
        return
    try:
        get_db().collection("sessions").document(token).delete()
    except Exception:
        pass


# ── Caching ───────────────────────────────────────────────────────────────────

# Simple in-memory cache to prevent quota exhaustion
_session_cache = {}  # { token: { data: ..., expires: ... } }
_user_cache = {}     # { uid: { data: ..., expires: ... } }
_username_cache = {} # { username_lower: { available: bool, expires: ... } }
CACHE_TTL = 60       # Cache for 60 seconds to reduce quota pressure
USERNAME_CACHE_TTL = 300  # Cache username checks for 5 minutes

def _get_session_user(req):
    if not firebase_ready:
        return None
    token = req.cookies.get(SESSION_COOKIE)
    if not token:
        return None
    
    now = time.time()
    
    # 1. Check session cache
    session = None
    if token in _session_cache:
        cached = _session_cache[token]
        if now < cached["expires"]:
            session = cached["data"]
        else:
            del _session_cache[token]

    if not session:
        try:
            snap = get_db().collection("sessions").document(token).get()
            if not snap.exists:
                return None
            session = snap.to_dict()
            _session_cache[token] = {"data": session, "expires": now + CACHE_TTL}
        except Exception as e:
            print(f"--- SESSION FETCH ERROR ---")
            print(f"Error Type: {type(e)}")
            print(f"Error Message: {str(e)}")
            # traceback.print_exc() 
            return None

    uid = session.get("uid")
    expires_at = session.get("expiresAt")
    if not uid or not expires_at or expires_at < int(now * 1000):
        _delete_session(token)
        if token in _session_cache: del _session_cache[token]
        return None

    # 2. Check user cache
    profile = None
    if uid in _user_cache:
        cached = _user_cache[uid]
        if now < cached["expires"]:
            profile = cached["data"]
        else:
            del _user_cache[uid]

    if not profile:
        try:
            user_doc = get_db().collection("users").document(uid).get()
            if not user_doc.exists:
                return None
            profile = user_doc.to_dict()
            _user_cache[uid] = {"data": profile, "expires": now + CACHE_TTL}
        except Exception as e:
            print(f"--- USER FETCH ERROR ---")
            print(f"Error Type: {type(e)}")
            print(f"Error Message: {str(e)}")
            return None

    return {
        "uid": uid,
        "sessionToken": token,
        "profile": profile,
    }


def _set_session_cookie(resp, token, expires_at):
    max_age = max(0, int((expires_at - int(time.time() * 1000)) / 1000))
    resp.set_cookie(
        SESSION_COOKIE,
        token,
        max_age=max_age,
        httponly=True,
        samesite="Lax",
        secure=IS_PROD,
    )


def _clear_session_cookie(resp):
    resp.delete_cookie(SESSION_COOKIE, samesite="Lax", secure=IS_PROD)


# ── Validation ────────────────────────────────────────────────────────────────

import re

_USERNAME_RE = re.compile(r"^[a-zA-Z0-9_ ]{3,24}$")


def _validate_username(username):
    return isinstance(username, str) and _USERNAME_RE.match(username.strip())


# ── Auth-required decorator ───────────────────────────────────────────────────


def require_auth(fn):
    @functools.wraps(fn)
    def wrapper(*args, **kwargs):
        session_user = _get_session_user(request)
        if not session_user:
            return jsonify({"error": "Unauthorized"}), 401
        request.session_user = session_user
        return fn(*args, **kwargs)

    return wrapper


# ── Static file serving ──────────────────────────────────────────────────────

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CIPHERLAB_DIST = os.path.join(BASE_DIR, "dist")


@app.route("/assets/<path:filename>")
def serve_assets(filename):
    # Try React build assets first
    dist_assets = os.path.join(CIPHERLAB_DIST, "assets")
    if os.path.exists(os.path.join(dist_assets, filename)):
        return send_from_directory(dist_assets, filename)
    # Fall back to main assets
    return send_from_directory(os.path.join(BASE_DIR, "assets"), filename)


@app.route("/styles.css")
def serve_styles():
    return send_from_directory(BASE_DIR, "styles.css")


@app.route("/multiplayer/multiplayer.css")
def serve_mp_styles():
    return send_from_directory(MULTIPLAYER_DIR, "multiplayer.css")


# ── Page routes ───────────────────────────────────────────────────────────────


@app.route("/")
@app.route("/account")
@app.route("/dashboard")
@app.route("/multiplayer")
@app.route("/cipherlab")
def react_routes():
    # Let React handle routing and auth redirects
    return send_from_directory(CIPHERLAB_DIST, "index.html")


@app.route("/training")
def training_redirect():
    return redirect("/training/")


@app.route("/training/")
@app.route("/training/<path:filename>")
def serve_training(filename="index.html"):
    return send_from_directory(os.path.join(BASE_DIR, "training_academy"), filename)


# ── Auth API ──────────────────────────────────────────────────────────────────


@app.route("/api/auth/status")
def auth_status():
    session_user = _get_session_user(request)
    if not session_user:
        return jsonify({"authenticated": False})
    return jsonify({"authenticated": True, "profile": session_user["profile"]})


@app.route("/api/auth/check-username")
def check_username():
    """Check if a username is already taken."""
    if not firebase_ready:
        return jsonify({"error": "Server not configured."}), 500

    username = request.args.get("username", "").strip().lower()
    if not username or not _validate_username(username):
        return jsonify({"available": False, "reason": "Invalid username."}), 400

    now = time.time()
    
    # Check cache first
    if username in _username_cache:
        cached = _username_cache[username]
        if now < cached["expires"]:
            return jsonify({"available": cached["available"], "username": username, "cached": True})
        else:
            del _username_cache[username]

    try:
        # Query users collection for matching username (case-insensitive)
        # Use filter keyword argument instead of positional args to avoid warnings
        from google.cloud.firestore import FieldFilter
        users_ref = get_db().collection("users")
        query = users_ref.where(filter=FieldFilter("usernameLower", "==", username)).limit(1).stream()
        taken = len(list(query)) > 0
        available = not taken
        
        # Cache the result
        _username_cache[username] = {"available": available, "expires": now + USERNAME_CACHE_TTL}
        
        return jsonify({"available": available, "username": username})
    except Exception as e:
        print(f"Username check error: {e}")
        # On quota error, still cache the result briefly
        if "429" in str(e) or "ResourceExhausted" in str(type(e).__name__):
            available = _username_cache.get(username, {}).get("available", True)
            return jsonify({"available": available, "username": username, "quotaLimited": True}), 429
        return jsonify({"error": "Username check failed."}), 500


@app.route("/api/auth/register", methods=["POST"])
def auth_register():
    if not firebase_ready:
        return (
            jsonify(
                {
                    "error": "Server auth is not configured. Add FIREBASE_SERVICE_ACCOUNT_JSON."
                }
            ),
            500,
        )

    data = request.get_json(silent=True) or {}
    id_token = data.get("idToken")
    username = data.get("username", "")

    if not id_token or not _validate_username(username):
        return jsonify({"error": "Invalid token or username."}), 400

    try:
        decoded = fb_auth.verify_id_token(id_token, clock_skew_seconds=60)
        uid = decoded["uid"]
        user_ref = get_db().collection("users").document(uid)
        existing = user_ref.get()
        if existing.exists:
            return jsonify({"error": "Account already exists. Please log in."}), 409

        # Check username uniqueness before creating account
        username_clean = username.strip()
        username_lower = username_clean.lower()
        
        # Check cache first
        now = time.time()
        if username_lower in _username_cache:
            cached = _username_cache[username_lower]
            if now < cached["expires"]:
                if not cached["available"]:
                    return jsonify({"error": "Username is already taken."}), 409
            else:
                del _username_cache[username_lower]
        
        try:
            from google.cloud.firestore import FieldFilter
            dup_query = (
                get_db()
                .collection("users")
                .where(filter=FieldFilter("usernameLower", "==", username_lower))
                .limit(1)
                .stream()
            )
            dup_exists = len(list(dup_query)) > 0
            _username_cache[username_lower] = {"available": not dup_exists, "expires": now + USERNAME_CACHE_TTL}
            if dup_exists:
                return jsonify({"error": "Username is already taken."}), 409
        except Exception as e:
            print(f"Duplicate check error: {e}")
            if "429" in str(e) or "ResourceExhausted" in str(type(e).__name__):
                return jsonify({"error": "Server temporarily overloaded. Please try again."}), 429
            raise

        profile = {
            "uid": uid,
            "username": username_clean,
            "usernameLower": username_lower,
            "email": decoded.get("email"),
            "xp": 0,
            "level": 1,
            "gameData": {
                "tutorialStepIndex": 0,
                "tutorialFinished": False,
            },
            "createdAt": firestore.SERVER_TIMESTAMP,
            "updatedAt": firestore.SERVER_TIMESTAMP,
        }
        user_ref.set(profile)

        token, expires_at = _create_session(uid)
        resp = make_response(jsonify({"ok": True, "isNewUser": True}))
        _set_session_cookie(resp, token, expires_at)
        return resp

    except Exception as exc:
        print(f"Register failed: {exc}")
        return jsonify({"error": "Registration failed."}), 401


@app.route("/api/auth/login", methods=["POST"])
def auth_login():
    if not firebase_ready:
        return (
            jsonify(
                {
                    "error": "Server auth is not configured. Add FIREBASE_SERVICE_ACCOUNT_JSON."
                }
            ),
            500,
        )

    data = request.get_json(silent=True) or {}
    id_token = data.get("idToken")

    if not id_token:
        return jsonify({"error": "Missing idToken."}), 400

    try:
        decoded = fb_auth.verify_id_token(id_token, clock_skew_seconds=60)
        uid = decoded["uid"]
        user_ref = get_db().collection("users").document(uid)
        existing = user_ref.get()
        if not existing.exists:
            email = decoded.get("email")
            base_name = (decoded.get("name") or (email.split("@")[0] if email else uid[:8]) or uid[:8]).strip()
            username = "".join(ch for ch in base_name if ch.isalnum() or ch in ["_", " "]).strip()
            if len(username) < 3:
                username = f"User_{uid[:8]}"

            profile = {
                "uid": uid,
                "username": username[:24],
                "usernameLower": username[:24].lower(),
                "email": email,
                "xp": 0,
                "level": 1,
                "gameData": {
                    "tutorialStepIndex": 0,
                    "tutorialFinished": False,
                },
                "createdAt": firestore.SERVER_TIMESTAMP,
                "updatedAt": firestore.SERVER_TIMESTAMP,
            }
            user_ref.set(profile)

        token, expires_at = _create_session(uid)
        resp = make_response(jsonify({"ok": True}))
        _set_session_cookie(resp, token, expires_at)
        return resp

    except Exception as exc:
        print(f"Login failed: {exc}")
        return jsonify({"error": "Login failed."}), 401


@app.route("/api/auth/logout", methods=["POST"])
@require_auth
def auth_logout():
    _delete_session(request.session_user["sessionToken"])
    resp = make_response(jsonify({"ok": True}))
    _clear_session_cookie(resp)
    return resp


# ── Story Mode API ────────────────────────────────────────────────────────────


STORY_WORDS = [
    "Thor", "BMW", "India", "FIFA", "Nike", "RAM", "AI", "Anime", "Loki", "Tesla",
    "Japan", "Roblox", "Puma", "Linux", "Hacker", "Manga", "Audi", "Brazil", "Apex", "Jordan",
    "Python", "Meme", "Superman", "Dodge", "Canada", "Cricket", "Reebok", "Server", "Startup", "Discord",
    "Wolverine", "Skyline", "Germany", "Minecraft", "Adidas", "Frontend", "Cyberpunk", "Streaming", "BlackPanther", "Lamborghini",
    "Australia", "RocketLeague", "UnderArmour", "MachineLearning", "NeuralNetwork", "FormulaOne", "CounterStrike", "JavaScript", "Koenigsegg", "LeagueOfLegends"
]



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

@require_auth
def get_story_mission(mission_id):
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


@app.route("/api/story/hint", methods=["POST"])
@require_auth
def get_story_hint():
    if not ai_client:
        return jsonify({"hints": ["AI integration not configured. Set GEMINI_API_KEY in .env"]})
        
    data = request.json
    plaintext = data.get("plaintext")
    expected = data.get("expectedCiphertext")
    rule = data.get("rule")
    user_input = data.get("userInput", "")

    prompt = f"""You are a helpful AI guide for a cryptography game.
The current plaintext is: "{plaintext}".
The target ciphertext should be: "{expected}".
The encryption rule parameter is: "{rule}".
The user attempted the answer: "{user_input}" and failed.

Analyze their input and provide 4 hints as a JSON array of strings.
Hint 1: General rule explanation.
Hint 2: Logic for the first character.
Hint 3: Analysis of user's mistake.
Hint 4: Strong concluding tip.
Return ONLY a JSON array of strings."""

    try:
        response = ai_client.models.generate_content(
            model="gemini-3.1-flash-lite",
            contents=prompt,`
            config={"response_mime_type": "application/json"}
        )
        hints = json.loads(response.text)
        return jsonify({"hints": hints})
    except Exception as e:
        print(f"AI Error: {e}")
        return jsonify({"hints": ["Failed to connect to Neural Network.", "Try checking the basics.", "Wait for signal clarity."]})

@app.route("/api/story/complete-mission", methods=["POST"])
@require_auth
def complete_story_mission():
    data = request.json
    mission_id = data.get("missionId")
    if not mission_id:
        return jsonify({"error": "Missing missionId"}), 400
    
    uid = request.session_user["uid"]
    user_ref = get_db().collection("users").document(uid)
    doc = user_ref.get()
    
    if not doc.exists:
        return jsonify({"error": "User not found"}), 404
    
    profile = doc.to_dict()
    story_data = profile.get("storyData", {})
    completed = story_data.get("completedMissions", [])
    
    if mission_id not in completed:
        completed.append(mission_id)
        story_data["completedMissions"] = completed
        
        # Check if chapter is completed
        # Simple logic: if mission ends in -5, it's a chapter end (based on game-data.ts)
        if mission_id.endswith("-5"):
            # Award 100 XP
            new_xp, new_level, old_level = _update_user_xp(uid, 100)
            return jsonify({
                "ok": True, 
                "xp": new_xp, 
                "level": new_level, 
                "oldLevel": old_level,
                "chapterComplete": True,
                "message": "Sector Decoded! +100 XP awarded."
            })
        
        user_ref.update({"storyData": story_data, "updatedAt": firestore.SERVER_TIMESTAMP})
        
    return jsonify({"ok": True})

@app.route("/api/story/profile")
@require_auth
def get_story_profile():
    uid = request.session_user["uid"]
    profile = request.session_user["profile"]
    username = profile.get("username", "Operative")
    
    story_data = profile.get("storyData", {
        "completedMissions": [],
        "earnedBadges": [],
        "avatarId": "cyan"
    })
    
    # Admin unlock logic
    if username.lower() == "admin":
        # Unlock all missions and badges
        all_missions = []
        for i in range(1, 5):
            for j in range(1, 6):
                all_missions.append(f"{i}-{j}")
        story_data["completedMissions"] = all_missions
        # Add badges if they exist in logic
        
    return jsonify({
        "operatorName": username,
        "storyData": story_data
    })


# ── User API ──────────────────────────────────────────────────────────────────


@app.route("/api/me")
@require_auth
def get_me():
    profile = dict(request.session_user["profile"])
    # Ensure xp and level fields exist (backfill for existing users)
    if "xp" not in profile:
        profile["xp"] = 0
    if "level" not in profile:
        profile["level"] = _xp_to_level(int(profile.get("xp", 0)))
    return jsonify(
        {
            "uid": request.session_user["uid"],
            "profile": profile,
        }
    )


@app.route("/api/me/progress", methods=["PATCH"])
@require_auth
def update_progress():
    data = request.get_json(silent=True) or {}
    payload = {}

    step = data.get("tutorialStepIndex")
    finished = data.get("tutorialFinished")

    if isinstance(step, int):
        payload["gameData.tutorialStepIndex"] = step
    if isinstance(finished, bool):
        payload["gameData.tutorialFinished"] = finished

    if not payload:
        return jsonify({"error": "No valid progress fields provided."}), 400

    payload["updatedAt"] = firestore.SERVER_TIMESTAMP
    get_db().collection("users").document(request.session_user["uid"]).set(
        payload, merge=True
    )
    # Invalidate cache
    if request.session_user["uid"] in _user_cache:
        del _user_cache[request.session_user["uid"]]
    return jsonify({"ok": True})


# ── XP / Level helpers ──────────────────────────────────────────────────────

RANK_NAMES = {
    1: "Recruit", 2: "Guard", 3: "Scout", 4: "Soldier",
    5: "Veteran", 6: "Elite", 7: "Captain", 8: "Hero",
}

def _xp_to_level(xp: int) -> int:
    return min(8, max(1, (xp // 100) + 1))

def _update_user_xp(uid: str, delta: int):
    """Atomically add delta to user XP, clamp at 0, recompute level. Returns (new_xp, new_level, old_level)."""
    user_ref = get_db().collection("users").document(uid)
    doc = user_ref.get()
    if not doc.exists:
        return 0, 1, 1
    data = doc.to_dict() or {}
    old_xp = int(data.get("xp") or 0)
    old_level = _xp_to_level(old_xp)
    new_xp = max(0, old_xp + delta)
    new_level = _xp_to_level(new_xp)
    user_ref.update({"xp": new_xp, "level": new_level, "updatedAt": firestore.SERVER_TIMESTAMP})
    # Invalidate cache
    if uid in _user_cache:
        del _user_cache[uid]
    return new_xp, new_level, old_level


@app.route("/api/me/xp", methods=["PATCH"])
@require_auth
def update_xp():
    data = request.get_json(silent=True) or {}
    delta = data.get("delta")
    if not isinstance(delta, int):
        return jsonify({"error": "Missing integer delta."}), 400
    uid = request.session_user["uid"]
    new_xp, new_level, old_level = _update_user_xp(uid, delta)
    return jsonify({"ok": True, "xp": new_xp, "level": new_level, "oldLevel": old_level,
                    "rank": RANK_NAMES.get(new_level, "Recruit")})


# ── Multiplayer cipher question engine ──────────────────────────────────────

ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"


MP_WORDS = [
    "Flash", "Honda", "China", "RocketLeague", "Champion", "Cloud", "Crypto", "Netflix", "Ironman", "Porsche",
    "Italy", "LeagueOfLegends", "Converse", "VSCode", "Firewall", "Drone", "Avengers", "Jaguar", "Dubai", "FormulaOne",
    "Ryzen", "Compiler", "Hawkeye", "Bentley", "Argentina", "Minecraft", "Nvidia", "Terminal", "Encryption", "Streaming",
    "GreenLantern", "Maserati", "Switzerland", "CounterStrike", "KaliLinux", "Database", "Algorithm", "Cyberpunk", "Spiderman", "Supra",
    "USA", "Apex", "NodeJS", "Esports", "Discord", "TensorFlow", "JavaScript", "MachineLearning", "NeuralNetwork", "CounterStrike"
]


def generate_mp_question(level, used_words=None):
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


# ── Multiplayer (Firestore via Admin SDK) ───────────────────────────────────


MULTIPLAYER_DIR = os.path.join(BASE_DIR, "multiplayer")


def _mp_public_match_dict(mid: str, data: dict, viewer_uid: str):
    """Strip sensitive fields; shape for JSON."""
    if not data:
        return None
    uids = data.get("uids") or []
    answers = data.get("answers") or {}
    out = {
        "matchId": mid,
        "question": data.get("question"),
        "cipherType": data.get("cipherType"),
        "cipherHint": data.get("cipherHint"),
        "xpReward": data.get("xpReward", 0),
        "status": data.get("status"),
        "uids": uids,
        "usernames": data.get("usernames") or {},
        "startAt": data.get("startAt"),
        "winnerUid": data.get("winnerUid"),
        "loserUid": data.get("loserUid"),
        "resultReason": data.get("resultReason"),
        "matchFormat": data.get("matchFormat", 1),
        "targetScore": data.get("targetScore", 1),
        "scores": data.get("scores") or {},
        "currentRound": data.get("currentRound", 1),
        "myAnswered": viewer_uid in answers,
        "opponentAnswered": any(u != viewer_uid for u in answers.keys()),
        "answersCount": len(answers),
    }
    if data.get("status") == "done":
        out["answers"] = answers
    return out


def _mp_resolve_match(match: dict):
    """Resolve match: first correct answer wins. Called when both answered or one is correct."""
    answers = match.get("answers") or {}
    uids = match.get("uids") or []

    correct_players = []
    for uid, row in answers.items():
        if row.get("correct"):
            correct_players.append((uid, int(row.get("submittedAt", 999999999))))

    if len(answers) >= 2 and not correct_players:
        return None, None, "none_correct"

    if correct_players:
        correct_players.sort(key=lambda x: x[1])
        winner = correct_players[0][0]
        loser = [u for u in uids if u != winner]
        loser = loser[0] if loser else None
        return winner, loser, "resolved"

    return None, None, "waiting"




@app.route("/api/multiplayer/search", methods=["GET"])
@require_auth
def mp_search_users():
    if not firebase_ready:
        return jsonify({"error": "Server not configured."}), 500

    q = (request.args.get("q") or "").strip().lower()
    if len(q) < 2:
        return jsonify({"users": []})

    my_uid = request.session_user["uid"]
    users_ref = get_db().collection("users")
    try:
        query = (
            users_ref.order_by("usernameLower")
            .start_at(q)
            .end_at(q + "\uf8ff")
            .limit(15)
        )
        found = []
        for doc in query.stream():
            if doc.id == my_uid:
                continue
            d = doc.to_dict() or {}
            found.append(
                {"uid": doc.id, "username": d.get("username") or d.get("usernameLower", "")}
            )
            if len(found) >= 10:
                break
        return jsonify({"users": found})
    except Exception as exc:
        print(f"mp_search prefix failed: {exc}, falling back to exact match")
        snap = users_ref.where("usernameLower", "==", q).limit(10).get()
        found = []
        for doc in snap:
            if doc.id == my_uid:
                continue
            d = doc.to_dict() or {}
            found.append(
                {"uid": doc.id, "username": d.get("username") or d.get("usernameLower", "")}
            )
        return jsonify({"users": found})


@app.route("/api/multiplayer/invite", methods=["POST"])
@require_auth
def mp_send_invite():
    if not firebase_ready:
        return jsonify({"error": "Server not configured."}), 500

    data = request.get_json(silent=True) or {}
    to_uid = data.get("toUid")
    if not isinstance(to_uid, str) or not to_uid:
        return jsonify({"error": "Missing toUid."}), 400

    my_uid = request.session_user["uid"]
    if to_uid == my_uid:
        return jsonify({"error": "Cannot invite yourself."}), 400

    to_doc = get_db().collection("users").document(to_uid).get()
    if not to_doc.exists:
        return jsonify({"error": "User not found."}), 404

    invites = get_db().collection("mp_invites")
    dup = (
        invites.where("fromUid", "==", my_uid)
        .where("toUid", "==", to_uid)
        .where("status", "==", "pending")
        .limit(1)
        .get()
    )
    if len(list(dup)) > 0:
        return jsonify({"error": "You already have a pending invite to this player."}), 409

    match_format = data.get("matchFormat", 1)
    if match_format not in [1, 3, 5]:
        match_format = 1

    me = request.session_user["profile"] or {}
    to_d = to_doc.to_dict() or {}
    ref = invites.document()
    ref.set(
        {
            "fromUid": my_uid,
            "fromUsername": me.get("username", "Operative"),
            "toUid": to_uid,
            "toUsername": to_d.get("username", "Operative"),
            "status": "pending",
            "matchFormat": match_format,
            "createdAt": firestore.SERVER_TIMESTAMP,
            "matchId": None,
        }
    )
    return jsonify({"ok": True, "inviteId": ref.id})


@app.route("/api/multiplayer/invites/incoming", methods=["GET"])
@require_auth
def mp_incoming_invites():
    if not firebase_ready:
        return jsonify({"error": "Server not configured."}), 500

    uid = request.session_user["uid"]
    snaps = (
        get_db()
        .collection("mp_invites")
        .where("toUid", "==", uid)
        .where("status", "==", "pending")
        .limit(20)
        .stream()
    )
    invites = []
    for doc in snaps:
        d = doc.to_dict() or {}
        invites.append(
            {
                "inviteId": doc.id,
                "fromUid": d.get("fromUid"),
                "fromUsername": d.get("fromUsername"),
                "matchFormat": d.get("matchFormat", 1),
                "createdAt": d.get("createdAt"),
            }
        )
    return jsonify({"invites": invites})


@app.route("/api/multiplayer/invites/outgoing", methods=["GET"])
@require_auth
def mp_outgoing_invites():
    if not firebase_ready:
        return jsonify({"error": "Server not configured."}), 500

    uid = request.session_user["uid"]
    snaps = (
        get_db()
        .collection("mp_invites")
        .where("fromUid", "==", uid)
        .limit(10)
        .stream()
    )
    invites = []
    for doc in snaps:
        d = doc.to_dict() or {}
        invites.append(
            {
                "inviteId": doc.id,
                "toUid": d.get("toUid"),
                "toUsername": d.get("toUsername"),
                "status": d.get("status"),
                "createdAt": d.get("createdAt"),
            }
        )
    return jsonify({"invites": invites})


@app.route("/api/multiplayer/invite/<invite_id>/clear", methods=["POST"])
@require_auth
def mp_clear_invite(invite_id):
    if not firebase_ready:
        return jsonify({"error": "Server not configured."}), 500

    my_uid = request.session_user["uid"]
    inv_ref = get_db().collection("mp_invites").document(invite_id)
    inv_snap = inv_ref.get()
    if not inv_snap.exists:
        return jsonify({"error": "Invite not found."}), 404

    inv = inv_snap.to_dict() or {}
    if inv.get("fromUid") != my_uid and inv.get("toUid") != my_uid:
        return jsonify({"error": "Unauthorized."}), 403

    inv_ref.delete()
    return jsonify({"ok": True})


@app.route("/api/multiplayer/invite/<invite_id>/accept", methods=["POST"])
@require_auth
def mp_accept_invite(invite_id):
    if not firebase_ready:
        return jsonify({"error": "Server not configured."}), 500

    my_uid = request.session_user["uid"]
    inv_ref = get_db().collection("mp_invites").document(invite_id)
    inv_snap = inv_ref.get()
    if not inv_snap.exists:
        return jsonify({"error": "Invite not found."}), 404

    inv = inv_snap.to_dict() or {}
    if inv.get("toUid") != my_uid:
        return jsonify({"error": "Not your invite."}), 403
    if inv.get("status") != "pending":
        return jsonify({"error": "Invite is no longer pending."}), 400

    from_uid = inv.get("fromUid")
    if not from_uid:
        return jsonify({"error": "Invalid invite."}), 400

    from_doc = get_db().collection("users").document(from_uid).get()
    my_doc = get_db().collection("users").document(my_uid).get()

    from_level = (from_doc.to_dict() or {}).get("level", 1) if from_doc.exists else 1
    my_level = (my_doc.to_dict() or {}).get("level", 1) if my_doc.exists else 1
    match_level = min(int(from_level), int(my_level))
    match_format = inv.get("matchFormat", 1)
    target_score = (match_format // 2) + 1

    enc_text, correct_answer, cipher_type, cipher_hint, xp_reward = generate_mp_question(match_level, [])

    start_at = int(time.time() * 1000)
    match_ref = get_db().collection("mp_matches").document()
    mid = match_ref.id

    batch = get_db().batch()
    batch.set(
        match_ref,
        {
            "inviteId": invite_id,
            "uids": [from_uid, my_uid],
            "usernames": {
                from_uid: inv.get("fromUsername", "?"),
                my_uid: inv.get("toUsername", "?"),
            },
            "question": enc_text,
            "correctAnswer": correct_answer,
            "cipherType": cipher_type,
            "cipherHint": cipher_hint,
            "xpReward": xp_reward,
            "matchLevel": match_level,
            "matchFormat": match_format,
            "targetScore": target_score,
            "scores": {from_uid: 0, my_uid: 0},
            "currentRound": 1,
            "usedWords": [correct_answer],
            "startAt": start_at,
            "answers": {},
            "status": "open",
            "winnerUid": None,
            "loserUid": None,
            "resultReason": None,
            "createdAt": firestore.SERVER_TIMESTAMP,
        },
    )
    batch.update(inv_ref, {"status": "accepted", "matchId": mid})
    batch.set(
        get_db().collection("mp_user_state").document(from_uid),
        {"activeMatchId": mid},
        merge=True,
    )
    batch.set(
        get_db().collection("mp_user_state").document(my_uid),
        {"activeMatchId": mid},
        merge=True,
    )
    batch.commit()
    
    # Fetch public dict for immediate response
    match_data = {
        "inviteId": invite_id,
        "uids": [from_uid, my_uid],
        "usernames": {
            from_uid: inv.get("fromUsername", "?"),
            my_uid: inv.get("toUsername", "?"),
        },
        "question": enc_text,
        "cipherType": cipher_type,
        "cipherHint": cipher_hint,
        "xpReward": xp_reward,
        "matchLevel": match_level,
        "startAt": start_at,
        "answers": {},
        "status": "open",
        "winnerUid": None,
        "loserUid": None,
        "resultReason": None,
    }

    return jsonify({"ok": True, "matchId": mid, "match": _mp_public_match_dict(mid, match_data, my_uid)})


@app.route("/api/multiplayer/invite/<invite_id>/decline", methods=["POST"])
@require_auth
def mp_decline_invite(invite_id):
    if not firebase_ready:
        return jsonify({"error": "Server not configured."}), 500

    my_uid = request.session_user["uid"]
    inv_ref = get_db().collection("mp_invites").document(invite_id)
    inv_snap = inv_ref.get()
    if not inv_snap.exists:
        return jsonify({"error": "Invite not found."}), 404

    inv = inv_snap.to_dict() or {}
    if inv.get("toUid") != my_uid and inv.get("fromUid") != my_uid:
        return jsonify({"error": "Not a party to this invite."}), 403
    if inv.get("status") != "pending":
        return jsonify({"error": "Invite is no longer pending."}), 400

    inv_ref.update({"status": "declined"})
    return jsonify({"ok": True})


@app.route("/api/multiplayer/active-match", methods=["GET"])
@require_auth
def mp_active_match():
    if not firebase_ready:
        return jsonify({"error": "Server not configured."}), 500

    my_uid = request.session_user["uid"]
    st = get_db().collection("mp_user_state").document(my_uid).get()
    if not st.exists:
        return jsonify({"match": None})

    mid = (st.to_dict() or {}).get("activeMatchId")
    if not mid:
        return jsonify({"match": None})

    mref = get_db().collection("mp_matches").document(mid)
    msnap = mref.get()
    if not msnap.exists:
        get_db().collection("mp_user_state").document(my_uid).update(
            {"activeMatchId": firestore.DELETE_FIELD}
        )
        return jsonify({"match": None})

    data = msnap.to_dict() or {}
    return jsonify({"match": _mp_public_match_dict(mid, data, my_uid)})


class MpAnswerError(Exception):
    def __init__(self, message, http_status=400):
        super().__init__(message)
        self.message = message
        self.http_status = http_status


@firestore.transactional
def _mp_submit_answer_txn(transaction, mref, match_id, my_uid, raw):
    now_ms = int(time.time() * 1000)
    snap = mref.get(transaction=transaction)
    if not snap.exists:
        raise MpAnswerError("Match not found.", 404)

    match = snap.to_dict() or {}
    if match.get("status") != "open":
        raise MpAnswerError("Match is already finished.", 400)

    uids = match.get("uids") or []
    if my_uid not in uids:
        raise MpAnswerError("You are not in this match.", 403)

    answers = dict(match.get("answers") or {})
    if my_uid in answers:
        raise MpAnswerError("You already submitted an answer.", 400)

    normalized = raw.strip().lower()
    correct_answer = (match.get("correctAnswer") or "").strip().lower()
    correct = normalized == correct_answer

    answers[my_uid] = {
        "answer": raw.strip(),
        "correct": correct,
        "submittedAt": now_ms,
    }

    winner_uid = None
    loser_uid = None
    result_reason = None
    new_status = "open"
    scores = dict(match.get("scores") or {u: 0 for u in uids})
    current_round = match.get("currentRound", 1)

    # Round logic
    round_winner = None
    if correct:
        round_winner = my_uid
    elif len(answers) >= 2:
        # Both answered incorrectly — advance anyway if it's a series?
        # For now, let's just stay on same question until someone gets it right,
        # OR both answered wrong so we pick a new question to avoid getting stuck.
        round_winner = None

    if correct or len(answers) >= 2:
        if round_winner:
            scores[round_winner] += 1
        
        target = match.get("targetScore", 1)
        if round_winner and scores[round_winner] >= target:
            new_status = "done"
            winner_uid = round_winner
            loser_uid = [u for u in uids if u != winner_uid][0]
            result_reason = "resolved"
        else:
            # Advance to next round
            current_round += 1
            enc_text, correct_answer, cipher_type, cipher_hint, _ = generate_mp_question(match.get("matchLevel", 1))
            transaction.update(
                mref,
                {
                    "scores": scores,
                    "currentRound": current_round,
                    "question": enc_text,
                    "correctAnswer": correct_answer,
                    "cipherType": cipher_type,
                    "cipherHint": cipher_hint,
                    "answers": {},
                    "status": "open",
                },
            )
            return _mp_public_match_dict(
                match_id,
                {**match, "scores": scores, "currentRound": current_round, "question": enc_text, "answers": {}, "status": "open"},
                my_uid
            )

    transaction.update(
        mref,
        {
            "answers": answers,
            "status": new_status,
            "winnerUid": winner_uid,
            "loserUid": loser_uid,
            "resultReason": result_reason,
            "scores": scores,
        },
    )
    return _mp_public_match_dict(
        match_id,
        {
            **match,
            "answers": answers,
            "status": new_status,
            "winnerUid": winner_uid,
            "loserUid": loser_uid,
            "resultReason": result_reason,
        },
        my_uid,
    )


@app.route("/api/multiplayer/match/<match_id>/answer", methods=["POST"])
@require_auth
def mp_submit_answer(match_id):
    if not firebase_ready:
        return jsonify({"error": "Server not configured."}), 500

    data = request.get_json(silent=True) or {}
    raw = data.get("answer")
    if not isinstance(raw, str):
        return jsonify({"error": "Missing answer."}), 400

    my_uid = request.session_user["uid"]
    mref = get_db().collection("mp_matches").document(match_id)

    try:
        txn = get_db().transaction()
        public = _mp_submit_answer_txn(txn, mref, match_id, my_uid, raw)
        # Award XP to winner if match just resolved
        if public and public.get("status") == "done" and public.get("winnerUid"):
            xp_reward = public.get("xpReward", 15)
            try:
                _update_user_xp(public["winnerUid"], xp_reward)
            except Exception as e:
                print(f"XP award failed: {e}")
        return jsonify({"ok": True, "match": public})
    except MpAnswerError as exc:
        return jsonify({"error": exc.message}), exc.http_status
    except Exception as exc:
        print(f"mp_submit_answer: {exc}")
        return jsonify({"error": "Could not record answer. Try again."}), 500


@app.route("/api/multiplayer/match/<match_id>/ack", methods=["POST"])
@require_auth
def mp_ack_match(match_id):
    """Clear this user's active match pointer after viewing results (match must be done)."""
    if not firebase_ready:
        return jsonify({"error": "Server not configured."}), 500

    my_uid = request.session_user["uid"]
    mref = get_db().collection("mp_matches").document(match_id)
    msnap = mref.get()
    if not msnap.exists:
        return jsonify({"error": "Match not found."}), 404

    match = msnap.to_dict() or {}
    if my_uid not in (match.get("uids") or []):
        return jsonify({"error": "Not in this match."}), 403
    if match.get("status") != "done":
        return jsonify({"error": "Match is not finished yet."}), 400

    st_ref = get_db().collection("mp_user_state").document(my_uid)
    st = st_ref.get()
    if st.exists and (st.to_dict() or {}).get("activeMatchId") == match_id:
        st_ref.update({"activeMatchId": firestore.DELETE_FIELD})

    return jsonify({"ok": True})


# ── CipherLab ─────────────────────────────────────────────────────────────────

@app.route("/cipherlab")
def cipherlab_page():
    return send_from_directory(CIPHERLAB_DIST, "index.html")


@app.route("/cipherlab/<path:filename>")
def cipherlab_assets(filename):
    return send_from_directory(CIPHERLAB_DIST, filename)


@app.route("/api/cipherlab/profile")
@require_auth
def cl_get_profile():
    if not firebase_ready:
        return jsonify({"error": "Server not configured."}), 500

    uid = request.session_user["uid"]
    username = request.session_user["profile"].get("username", "Operative")
    main_xp = request.session_user["profile"].get("xp", 0)

    cl_ref = get_db().collection("cl_profiles").document(uid)
    cl_doc = cl_ref.get()

    if cl_doc.exists:
        profile = cl_doc.to_dict()
        # Ensure callsign stays in sync with CQ username
        if profile.get("callsign") != username:
            cl_ref.update({"callsign": username})
            profile["callsign"] = username
        
        # Override totalPoints with main user XP
        profile["totalPoints"] = main_xp
        return jsonify({"profile": profile})

    # Auto-create profile on first visit
    profile = {
        "uid": uid,
        "callsign": username,
        "theme": "cyan",
        "totalPoints": main_xp,
        "completedLevelIds": [],
    }
    cl_ref.set({**profile, "lastActive": firestore.SERVER_TIMESTAMP})

    return jsonify({"profile": profile})


@app.route("/api/cipherlab/profile", methods=["PATCH"])
@require_auth
def cl_update_profile():
    if not firebase_ready:
        return jsonify({"error": "Server not configured."}), 500

    data = request.get_json(silent=True) or {}
    theme = data.get("theme")

    valid_themes = ["cyan", "green", "purple", "orange", "magenta"]
    if theme and theme in valid_themes:
        uid = request.session_user["uid"]
        get_db().collection("cl_profiles").document(uid).update({
            "theme": theme,
            "lastActive": firestore.SERVER_TIMESTAMP,
        })
        return jsonify({"ok": True})

    return jsonify({"error": "Invalid theme."}), 400


@app.route("/api/cipherlab/complete-mission", methods=["POST"])
@require_auth
def cl_complete_mission():
    if not firebase_ready:
        return jsonify({"error": "Server not configured."}), 500

    data = request.get_json(silent=True) or {}
    points = data.get("points")
    mission_id = data.get("missionId")

    if not isinstance(points, int) or points < 0 or not isinstance(mission_id, str):
        return jsonify({"error": "Invalid data."}), 400

    used_word = data.get("usedWord")

    uid = request.session_user["uid"]
    
    # 1. Update CipherLab profile (completed levels)
    cl_ref = get_db().collection("cl_profiles").document(uid)
    cl_doc = cl_ref.get()
    if not cl_doc.exists:
        return jsonify({"error": "Profile not found."}), 404

    profile = cl_doc.to_dict()
    completed = list(profile.get("completedLevelIds") or [])
    used_words = list(profile.get("usedWords") or [])
    
    if mission_id not in completed:
        completed.append(mission_id)
    if used_word and used_word not in used_words:
        used_words.append(used_word)

    cl_ref.update({
        "completedLevelIds": completed,
        "usedWords": used_words,
        "lastActive": firestore.SERVER_TIMESTAMP
    })

    cl_ref.update({
        "completedLevelIds": completed,
        "lastActive": firestore.SERVER_TIMESTAMP,
    })

    # 2. Update main user XP (The source of truth)
    new_xp, new_level, old_level = _update_user_xp(uid, points)

    return jsonify({
        "ok": True,
        "totalPoints": new_xp,
        "completedLevelIds": completed,
        "level": new_level
    })


@app.route("/api/cipherlab/leaderboard")
@require_auth
def cl_leaderboard():
    if not firebase_ready:
        return jsonify({"error": "Server not configured."}), 500

    entries = []
    try:
        # Query main users collection ordered by xp
        docs = (
            get_db()
            .collection("users")
            .order_by("xp", direction=firestore.Query.DESCENDING)
            .limit(10)
            .stream()
        )
        for d in docs:
            data = d.to_dict()
            entries.append({
                "uid": d.id,
                "callsign": data.get("username", "Unknown"),
                "points": data.get("xp", 0),
            })
    except Exception as exc:
        print(f"CipherLab leaderboard error: {exc}")

    return jsonify({"entries": entries})


# ── Run ───────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    print(f"CiperQuest server running on http://localhost:{PORT}")
    app.run(host="0.0.0.0", port=PORT, debug=True)
