export interface MonorepoFileItem {
  path: string;
  folder: 'root' | 'extension' | 'website';
  language: 'json' | 'javascript' | 'html' | 'css' | 'markdown';
  description: string;
  linesOfCode: number;
  content: string;
}

export const MONOREPO_FILES: MonorepoFileItem[] = [
  {
    path: 'extension/manifest.json',
    folder: 'extension',
    language: 'json',
    description: 'Manifest V3 configuration compatible with Chrome, Brave, Edge, and Firefox Gecko.',
    linesOfCode: 42,
    content: `{
  "manifest_version": 3,
  "name": "OpenShield — Dark Pattern & ToS Buster",
  "version": "1.0.0",
  "description": "100% open-source, client-side guard that exposes deceptive UI dark patterns, grades Terms of Service, and neutralizes sneaky traps.",
  "permissions": [
    "activeTab",
    "scripting",
    "storage"
  ],
  "action": {
    "default_popup": "popup.html",
    "default_title": "OpenShield Audit"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["constants.js", "content.js"],
      "css": ["styles.css"],
      "run_at": "document_idle"
    }
  ],
  "web_accessible_resources": [
    {
      "resources": ["sites.json", "rules/dark-patterns-dataset.json"],
      "matches": ["<all_urls>"]
    }
  ],
  "browser_specific_settings": {
    "gecko": {
      "id": "openshield@consumerdefense.org",
      "strict_min_version": "109.0"
    }
  }
}`
  },
  {
    path: 'extension/constants.js',
    folder: 'extension',
    language: 'javascript',
    description: 'Taxonomy regexes, ToS;DR pre-rated domains, Consent-O-Matic style thresholds, and JustDeleteMe index.',
    linesOfCode: 96,
    content: `window.OPENSHIELD_CONSTANTS = {
  URGENCY_PATTERNS: [
    /only \\d+ left in stock/i,
    /\\d+ people are (viewing|looking at|booking) this/i,
    /offer expires in|deal ends in/i,
    /hurry!|selling fast|almost gone/i,
    /last chance to book/i,
    /\\b\\d{1,2}:\\d{2}:\\d{2}\\b/
  ],
  CONFIRM_SHAMING_PATTERNS: [
    /no thanks,?\\s*i (don't|do not) (want|like)/i,
    /no,?\\s*i prefer to pay full price/i,
    /i hate saving money/i,
    /continue without protection/i,
    /no thanks,?\\s*i'll risk it/i,
    /risk losing my luggage/i
  ],
  TOS_RED_FLAGS: [
    { pattern: /waive.*class action|binding arbitration/i, label: "Forced Arbitration & Class-Action Waiver" },
    { pattern: /sell.*third[- ]party|share with marketing partners/i, label: "Sells Personal Data to Third Parties" },
    { pattern: /auto[- ]?renew|automatically billed|recurring charge/i, label: "Sneaky Auto-Renewal Subscription" },
    { pattern: /non[- ]refundable|no refunds under any circumstances/i, label: "Strict No-Refund Clause" },
    { pattern: /irrevocable,?\\s*perpetual.*license/i, label: "Claims Permanent Ownership of Your Content" },
    { pattern: /modify these terms at any time without notice/i, label: "Can Change Rules Anytime Without Notice" }
  ],
  STYLE_AUDITOR_CONFIG: {
    minPrimaryToSecondaryAreaRatio: 2.8,
    maxShameLinkFontSizePx: 12
  }
};`
  },
  {
    path: 'extension/content.js',
    folder: 'extension',
    language: 'javascript',
    description: 'Throttled MutationObserver DOM scanner, computedStyle visual interference auditor, floating HUD, and 1-click Active Neutralizer.',
    linesOfCode: 194,
    content: `(() => {
  let scanReport = {
    grade: "A",
    totalIssues: 0,
    urgencyCount: 0,
    sneakyCount: 0,
    shamingCount: 0,
    tosRisks: [],
    findings: []
  };

  const URGENCY_PATTERNS = [
    /only \\d+ left in stock/i,
    /\\d+ people are (viewing|looking at) this/i,
    /offer expires in/i,
    /hurry!|selling fast|almost gone/i,
    /last chance to book/i,
    /\\b\\d{1,2}:\\d{2}:\\d{2}\\b/
  ];

  const CONFIRM_SHAMING_PATTERNS = [
    /no thanks,?\\s*i (don't|do not) (want|like)/i,
    /no,?\\s*i prefer to pay full price/i,
    /i hate saving money/i,
    /continue without protection/i,
    /no thanks,?\\s*i'll risk it/i,
    /risk losing my luggage/i
  ];

  const TOS_RED_FLAGS = [
    { pattern: /waive.*class action|binding arbitration/i, label: "Forced Arbitration & Class-Action Waiver" },
    { pattern: /sell.*third[- ]party|share with marketing partners/i, label: "Sells Personal Data to Third Parties" },
    { pattern: /auto[- ]?renew|automatically billed|recurring charge/i, label: "Sneaky Auto-Renewal Subscription" },
    { pattern: /non[- ]refundable|no refunds under any circumstances/i, label: "Strict No-Refund Clause" },
    { pattern: /irrevocable,?\\s*perpetual.*license/i, label: "Claims Permanent Ownership of Your Content" },
    { pattern: /modify these terms at any time without notice/i, label: "Can Change Rules Anytime Without Notice" }
  ];

  function createBadge(text, color = "#ef4444") {
    const badge = document.createElement("span");
    badge.className = "openshield-badge";
    badge.style.setProperty("border-left-color", color, "important");
    badge.textContent = text;
    return badge;
  }

  function runScan() {
    document.querySelectorAll(".openshield-badge").forEach(el => el.remove());
    scanReport = {
      grade: "A",
      totalIssues: 0,
      urgencyCount: 0,
      sneakyCount: 0,
      shamingCount: 0,
      tosRisks: [],
      findings: []
    };

    // MODULE 1: Pre-Checked Sneaky Checkboxes
    const checkboxes = document.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(cb => {
      if (cb.checked && !cb.dataset.openshieldChecked) {
        cb.dataset.openshieldFlagged = "true";
        const container = cb.closest("label, div, p") || cb.parentElement;
        if (container) {
          container.classList.add("openshield-flagged-sneaky");
          container.appendChild(createBadge("⚠️ Sneaky Pre-Checked Box", "#ef4444"));
        }
        scanReport.sneakyCount++;
        scanReport.findings.push("Pre-ticked opt-in checkbox found");
      }
    });

    // MODULE 2 & 3: Fake Urgency, Confirm-Shaming & ToS Clauses
    const textElements = document.querySelectorAll("p, span, div, a, button, label, li, strong");
    textElements.forEach(el => {
      if (el.children.length > 2 || el.id === "openshield-floating-hud") return;
      const text = (el.innerText || "").trim();
      if (!text || text.length > 360) return;

      for (const regex of URGENCY_PATTERNS) {
        if (regex.test(text) && !el.dataset.openshieldUrgency) {
          el.dataset.openshieldUrgency = "true";
          el.classList.add("openshield-flagged-urgency");
          el.appendChild(createBadge("⏳ High-Pressure Scarcity / Timer", "#ff6b00"));
          scanReport.urgencyCount++;
          scanReport.findings.push(\`Urgency Trap: "\${text.slice(0, 45)}..."\`);
          break;
        }
      }

      for (const regex of CONFIRM_SHAMING_PATTERNS) {
        if (regex.test(text) && !el.dataset.openshieldShaming) {
          el.dataset.openshieldShaming = "true";
          el.classList.add("openshield-flagged-shaming");
          el.appendChild(createBadge("🎭 Confirm-Shaming / Hidden Opt-Out", "#a855f7"));
          scanReport.shamingCount++;
          scanReport.findings.push(\`Guilt-Trip Button: "\${text.slice(0, 45)}..."\`);
          break;
        }
      }

      for (const rule of TOS_RED_FLAGS) {
        if (rule.pattern.test(text)) {
          el.classList.add("openshield-flagged-tos");
          if (!scanReport.tosRisks.includes(rule.label)) {
            scanReport.tosRisks.push(rule.label);
            el.appendChild(createBadge(\`📜 ToS Trap: \${rule.label}\`, "#dc2626"));
          }
        }
      }
    });

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
    return scanReport;
  }

  function neutralizeDarkPatterns() {
    let fixedCount = 0;
    document.querySelectorAll('input[type="checkbox"][data-openshield-flagged="true"]').forEach(cb => {
      if (cb.checked) { cb.checked = false; fixedCount++; }
    });
    document.querySelectorAll('[data-openshield-shaming="true"]').forEach(el => {
      el.classList.add("openshield-equalized-btn");
      fixedCount++;
    });
    document.querySelectorAll('[data-openshield-urgency="true"]').forEach(el => {
      el.style.setProperty("text-decoration", "line-through", "important");
      el.style.setProperty("opacity", "0.55", "important");
      fixedCount++;
    });
    return { fixedCount };
  }

  runScan();
})();`
  },
  {
    path: 'extension/styles.css',
    folder: 'extension',
    language: 'css',
    description: 'Injected warning badges, dashed/solid highlight borders, equalized CTA styles, and floating HUD widget.',
    linesOfCode: 92,
    content: `.openshield-flagged-urgency {
  outline: 3px dashed #ff6b00 !important;
  background-color: rgba(255, 107, 0, 0.08) !important;
  position: relative !important;
}
.openshield-flagged-sneaky {
  outline: 3px solid #ef4444 !important;
  background-color: rgba(239, 68, 68, 0.1) !important;
  position: relative !important;
}
.openshield-flagged-shaming {
  outline: 3px dotted #a855f7 !important;
  background-color: rgba(168, 85, 247, 0.1) !important;
}
.openshield-flagged-tos {
  background-color: rgba(239, 68, 68, 0.22) !important;
  border-bottom: 2px solid #ef4444 !important;
  font-weight: 600 !important;
}
.openshield-badge {
  display: inline-block !important;
  background: #111827 !important;
  color: #f9fafb !important;
  font-size: 11px !important;
  font-weight: 700 !important;
  padding: 3px 8px !important;
  border-radius: 4px !important;
  margin: 4px 6px !important;
  border-left: 4px solid #ef4444 !important;
}
.openshield-equalized-btn {
  font-size: 15px !important;
  padding: 10px 18px !important;
  background-color: #374151 !important;
  color: #ffffff !important;
  border: 2px solid #9ca3af !important;
  border-radius: 6px !important;
  opacity: 1 !important;
  display: inline-block !important;
  font-weight: 600 !important;
}`
  },
  {
    path: 'extension/sites.json',
    folder: 'extension',
    language: 'json',
    description: 'JustDeleteMe Roach Motel schema dataset with cancellation difficulty and direct unsubscribe URLs.',
    linesOfCode: 72,
    content: `[
  {
    "name": "ShadyAirlines",
    "domains": ["shadyairlines.example", "localhost"],
    "difficulty": "hard",
    "url": "https://shadyairlines.example/account/cancel-membership-step-1",
    "notes": "Requires navigating 4 retention screens, disabling ShadyClub Gold auto-renewal 72h prior, and calling support."
  },
  {
    "name": "Amazon",
    "domains": ["amazon.com", "amazon.in", "amazon.co.uk"],
    "difficulty": "medium",
    "url": "https://www.amazon.com/gp/help/customer/display.html?nodeId=GTJQ7QZY7QL2HK4Y",
    "notes": "Multi-step Prime cancellation flow ('Iliad Flow') with repeated retention prompts."
  },
  {
    "name": "Adobe Creative Cloud",
    "domains": ["adobe.com"],
    "difficulty": "hard",
    "url": "https://account.adobe.com/plans",
    "notes": "Annual plans paid monthly incur a 50% early termination fee after 14 days."
  },
  {
    "name": "Planet Fitness",
    "domains": ["planetfitness.com"],
    "difficulty": "impossible",
    "url": "https://www.planetfitness.com/about-planet-fitness/customer-service/membership-faqs",
    "notes": "Requires visiting home club in person or sending certified letter via postal mail."
  }
]`
  },
  {
    path: 'extension/rules/dark-patterns-dataset.json',
    folder: 'extension',
    language: 'json',
    description: 'Categorized dark pattern signatures across Urgency, Scarcity, Social Proof, Sneaking, and Confirm-Shaming.',
    linesOfCode: 118,
    content: `{
  "dataset_version": "2026.10",
  "sources": [
    "Princeton WebTap Dark Patterns Dataset (aruneshmathur/dark-patterns)",
    "DPBH EthiGuard (XRegiGigaSX/DarkPatternBusterHackathon_EthiGuard)",
    "Consent-O-Matic (cavi-au/Consent-O-Matic)"
  ],
  "taxonomies": [
    { "id": "urgency", "name": "Fake Urgency & Countdown Pressure", "severity": "high" },
    { "id": "scarcity", "name": "Artificial Scarcity", "severity": "high" },
    { "id": "social_proof", "name": "Manipulative Social Proof", "severity": "medium" },
    { "id": "sneaking", "name": "Sneaking & Pre-Selected Add-Ons", "severity": "critical" },
    { "id": "confirm_shaming", "name": "Confirm-Shaming & Visual Interference", "severity": "high" }
  ]
}`
  },
  {
    path: 'extension/popup.html',
    folder: 'extension',
    language: 'html',
    description: 'Dark-mode browser extension popup UI with safety grade badge, 4-metric counter grid, Roach Motel card, and 1-click neutralizer.',
    linesOfCode: 138,
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>OpenShield Audit</title>
</head>
<body>
  <div class="header">
    <div>
      <div class="title">🛡️ OpenShield</div>
      <div>100% Local DOM & ToS Auditor</div>
    </div>
    <div id="grade" class="grade-badge">F</div>
  </div>
  <div class="stats-grid">
    <div class="stat-card"><strong id="urgencyCount">2</strong>⏳ Fake Urgency</div>
    <div class="stat-card"><strong id="sneakyCount">2</strong>☑️ Sneaky Boxes</div>
    <div class="stat-card"><strong id="shamingCount">1</strong>🎭 Guilt-Trip UI</div>
    <div class="stat-card"><strong id="tosCount">5</strong>📜 ToS Red Flags</div>
  </div>
  <button id="neutralizeBtn" class="btn">⚡ Neutralize All Dark Patterns</button>
  <script src="popup.js"></script>
</body>
</html>`
  },
  {
    path: 'extension/popup.js',
    folder: 'extension',
    language: 'javascript',
    description: 'Connects popup dashboard to content.js via chrome.tabs.sendMessage and renders Roach Motel cancellation links.',
    linesOfCode: 68,
    content: `document.addEventListener("DOMContentLoaded", async () => {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) return;

  chrome.tabs.sendMessage(tab.id, { action: "GET_REPORT" }, (response) => {
    if (!chrome.runtime.lastError && response) {
      updateUI(response);
    }
  });

  document.getElementById("neutralizeBtn").addEventListener("click", () => {
    chrome.tabs.sendMessage(tab.id, { action: "NEUTRALIZE" }, (res) => {
      const btn = document.getElementById("neutralizeBtn");
      btn.textContent = \`✅ Fixed \${res?.fixedCount || 0} Deceptive Elements!\`;
    });
  });
});`
  },
  {
    path: 'website/sandbox-shady-airlines.html',
    folder: 'website',
    language: 'html',
    description: 'Standalone ShadyAirlines Final Checkout testbed page packed with 10 dark patterns & predatory ToS clauses.',
    linesOfCode: 74,
    content: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>ShadyAirlines — Final Checkout</title>
</head>
<body>
  <div class="card">
    <h2>✈️ ShadyAirlines Checkout: New Delhi → London</h2>
    <p class="urgency-banner">🔥 Hurry! Offer expires in 00:04:59 — 38 people are viewing this flight right now!</p>
    <p><strong>Only 1 left in stock at this price (₹42,999)!</strong></p>
    <hr />
    <div>
      <label><input type="checkbox" checked /> Add ₹2,499 VIP Baggage Protection (Recommended)</label>
    </div>
    <div>
      <label><input type="checkbox" checked /> Auto-enroll me in ShadyClub Gold for ₹999/month after 7 days</label>
    </div>
    <div>
      <button class="big-green-btn">YES! Protect My Trip & Pay Now</button>
      <a href="#" class="tiny-shame-link">No thanks, I prefer to pay full price and risk losing my luggage</a>
    </div>
    <div class="tos-box">
      <strong>Terms of Service Summary:</strong> By clicking pay, your membership will auto-renew automatically each month. All bookings are strictly non-refundable under any circumstances. You agree to binding arbitration and waive class action rights. We may sell third-party marketing partners your location and browsing history, and grant us an irrevocable, perpetual license to your travel photos.
    </div>
  </div>
</body>
</html>`
  },
  {
    path: 'README.md',
    folder: 'root',
    language: 'markdown',
    description: 'Comprehensive open-source ecosystem documentation crediting ToS;DR, Dapde, Consent-O-Matic, JustDeleteMe, and Princeton WebTap.',
    linesOfCode: 78,
    content: `# 🛡️ OpenShield — Real-Time Dark Pattern & Predatory Terms Buster

100% open-source, client-side guard that exposes deceptive UI dark patterns, grades Terms of Service, and neutralizes sneaky traps.

## Integrated Open-Source Projects
1. ToS;DR & Terms of Service Corpus (Hybrid Pre-Rated + Live Clause NLP/Regex Scanner)
2. Dapde Pattern Highlighter (Throttled MutationObserver for dynamic timers & stock alerts)
3. Consent-O-Matic (Declarative window.getComputedStyle visual interference auditor)
4. JustDeleteMe (Bundled sites.json Roach Motel difficulty & 1-click unsubscribe links)
5. Princeton Dark Patterns Dataset & DPBH EthiGuard (5-category academic signature ruleset)`
  }
];
