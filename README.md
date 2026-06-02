# 🌌 CipherQuest v3

<p align="center">
  <img src="public/assets/robu_hi.webp" alt="CipherQuest Logo" width="220" />
</p>

<p align="center">
  <strong>An Advanced Hacking & Cryptographic Warfare Terminal</strong>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Stack-React%20%7C%20TypeScript%20%7C%20Flask%20%7C%20Firebase-00e5ff?style=for-the-badge" alt="Technology Stack" />
  <img src="https://img.shields.io/badge/Aesthetic-Cyberpunk%20%2F%20Terminal-b200ff?style=for-the-badge" alt="Aesthetic Theme" />
  <img src="https://img.shields.io/badge/AI_Engine-Gemini%203.1%20Flash-ff8800?style=for-the-badge" alt="AI Engine" />
</p>

---

## 👁️ System Overview

**CipherQuest v3** is an immersive, gamified web application that puts you in the shoes of an elite resistance operative. In a dystopian world overrun by autonomous corporate mainframe systems, your weapon is cryptanalysis. Your mission is to infiltrate hostile communication lines, dissect network packages, and decrypt high-grade mainframes.

The application combines a high-fidelity **Cyberpunk / Advanced Terminal aesthetic** with a comprehensive suite of **20 cryptography algorithms**, a real-time **PvP multiplayer battle arena**, and an **AI-powered command feed hint agent** powered by the Gemini 3.1 Flash model.

---

## 🎮 How the Game Works

The core gameplay centers around **deciphering encrypted payloads**. The game is divided into three primary modules:

### 1. The Intercept-Decrypt Loop
- **Signal Interception:** You are presented with a technical payload containing ciphertext, the cryptographic algorithm category (e.g., Caesar Shift, Mini RSA, Merkle Tree), and a structural rule parameter.
- **System Integrity:** Your terminal has a limited security margin represented by **3 Shield Nodes** (100% Integrity). Every incorrect decryption attempt leaks network noise, drawing mainframe security attention. This deducts **34% Integrity**.
- **System Compromise:** If your integrity reaches 0%, the Syndicate firewall locks down your terminal. You must reboot and re-deploy.
- **Neural Breach:** Entering the correct plaintext triggers a power-surge screen flash, canvas-confetti bursts, and logs XP to your remote profile.

### 2. Clearance Progression
- Operations are grouped into **4 physical main sectors**. 
- Each sector is locked until you achieve a **100% clearance rate** in the preceding sector.
- Clearing a sector generates a downloadable **Classified Neural Clearance Certificate**, procedurally drawn on an HTML5 canvas based on your Call Sign, clearance level, and precise timestamp.

### 3. Combat Academy & Sandbox
- **Cipher Lab:** A sandbox neural gym containing procedural missions of varying difficulties. Solve them under time constraints to farm XP and climb the global leaderboards.
- **Combat Academy:** A guided training module welcoming new recruits to the console, ensuring you know how to operate the interface.

---

## ⚡ Core Features

### 🌌 1. High-Fidelity Cyberpunk UI & UX
* **Dynamic Theme Engines:** Select from 5 operative avatars that instantly bind dynamic CSS variables (`--current-theme-color`) to control terminal colors, glowing neon borders, drop shadows, and canvas confetti parameters.
  * 🌐 **Cyber Cyan** (`#00e5ff`)
  * 🟢 **Matrix Green** (`#00ff88`)
  * 🟣 **Neon Purple** (`#b200ff`)
  * 🟠 **Plasma Orange** (`#ff8800`)
  * 🔴 **Laser Magenta** (`#ff00aa`)
* **Terminal Vignette & Grids:** A layered layout rendering scanlines, interactive SVG circuit nodes, desaturated cityscape background blends, and radial vignettes focusing focus to input cores.
* **Micro-interactions:** Character-scramble text animations, screen shake/glitch flashes on failure, sliding ambient lighting sweeps, and canvas particle algorithms.

### 🧠 2. Gemini 3.1 Flash AI Hint System
When system integrity decreases, the terminal triggers an outbound link to the **AI Command Feed**.
* The Flask server formats the current plaintext, target ciphertext, exact rule, and your failed input.
* It interfaces with the **Google GenAI API** utilizing `gemini-3.1-flash-lite`.
* The AI dynamically evaluates your specific mistake and serves **4 structured hints**:
  1. **Intel Level 1:** High-level algorithm blueprint.
  2. **Intel Level 2:** Logic breakdown for the initial character index.
  3. **Intel Level 3:** Tailored feedback dissecting your incorrect attempt.
  4. **Intel Level 4:** Concluding tip.

### ⚔️ 3. Tactical PvP Multiplayer Battles
Challenge other resistance operatives in real-time decryption duels.
* **Matchmaking & Search:** Query global callsigns and dispatch invite vectors.
* **Custom Game Modes:** Select round systems (Best of 1, 3, 5, or 7).
* **Sync Countdowns:** Interactive pre-round loading sequence synchronized against network server clocks.
* **Dual Intercept Loop:** Both players decrypt the exact same payload simultaneously. The system grants score rounds to the quickest correct decoder.
* **Tactical Forfeits:** Includes active surrender triggers for operatives wishing to abort high-risk operations.

