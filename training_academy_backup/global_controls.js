(function () {
  const levelNames = {
    "1.1": "Reverse Cipher",
    "1.2": "Caesar Cipher",
    "1.3": "Atbash Cipher",
    "1.4": "Monoalphabetic Substitution",
    "1.5": "Fixed Number Encoding",
    "2.1": "Reverse + Caesar",
    "2.2": "Alternating Cipher",
    "2.3": "Positional Cipher",
    "2.4": "Vowel Scrambler",
    "2.5": "Keyed Substitution Cipher",
    "3.1": "Modular Shift Cipher",
    "3.2": "Vignere Cipher",
    "3.3": "Affined Scrambler",
    "3.4": "Permutation Cipher",
    "3.5": "Blocked Rotate and keying",
    "4.1": "Pairing and +*",
    "4.2": "Rotate and Add",
    "4.3": "Encrypt additively then flip the block",
    "4.4": "Mini RSA",
    "4.5": "Mini Merkle Tree"
  };

  const levelDetails = {
    "1.1": { subtitle: "Reverse the message order step-by-step", chips: [["Chapter", "01"], ["Level", "1.1"]] },
    "1.2": { subtitle: "Shift letters forward or backward on the alphabet rail", chips: [["Chapter", "01"], ["Shift", "+3"]] },
    "1.3": { subtitle: "Mirror letters across the alphabet", chips: [["Chapter", "01"], ["Rule", "A<->Z"]] },
    "1.4": { subtitle: "Swap every letter through one fixed alphabet map", chips: [["Chapter", "01"], ["Map", "A-Z"]] },
    "1.5": { subtitle: "Convert letters into fixed number codes", chips: [["Chapter", "01"], ["Code", "A=01"]] },
    "2.1": { subtitle: "Reverse first, then apply a Caesar shift", chips: [["Chapter", "02"], ["Stages", "2"]] },
    "2.2": { subtitle: "Alternate two shifts across the message", chips: [["Chapter", "02"], ["Pattern", "+3/-2"]] },
    "2.3": { subtitle: "Let each position change the shift amount", chips: [["Chapter", "02"], ["Rule", "i grows"]] },
    "2.4": { subtitle: "Scramble vowels while consonants stay readable", chips: [["Chapter", "02"], ["Target", "Vowels"]] },
    "2.5": { subtitle: "Build a substitution alphabet from a keyword", chips: [["Chapter", "02"], ["Key", "CIPHER"]] },
    "3.1": { subtitle: "Use modular arithmetic to wrap shifts cleanly", chips: [["Chapter", "03"], ["Modulo", "26"]] },
    "3.2": { subtitle: "Repeat a key to create changing shifts", chips: [["Chapter", "03"], ["Key", "CAT"]] },
    "3.3": { subtitle: "Stretch, add, then wrap each letter index", chips: [["Multiplier", "a=5"], ["Adder", "b=8"]] },
    "3.4": { subtitle: "Reorder positions using a fixed permutation", chips: [["Chapter", "03"], ["Blocks", "4"]] },
    "3.5": { subtitle: "Rotate blocks, then stamp each with a key", chips: [["Chapter", "03"], ["Key", "CAT"]] },
    "4.1": { subtitle: "Pair letters, then create sum and product outputs", chips: [["Chapter", "04"], ["Rule", "(a+b,a*b)"]] },
    "4.2": { subtitle: "Rotate the block and add a shifting key", chips: [["Chapter", "04"], ["Action", "Rotate+Add"]] },
    "4.3": { subtitle: "Encrypt additively, then read each block backward", chips: [["Chapter", "04"], ["Block", "Flip"]] },
    "4.4": { subtitle: "Tracing RSA transformations step-by-step", chips: [["Public Key", "e=3, n=33"], ["Private Key", "d=7, n=33"]] },
    "4.5": { subtitle: "Fuse letters upward into one verifiable root", chips: [["Chapter", "04"], ["Leaves", "8"]] }
  };

  function currentLevelKey() {
    const match = window.location.pathname.match(/level(\d+)\.(\d+)\.html/i);
    return match ? `${match[1]}.${match[2]}` : null;
  }

  function normalizePlayText(node) {
    if (!node) return;
    const value = node.textContent.trim().toLowerCase();
    if (value.includes("pause")) node.textContent = "Pause";
    if (value.includes("play")) node.textContent = "Resume";
  }

  function levelIcon(key) {
    const chapter = key ? key.split(".")[0] : "1";
    return `C${chapter}`;
  }

  function findLevelContainer() {
    return document.querySelector(".shell, .card, .glass-panel") || document.body.firstElementChild;
  }

  function hideOldHeader(container) {
    const oldHeader = container.querySelector(":scope > header, :scope > .topbar");
    if (oldHeader) {
      oldHeader.setAttribute("data-cq-old-header", "true");
      oldHeader.style.display = "none";
      return;
    }

    const first = container.firstElementChild;
    if (first && first.textContent && first.textContent.toLowerCase().includes("auto demo")) {
      first.setAttribute("data-cq-old-header", "true");
      first.style.display = "none";
    }
  }

  function buildHeader(key) {
    const details = levelDetails[key] || { subtitle: "Interactive cipher animation", chips: [] };
    const title = levelNames[key] || "CipherQuest";
    const header = document.createElement("header");
    header.className = "cq-level-header";

    const chips = details.chips.map(([label, value]) => `
      <div class="cq-header-chip">
        <span class="cq-chip-label">${label}</span>
        <span class="cq-chip-value">${value}</span>
      </div>
    `).join("");

    header.innerHTML = `
      <div class="cq-header-copy">
        <div class="cq-header-title-row">
          <span class="cq-header-icon">${levelIcon(key)}</span>
          <h1 class="cq-header-title">${title}</h1>
        </div>
        <p class="cq-header-subtitle">${details.subtitle}</p>
      </div>
      <div class="cq-header-chips">${chips}</div>
    `;
    return header;
  }

  function enhanceHeader() {
    const key = currentLevelKey();
    if (!key) return;

    const container = findLevelContainer();
    if (!container || container.querySelector(":scope > .cq-level-header")) return;

    hideOldHeader(container);
    container.insertBefore(buildHeader(key), container.firstElementChild);
  }

  function enhanceControls() {
    const style = document.createElement("style");
    style.textContent = `
      * {
        cursor: url("/assets/mouse.png") 4 4, auto !important;
      }
      body, html {
        cursor: url("/assets/mouse.png") 4 4, auto !important;
      }
      a, button, [role="button"], input, select, textarea, .btn, .foot-btn, #speedDown, #speedUp, #btn-play, #btn-step, #btn-next, #replay, #replayBtn, #replayNow, #nextBtn {
        cursor: url("/assets/mouse.png") 4 4, pointer !important;
      }
      footer,
      .footer {
        gap: 12px !important;
      }

      .cq-level-header {
        display: flex !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: 20px !important;
        width: 100% !important;
        padding: 24px 20px !important;
        background: rgba(2, 6, 23, 0.82) !important;
        border-bottom: 1px solid rgba(148, 163, 184, 0.22) !important;
        color: #e2e8f0 !important;
      }

      .glass-panel > .cq-level-header {
        margin: -2rem -2rem 1.5rem -2rem !important;
        width: calc(100% + 4rem) !important;
        border-radius: 18px 18px 0 0 !important;
      }

      .cq-header-copy {
        min-width: 0 !important;
      }

      .cq-header-title-row {
        display: flex !important;
        align-items: center !important;
        gap: 10px !important;
        min-width: 0 !important;
      }

      .cq-header-icon {
        width: 28px !important;
        height: 24px !important;
        display: inline-grid !important;
        place-items: center !important;
        color: #22d3ee !important;
        font-family: "SF Mono", "Fira Code", Consolas, monospace !important;
        font-size: 12px !important;
        font-weight: 900 !important;
        line-height: 1 !important;
        border: 1px solid rgba(34, 211, 238, 0.5) !important;
        border-radius: 6px !important;
        background: rgba(34, 211, 238, 0.08) !important;
        text-shadow: 0 0 14px rgba(34, 211, 238, 0.45) !important;
      }

      .cq-header-title {
        margin: 0 !important;
        color: #f8fafc !important;
        font-family: "Orbitron", sans-serif !important;
        font-size: 24px !important;
        font-weight: 700 !important;
        line-height: 1.2 !important;
        letter-spacing: 0.025em !important;
        text-transform: uppercase !important;
        white-space: normal !important;
      }

      .cq-header-subtitle {
        margin: 8px 0 0 38px !important;
        color: rgba(255, 255, 255, 0.6) !important;
        font-family: "Share Tech Mono", ui-monospace, SFMono-Regular, monospace !important;
        font-size: 12px !important;
        font-weight: 700 !important;
        line-height: 1.35 !important;
        letter-spacing: 0.3em !important;
        text-transform: uppercase !important;
      }

      .cq-header-chips {
        display: flex !important;
        align-items: center !important;
        justify-content: flex-end !important;
        gap: 12px !important;
        flex-wrap: wrap !important;
        flex: 0 0 auto !important;
      }

      .cq-header-chip {
        min-width: 96px !important;
        min-height: 50px !important;
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        justify-content: center !important;
        gap: 4px !important;
        padding: 8px 12px !important;
        border: 1px solid rgba(148, 163, 184, 0.32) !important;
        border-radius: 8px !important;
        background: rgba(15, 23, 42, 0.82) !important;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04) !important;
      }

      .cq-chip-label {
        color: #64748b !important;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif !important;
        font-size: 10px !important;
        font-weight: 800 !important;
        line-height: 1 !important;
        letter-spacing: 0 !important;
        text-transform: uppercase !important;
      }

      .cq-chip-value {
        color: #ffdd57 !important;
        font-family: "SF Mono", "Fira Code", Consolas, monospace !important;
        font-size: 13px !important;
        font-weight: 900 !important;
        line-height: 1.1 !important;
        letter-spacing: 0 !important;
        text-transform: none !important;
        text-align: center !important;
      }

      .cq-header-chip:nth-child(2) .cq-chip-value {
        color: #c084fc !important;
      }

      .speed-controls,
      footer:has(#speedDisplay) > div:has(#speedDisplay),
      .footer:has(#speedDisplay) > div:has(#speedDisplay) {
        display: flex !important;
        align-items: center !important;
        gap: 8px !important;
        min-height: 34px !important;
        padding: 4px 8px !important;
        border: 1px solid rgba(89, 242, 255, 0.34) !important;
        border-radius: 999px !important;
        background: rgba(2, 6, 23, 0.66) !important;
        box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.06) !important;
      }

      #speedDown,
      #speedUp {
        width: 28px !important;
        height: 26px !important;
        display: inline-grid !important;
        place-items: center !important;
        padding: 0 !important;
        border: 1px solid rgba(89, 242, 255, 0.36) !important;
        border-radius: 999px !important;
        background: rgba(89, 242, 255, 0.08) !important;
        color: #59f2ff !important;
        font-size: 14px !important;
        font-weight: 900 !important;
        line-height: 1 !important;
        cursor: pointer !important;
        transition: background .18s ease, box-shadow .18s ease, transform .18s ease !important;
      }

      #speedDown:hover,
      #speedUp:hover {
        background: rgba(89, 242, 255, 0.16) !important;
        box-shadow: 0 0 14px rgba(89, 242, 255, 0.24) !important;
        transform: translateY(-1px) !important;
      }

      #speedDisplay {
        min-width: 44px !important;
        color: #dffbff !important;
        font-variant-numeric: tabular-nums !important;
        text-align: center !important;
        font-family: "SF Mono", "Fira Code", Consolas, monospace !important;
        font-size: 11px !important;
        font-weight: 800 !important;
        letter-spacing: .08em !important;
      }

      #btn-play,
      #btn-step,
      #btn-next,
      #replay,
      #replayBtn,
      #replayNow,
      #nextBtn,
      .btn,
      .foot-btn {
        min-height: 34px !important;
        border-radius: 999px !important;
        text-transform: uppercase !important;
        letter-spacing: .1em !important;
        font-size: 11px !important;
        font-weight: 800 !important;
      }

      #btn-play,
      #replay,
      #replayBtn,
      #replayNow {
        border: 1px solid rgba(89, 242, 255, 0.46) !important;
        background: rgba(89, 242, 255, 0.10) !important;
        color: #59f2ff !important;
      }

      #btn-next,
      #btn-step,
      #nextBtn,
      .foot-btn.primary {
        border: 1px solid rgba(255, 221, 87, 0.46) !important;
        background: rgba(255, 221, 87, 0.10) !important;
        color: #ffdd57 !important;
      }

      #btn-play:hover,
      #btn-step:hover,
      #btn-next:hover,
      #replay:hover,
      #replayBtn:hover,
      #replayNow:hover,
      #nextBtn:hover {
        box-shadow: 0 0 16px rgba(89, 242, 255, 0.22) !important;
      }

      @media (max-width: 640px) {
        .cq-level-header {
          align-items: flex-start !important;
          flex-direction: column !important;
          padding: 18px 16px !important;
        }

        .cq-header-subtitle {
          margin-left: 0 !important;
        }

        .cq-header-chips {
          justify-content: flex-start !important;
          width: 100% !important;
        }

        .cq-header-chip {
          min-width: 0 !important;
          flex: 1 1 120px !important;
        }

        footer,
        .footer {
          flex-wrap: wrap !important;
          justify-content: center !important;
        }
      }
    `;
    document.head.appendChild(style);

    const key = currentLevelKey();
    if (key && levelNames[key]) {
      document.title = `CipherQuest | Level ${key} | ${levelNames[key]}`;
    }
    enhanceHeader();

    const speedDown = document.getElementById("speedDown");
    const speedUp = document.getElementById("speedUp");
    if (speedDown) speedDown.setAttribute("aria-label", "Slow down animation");
    if (speedUp) speedUp.setAttribute("aria-label", "Speed up animation");

    normalizePlayText(document.getElementById("play-text"));
    const playText = document.getElementById("play-text");
    if (playText) {
      const observer = new MutationObserver(() => normalizePlayText(playText));
      observer.observe(playText, { childList: true, characterData: true, subtree: true });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", enhanceControls);
  } else {
    enhanceControls();
  }
})();
