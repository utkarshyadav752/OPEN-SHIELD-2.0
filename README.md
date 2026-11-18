# OpenShield — Evidence-First Terms & Conditions Intelligence + Live Browser Protection (v1.2.0)

OpenShield is a privacy-conscious, 100% open-source consumer protection platform and Manifest V3 browser extension that helps people answer five practical questions before agreeing or paying:

1. **What does this agreement actually say?**
2. **Which terms could put me at a disadvantage?**
3. **How much could it cost me?**
4. **What should I verify or do next?**
5. **What evidence supports the warning?**

---

## Customer-Facing Entry Points & Differentiators

1. **Feature 1 — Website URL Analyzer (`POST /api/analyze-url`)**
   - SSRF-hardened URL validation and retrieval pipeline blocking `localhost`, loopback (`127.0.0.1`, `::1`), RFC 1918 private networks (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`), cloud metadata (`169.254.169.254`), and non-HTTP/HTTPS schemes.
   - Never fabricates quotations or scan results when a URL is unreachable; offers a 1-click transition to paste text or upload a document.

2. **Feature 2 — Document, Screenshot & Policy Diff Analyzer (`POST /api/analyze-document`)**
   - Supports **PDF (`.pdf`)**, **Image (`.jpg`, `.jpeg`, `.png`, `.webp`)**, **Pasted Text**, and **Side-by-Side Policy Version Comparison (Diff)** up to **5.00 MB**.
   - Validates file magic bytes (`%PDF-`, PNG, JPEG, WebP), extracts embedded text streams in memory without permanently storing user documents, and isolates adversarial prompt-injection strings (`detectAndSanitizePromptInjection`).
   - **Compare Versions (Diff)**: Compares Version A (Previous Policy) against Version B (Updated Policy) using deterministic clause diffing—highlighting changed prices, renewal changes, added arbitration clauses, and removed clauses while filtering out formatting-only noise.

3. **Feature 3 — Hidden Cost Calculator (`calculateHiddenCosts`)**
   - Extracts explicitly stated monetary figures, currencies (`₹`, `$`, `€`, `£`), free-trial durations, pre-selected paid add-ons, and early termination penalty percentages directly from the source text.
   - Calculates estimated total costs over user-selectable periods (`3`, `6`, `12`, or `24` months), compares base cost vs. inflated cost with pre-selected add-ons, states calculation assumptions clearly, and cites the verbatim supporting clause for every figure. Never invents prices when absent.

4. **Feature 4 — OpenShield Action Plan (`generateActionPlan`)**
   - Generates a prioritized, interactive checklist (**"What should you do next?"** / **"आगे आपको क्या करना चाहिए?"**) distinguishing **Suggested Actions** from **User-Marked Completed Actions**, with verified official cancellation links when available. Never clicks purchase or cancellation buttons automatically.

5. **Feature 5 — Side-by-Side Clause Translator & India-First Consumer Intelligence**
   - **Bilingual Support (`English | हिन्दी`)**: Translates explanations, consumer impact, action plan steps, and cost assumptions into clear Hindi while preserving the **exact original legal quotation verbatim** so evidentiary meaning is never altered.
   - **India Regulatory Context**: Cites applicable provisions from the **CCPA Guidelines for Prevention and Regulation of Dark Patterns, 2023**, **Consumer Protection Act, 2019 (Section 2(46) Unfair Contracts)**, **RBI e-Mandate / Recurring Transaction Framework**, and **Digital Personal Data Protection Act (DPDP Act), 2023** with verification dates (`2026-10-01`) and official URLs.

6. **Feature 6 — Live Chrome Extension & Checkout Trap Detector (`extension/` & Simulator)**
   - Manifest V3 browser extension (`manifest.json`, `content.js`, `styles.css`, `popup.html`, `popup.js`) with local no-redirect installation.
   - Includes **Rescan Page**, **Pause Scanning on This Site**, **Dismiss Individual Warnings**, **1-Click UI Neutralization** (with smooth progress feedback), and **Download Forensic Audit Report (JSON)**.

7. **Feature 7 — Open-Source Transparency Engine & Rule Registry**
   - Exposes all 14 auditable rules (`CLAUSE_DETECTION_RULES`) with unique rule IDs, rule versions (`v1.2.0`), matching logic summaries, false-positive negation guards, positive/negative test cases, and local privacy-conscious false-positive reporting.

---

## Local Setup, Testing & Verification

```bash
# 1. Install dependencies
npm install

# 2. Run the 14-test unit suite (SSRF, Prompt Injection, PDF/Image validation, Hidden Cost Calculator, Bilingual EN/HI, Policy Diff, Rule Registry, Firestore Rules)
./node_modules/.bin/tsx --test src/engine/documentAndUrlAnalyzer.test.ts src/engine/openshieldEngine.test.ts src/engine/firestore.rules.test.ts

# 3. Start full-stack Express + Vite server on http://localhost:3000
npm run dev
```

---

## Open-Source Research & Dataset Provenance

- **Central Consumer Protection Authority (CCPA) Guidelines for Prevention and Regulation of Dark Patterns, 2023** (`consumeraffairs.nic.in`, Gazette Notification dated 30 Nov 2023)
- **Consumer Protection Act, 2019 & Digital Personal Data Protection Act, 2023** (`consumeraffairs.nic.in`, `meity.gov.in`)
- **Princeton / University of Chicago WebTap Dark Patterns Corpus** (Mathur et al., *Dark Patterns at Scale*, ACM CSCW 2019)
- **Deceptive Design Taxonomy** (Harry Brignull, `deceptive.design`)
- **ToS;DR (Terms of Service; Didn't Read)** (`tosdr.org`, CC BY-SA 3.0)
- **JustDeleteMe Directory** (`justdelete.me`, MIT License)