### 📇 4. Procedural Canvas Certificate Generator
Upon clearing main narrative sectors, you can export a classified clearance certificate:
* Rendered on a hidden dynamic HTML5 `<canvas>`.
* Outfitted with procedural technical grids, classified dossiers, corner accents, fingerprint wave arcs, and custom barcodes generated using mathematical randomizing arrays.

---

## 📊 Cipher Cryptography Specifications

CipherQuest v3 features **20 cryptographic schemes** distributed across the 4 main mainframe sectors:

| Sector | Mission | Algorithm Code | Encryption & Mathematical Specification |
| :--- | :--- | :--- | :--- |
| **S1: The Outskirts** | `1-1` | **Reverse** | Reverses the string sequence. e.g., $S \to S_{reversed}$. |
| | `1-2` | **Caesar** | Linear index shift: $C_i = (P_i + K) \pmod{26}$. |
| | `1-3` | **Atbash** | Inverted alphabet lookup: $C_i = 25 - P_i$. |
| | `1-4` | **Monoalphabetic** | Shuffled mapping where $P \to C$ uses a randomized key substitution array. |
| | `1-5` | **Fixed Number** | Custom encoding. Letters mapped: $0-9 \to 0-9$, $a-z \to 10-35$, $A-Z \to 36-61$. |
| **S2: The Neon Slums** | `2-1` | **Reverse-Caesar** | Reverses input string, then applies a Caesar shift index $+K$. |
| | `2-2` | **Alternating Shift** | Even index shifts by $+X$, odd index shifts by $-Y$. |
| | `2-3` | **Positional Shift** | Index-progressive delta: Shifts character $P_i$ by offset $(i + 1)$. |
| | `2-4` | **Vowel Scrambler** | Vowels mapped to integers: $A \to 1, E \to 2, I \to 3, O \to 4, U \to 5$. |
| | `2-5` | **Keyed Substitution** | Alphabet index built using $Keyword + Remaining\ Letters$. |
| **S3: The Corporate Grid** | `3-1` | **Modular Shift** | Arithmetic wrapping shift: $C_i = (P_i + K) \pmod{26}$. |
| | `3-2` | **Vigenère** | Polyalphabetic shift: $C_i = (P_i + Key_{i \pmod{L}}) \pmod{26}$. |
| | `3-3` | **Affine** | Linear algebraic scale: $C_i = (a \cdot P_i + b) \pmod{26}$ with $\gcd(a, 26) = 1$. |
| | `3-4` | **Permutation** | Rail-fence transposition sorting even-index characters first, then odd-indexes. |
| | `3-5` | **Blocked Rotate** | Splits into blocks of 3, reverses the block, then shifts using Vigenère keyword key (CAT). |
| **S4: The Syndicate Core** | `4-1` | **Pairing** | Maps pairs $(a,b) \to (a+b \pmod{26}, a \cdot b \pmod{26})$. |
| | `4-2` | **Rotate Add** | Double-transform: shifts $P_i$ by the index value of its reversed counterpart. |
| | `4-3` | **Encrypt Additively** | Shifts $P_i$ by $(+1, +3, +5, +7)$ repeating, then reverses output. |
| | `4-4` | **Mini RSA** | Asymmetric exponentiation: $C_i = (P_i^e) \pmod n$. Values $\ge 26$ printed as raw numbers. |
| | `4-5` | **Mini Merkle Root** | Leaves mapped to $A=0$. Paired nodes hashed: $H(x, y) = (x \cdot 3 + y \cdot 7) \pmod{26}$ to root. |

---

## 📈 System Architecture Flowcharts

### 1. Main Navigation Protocol
This flowchart maps the primary application navigation paths and authentication gates.

```mermaid
graph TD
    Start([Launch CipherQuest Website]) --> LoginCheck{Session Token Verified?}
    LoginCheck -- No --> AuthScreen[Auth Sector: Login / Register]
    AuthScreen --> RegisterUser[Create Callsign Profile in Firebase]
    RegisterUser --> Dashboard[Terminal Dashboard Portal]
    LoginCheck -- Yes --> Dashboard

    Dashboard --> StoryMode[Sector Campaigns: Story Mode]
    Dashboard --> CipherLab[Infiltration Training: Cipher Lab]
    Dashboard --> Multiplayer[Active Warzone: Multiplayer duels]
    Dashboard --> Settings[Settings Console: Audio & Tutorial resets]
```

### 2. Narrative Decryption Gameplay Loop
The logic system powering narrative missions and integrity checking.

