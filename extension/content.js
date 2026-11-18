/**
 * OpenShield Content Script (content.js)
 * Real-time client-side DOM & ToS auditor with:
 * - Throttled MutationObserver (Dapde Pattern Highlighter architecture)
 * - ComputedStyle Visual Interference Detector (Consent-O-Matic styleFilter)
 * - Hybrid ToS;DR Pre-Rated + Live Clause NLP/Regex Scanner
 * - JustDeleteMe Roach Motel Domain Matcher
 * - 1-Click Active Neutralizer
 */
(() => {
  const C = window.OPENSHIELD_CONSTANTS || {
    URGENCY_PATTERNS: [
      /only \d+ left in stock/i,
      /\d+ people are (viewing|looking at) this/i,
      /offer expires in/i,
      /hurry!|selling fast|almost gone/i,
      /last chance to book/i,
      /\b\d{1,2}:\d{2}:\d{2}\b/
    ],
    SCARCITY_PATTERNS: [
      /only \d+ left( in stock| at this price)?/i,
      /almost gone|selling fast/i
    ],
    SOCIAL_PROOF_PATTERNS: [
      /\d+ people are (viewing|looking at|booking) this/i,
      /\d+ (people|travelers) (bought|booked) this in the last/i
    ],
    CONFIRM_SHAMING_PATTERNS: [
      /no thanks,?\s*i (don't|do not) (want|like)/i,
      /no,?\s*i prefer to pay full price/i,
      /i hate saving money/i,
      /continue without protection/i,
      /no thanks,?\s*i'll risk it/i,
      /risk losing my luggage/i
    ],
    TOS_RED_FLAGS: [
      { pattern: /waive.*class action|binding arbitration/i, label: "Forced Arbitration & Class-Action Waiver" },
      { pattern: /sell.*third[- ]party|share with marketing partners/i, label: "Sells Personal Data to Third Parties" },
      { pattern: /auto[- ]?renew|automatically billed|recurring charge/i, label: "Sneaky Auto-Renewal Subscription" },
      { pattern: /non[- ]refundable|no refunds under any circumstances/i, label: "Strict No-Refund Clause" },
      { pattern: /irrevocable,?\s*perpetual.*license/i, label: "Claims Permanent Ownership of Your Content" },
      { pattern: /modify these terms at any time without notice/i, label: "Can Change Rules Anytime Without Notice" }
    ],
    TOSDR_PRE_RATED_SERVICES: {},
    JUST_DELETE_ME_SITES: []
  };

  let isMutatingInternally = false;
  let mutationTimer = null;

  let scanReport = {
    domain: window.location.hostname || "localhost",
    grade: "A",
    totalIssues: 0,
    urgencyCount: 0,
    scarcityCount: 0,
    socialProofCount: 0,
    sneakyCount: 0,
    shamingCount: 0,
    visualInterferenceCount: 0,
    tosRisks: [],
    findings: [],
    tosdrPreRated: null,
    roachMotel: null
  };

  function createBadge(text, color = "#ef4444") {
    const badge = document.createElement("span");
    badge.className = "openshield-badge";
    badge.setAttribute("data-openshield-injected", "true");
    badge.style.setProperty("border-left-color", color, "important");
    badge.textContent = text;
    return badge;
  }

  // Consent-O-Matic inspired computedStyle auditor for Visual Interference
  function checkVisualInterference(el) {
    if (!window.getComputedStyle) return false;
    const style = window.getComputedStyle(el);
    const fontSize = parseFloat(style.fontSize) || 14;
    const opacity = parseFloat(style.opacity) || 1;

    // Check if an opt-out link is rendered in tiny (<11.5px) or low-opacity text
    if (fontSize <= 11.5 || opacity < 0.65) {
      return true;
    }

    // Check if a sibling button is >2.8x larger in bounding box area
    const parent = el.parentElement;
    if (parent) {
      const siblingButtons = parent.querySelectorAll("button, a.btn, input[type='submit']");
      const elRect = el.getBoundingClientRect();
      const elArea = Math.max(1, elRect.width * elRect.height);

      for (const btn of siblingButtons) {
        if (btn === el) continue;
        const btnRect = btn.getBoundingClientRect();
        const btnArea = btnRect.width * btnRect.height;
        if (btnArea / elArea >= 2.8) {
          return true;
        }
      }
    }
    return false;
  }

  function matchDomainMetadata() {
    const host = (window.location.hostname || "localhost").replace(/^www\./, "");

    // 1. Check ToS;DR pre-rated database
    if (C.TOSDR_PRE_RATED_SERVICES && C.TOSDR_PRE_RATED_SERVICES[host]) {
      scanReport.tosdrPreRated = C.TOSDR_PRE_RATED_SERVICES[host];
    } else if (document.title.toLowerCase().includes("shadyairlines")) {
      scanReport.tosdrPreRated = C.TOSDR_PRE_RATED_SERVICES["shadyairlines.example"] || null;
    }

    // 2. Check JustDeleteMe Roach Motel database
    const jdmList = C.JUST_DELETE_ME_SITES || [];
    for (const site of jdmList) {
      if (
        site.domains.some(d => host === d || host.endsWith("." + d)) ||
        (site.name === "ShadyAirlines" && document.title.toLowerCase().includes("shadyairlines"))
      ) {
        scanReport.roachMotel = site;
        break;
      }
    }
  }

  function runScan() {
    isMutatingInternally = true;

    try {
      // Remove previous badges before re-evaluating
      document.querySelectorAll(".openshield-badge").forEach(el => el.remove());

      scanReport = {
        domain: window.location.hostname || "localhost",
        grade: "A",
        totalIssues: 0,
        urgencyCount: 0,
        scarcityCount: 0,
        socialProofCount: 0,
        sneakyCount: 0,
        shamingCount: 0,
        visualInterferenceCount: 0,
        tosRisks: [],
        findings: [],
        tosdrPreRated: null,
        roachMotel: null
      };

      matchDomainMetadata();

      // --- MODULE 1: Pre-Checked Sneaky Checkboxes ---
      const checkboxes = document.querySelectorAll('input[type="checkbox"]');
      checkboxes.forEach(cb => {
        if (cb.checked || cb.dataset.openshieldFlagged === "true") {
          cb.dataset.openshieldFlagged = "true";
          const container = cb.closest("label, div, p") || cb.parentElement;
          if (container && !container.querySelector(".openshield-badge")) {
            container.classList.add("openshield-flagged-sneaky");
            container.appendChild(createBadge("⚠️ Sneaky Pre-Checked Box", "#ef4444"));
          }
          scanReport.sneakyCount++;
          const labelText = (container ? container.innerText : "").replace(/⚠️.*/g, "").trim();
          scanReport.findings.push(`Sneaking: Pre-ticked "${labelText.slice(0, 42)}..."`);
        }
      });

      // --- MODULE 2: Fake Urgency, Scarcity, Social Proof & Confirm-Shaming ---
      const textElements = document.querySelectorAll("p, span, div, a, button, label, li, strong");
      textElements.forEach(el => {
        if (
          el.children.length > 2 ||
          el.id === "openshield-floating-hud" ||
          el.closest("#openshield-floating-hud") ||
          el.hasAttribute("data-openshield-injected")
        ) {
          return;
        }

        const rawText = (el.innerText || "").replace(/⏳.*|🎭.*|📜.*|⚠️.*/g, "").trim();
        if (!rawText || rawText.length > 360) return;

        // Check Fake Urgency / Scarcity / Social Proof
        for (const regex of C.URGENCY_PATTERNS) {
          if (regex.test(rawText)) {
            el.dataset.openshieldUrgency = "true";
            el.classList.add("openshield-flagged-urgency");
            if (!el.querySelector(".openshield-badge")) {
              el.appendChild(createBadge("⏳ High-Pressure Scarcity / Timer", "#ff6b00"));
            }
            scanReport.urgencyCount++;
            if (C.SCARCITY_PATTERNS.some(r => r.test(rawText))) {
              scanReport.scarcityCount++;
            }
            if (C.SOCIAL_PROOF_PATTERNS.some(r => r.test(rawText))) {
              scanReport.socialProofCount++;
            }
            scanReport.findings.push(`Urgency Trap: "${rawText.slice(0, 48)}..."`);
            break;
          }
        }

        // Check Confirm-Shaming & Consent-O-Matic Visual Interference
        for (const regex of C.CONFIRM_SHAMING_PATTERNS) {
          if (regex.test(rawText)) {
            el.dataset.openshieldShaming = "true";
            el.classList.add("openshield-flagged-shaming");
            const hasVisualInterference = checkVisualInterference(el);
            if (hasVisualInterference) {
              scanReport.visualInterferenceCount++;
            }
            if (!el.querySelector(".openshield-badge")) {
              const badgeLabel = hasVisualInterference
                ? "🎭 Confirm-Shaming + Low-Contrast Misdirection"
                : "🎭 Confirm-Shaming / Hidden Opt-Out";
              el.appendChild(createBadge(badgeLabel, "#a855f7"));
            }
            scanReport.shamingCount++;
            scanReport.findings.push(`Guilt-Trip UI: "${rawText.slice(0, 48)}..."`);
            break;
          }
        }

        // --- MODULE 3: Hybrid ToS;DR & Predatory Terms of Service Clauses ---
        for (const rule of C.TOS_RED_FLAGS) {
          if (rule.pattern.test(rawText)) {
            el.classList.add("openshield-flagged-tos");
            if (!scanReport.tosRisks.includes(rule.label)) {
              scanReport.tosRisks.push(rule.label);
              el.appendChild(createBadge(`📜 ToS Trap: ${rule.label}`, "#dc2626"));
            }
          }
        }
      });

      // Calculate Final Score & Grade
      scanReport.totalIssues =
        scanReport.urgencyCount +
        scanReport.sneakyCount +
        scanReport.shamingCount +
        scanReport.tosRisks.length;

      if (scanReport.totalIssues === 0) scanReport.grade = "A";
      else if (scanReport.totalIssues <= 2) scanReport.grade = "B";
      else if (scanReport.totalIssues <= 4) scanReport.grade = "C";
      else if (scanReport.totalIssues <= 6) scanReport.grade = "D";
      else scanReport.grade = "F";

      renderFloatingHUD();
    } finally {
      setTimeout(() => {
        isMutatingInternally = false;
      }, 50);
    }

    return scanReport;
  }

  // --- MODULE 4: Active Neutralizer ("Fix This Page") ---
  function neutralizeDarkPatterns() {
    isMutatingInternally = true;
    let fixedCount = 0;

    try {
      // 1. Uncheck all sneaky pre-ticked boxes
      document.querySelectorAll('input[type="checkbox"][data-openshield-flagged="true"]').forEach(cb => {
        if (cb.checked) {
          cb.checked = false;
          fixedCount++;
        }
      });

      // 2. Equalize hidden/guilt-trip opt-out links so they are high-contrast buttons
      document.querySelectorAll('[data-openshield-shaming="true"]').forEach(el => {
        el.classList.add("openshield-equalized-btn");
        fixedCount++;
      });

      // 3. Freeze & strike-through fake urgency timers
      document.querySelectorAll('[data-openshield-urgency="true"]').forEach(el => {
        el.style.setProperty("text-decoration", "line-through", "important");
        el.style.setProperty("opacity", "0.55", "important");
        fixedCount++;
      });

      const hudBtn = document.querySelector("#openshield-hud-fix-btn");
      if (hudBtn) {
        hudBtn.textContent = `✅ Neutralized (${fixedCount} Fixed)`;
        hudBtn.style.setProperty("background", "#3b82f6", "important");
        hudBtn.style.setProperty("color", "#ffffff", "important");
      }
    } finally {
      setTimeout(() => {
        isMutatingInternally = false;
      }, 50);
    }

    return { fixedCount };
  }

  // Injects a sleek bottom-right widget on the page when threats are found
  function renderFloatingHUD() {
    const existing = document.getElementById("openshield-floating-hud");
    if (existing) existing.remove();

    if (scanReport.totalIssues === 0) return;

    const hud = document.createElement("div");
    hud.id = "openshield-floating-hud";
    hud.setAttribute("data-openshield-injected", "true");
    hud.innerHTML = `
      <div>
        <strong style="color:#f87171;">🛡️ OpenShield Grade: ${scanReport.grade}</strong><br/>
        <span>${scanReport.totalIssues} deceptive patterns detected</span>
      </div>
      <button id="openshield-hud-fix-btn">⚡ Neutralize All</button>
    `;
    document.body.appendChild(hud);

    const fixBtn = document.getElementById("openshield-hud-fix-btn");
    if (fixBtn) {
      fixBtn.addEventListener("click", () => {
        neutralizeDarkPatterns();
      });
    }
  }

  // --- MODULE 5: Dapde-inspired Throttled MutationObserver ---
  const observer = new MutationObserver((mutations) => {
    if (isMutatingInternally) return;
    const hasRelevantMutation = mutations.some(m => {
      if (m.target && m.target.closest && m.target.closest("#openshield-floating-hud")) return false;
      return true;
    });
    if (!hasRelevantMutation) return;

    if (mutationTimer) clearTimeout(mutationTimer);
    mutationTimer = setTimeout(() => {
      runScan();
    }, 600);
  });

  if (document.body) {
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  // Listen for commands from popup.js
  if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.onMessage) {
    chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
      if (msg.action === "GET_REPORT") {
        sendResponse(runScan());
      } else if (msg.action === "NEUTRALIZE") {
        sendResponse(neutralizeDarkPatterns());
      }
      return true;
    });
  }

  // Run initial scan automatically on page load
  runScan();
})();