```mermaid
graph TD
    Start[Initiate Narrative Operation] --> Comms[Comms Briefing: Dialogue Interface]
    Comms -- Press Enter --> Intercept[Transition Scan Sequence]
    Intercept --> ActiveCipher[Decryption Panel Mounted]
    
    ActiveCipher --> Scramble[Render Payload with Scramble Animation]
    Scramble --> AwaitInput[Await Operative plain text input]
    
    AwaitInput --> Submission{Submit Decrypted String}
    Submission -- Match --> Success[Confetti Burst & Screen Flash]
    Success --> CompleteDB[Log Firebase Progress & Add XP]
    CompleteDB --> SectorCheck{Sector Cleared 5/5?}
    
    SectorCheck -- Yes --> CanvasBadge[Render HTML5 Dossier Badge]
    CanvasBadge --> Proceed[Proceed to Next Sector or Capstone Ascent]
    SectorCheck -- No --> NextMission[Load Next Operation in Sector]
    
    Submission -- Mismatch --> FaultFlash[Glitch Screen Flash & Camera Shake]
    FaultFlash --> DecIntegrity[Deduct System Integrity -34%]
    DecIntegrity --> HealthCheck{System Integrity > 0?}
    HealthCheck -- Yes --> AIHint[Trigger Gemini AI Command Feed Hint]
    AIHint --> AwaitInput
    HealthCheck -- No --> Locked[System Compromised Lockout Screen]
    Locked --> Retry{Reboot & Re-Deploy?}
    Retry -- Yes --> ActiveCipher
    Retry -- No --> Return[Return to Campaign Grid]
```

### 3. Multiplayer Battle Arena Loop
The real-time multiplayer duel protocol.

```mermaid
graph TD
    Lobby[Multiplayer Arena Lobby] --> Search[Query Operand Callsign]
    Search --> Format[Set Format: Best of 1/3/5/7 Rounds]
    Format --> Invite[Transmit Duel Invite to Firebase]
    Lobby --> Signals{Incoming invite signal?}
    Signals -- Yes --> Accept[Accept Invite]
    Signals -- No --> Lobby
    
    Accept --> MatchSync[Sync Round Countdown Timer]
    MatchSync --> LoadRound[Mount Decryption Battle Core]
    LoadRound --> Solve[Both players solve the same ciphertext payload]
    Solve --> Submit[Submit Decoded word to main database]
    
    Submit --> LockStatus[Lock Output & Await opponent]
    LockStatus --> BothDone{Both answered or timer expired?}
    BothDone -- Yes --> Resolve[Evaluate Winner & Correct Decryption]
    Resolve --> Modal[Display Round outcome & plain text answer]
    
    Modal --> EndCheck{All Rounds Resolved or Forfeit?}
    EndCheck -- No --> MatchSync
    EndCheck -- Yes --> FinalLeader[Update Global Standings & Award XP]
    FinalLeader --> Lobby
```

### 4. AI-Powered Assistant Core
The sequence pipeline for AI-assisted command tips.

```mermaid
graph TD
    Trigger[Integrity Loss Event] --> Req[Client POST metadata request to backend API]
    Req --> ServerEnv[Server checks for GEMINI_API_KEY]
    ServerEnv -- Present --> BuildPrompt[Structure prompt context with rule & failed answer]
    ServerEnv -- Missing --> Fallback[Serve generic cryptography hints]
    
    BuildPrompt --> GeminiAPI[Call Gemini 3.1 Flash API]
    GeminiAPI --> ValidateJSON[Receive structured JSON array]
    ValidateJSON --> RenderClient[Mount hints into sequential interface]
    
    RenderClient --> Tip1[General algorithm rule overview]
    RenderClient --> Tip2[Breakdown of initial character indexing]
    RenderClient --> Tip3[Dissection of user's mistake]
    RenderClient --> Tip4[Strong concluding instruction]
```

---

## 🛠️ Development & Deployment Setup

### 1. Environment Configurations (`.env`)
Create a `.env` file in the root directory:

```env
# Flask Server Configuration
PORT=5000
NODE_ENV=development

# Firebase Integration (Minified Service Account JSON)
FIREBASE_SERVICE_ACCOUNT_JSON={"type": "service_account", "project_id": "...", "private_key": "...", ...}

# Google Gemini AI Integration
GEMINI_API_KEY=AIzaSy...
```

### 2. Frontend Configuration & Running
Install dependencies and launch the Vite development server:

```bash
# Install packages
npm install

# Start local server
npm run dev
```

### 3. Backend Flask Configuration & Running
The Python backend acts as serverless functions (configured for Vercel integration in `vercel.json`):

```bash
# Create virtual environment
python -m venv venv
source venv/bin/activate  # Or Windows: venv\Scripts\activate

# Install requirements
pip install -r requirements.txt

# Start backend server
python api/index.py
```

### 4. Deploying to Vercel
The repository includes a custom `vercel.json` file directing `/api/*` requests to the Flask serverless functions and routing all other static resources to the index.html build file.

To publish:
```bash
# Deploy code
vercel --prod
```
The application triggers an internal keeps-alive heartbeat every 5 seconds, fetching `/api/ping` to prevent cold starts on Vercel's serverless function instances.

---

<p align="center">
  <strong>📡 SECURE TRANSMISSION ENDED. GOOD LUCK IN THE GRID.</strong>
</p>
