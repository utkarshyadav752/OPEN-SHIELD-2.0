/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  Shield,
  Search,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  RotateCcw,
  Plus,
  ArrowRight,
  Lock,
  Loader2,
  Eye,
  EyeOff,
  Download,
  PauseCircle,
  PlayCircle,
  X,
  Globe,
  Menu,
  FileText,
  LogIn,
  LogOut,
  UserCheck,
} from 'lucide-react';
import {
  analyzeLegalText,
  type AnalysisReport,
  type RiskLevel,
  type SupportedLanguage,
} from './engine/documentAndUrlAnalyzer';
import { DocumentAnalyzerSection } from './components/DocumentAnalyzerSection';
import {
  HiddenCostCalculatorCard,
  ActionPlanChecklistCard,
  EvidenceFindingCard,
  OpenSourceRuleRegistryPanel,
} from './components/IntelligenceReportSections';
import { OpenShield3DScene, type Shield3DVisualMode } from './components/OpenShield3DScene';
import { OpenShield3DButton } from './components/OpenShield3DButton';
import { OpenShieldLogo } from './components/OpenShieldLogo';
import {
  ListenToResultsPanel,
  type ActiveSpokenTarget,
} from './components/ListenToResultsPanel';
import { EducationalContentSection } from './components/EducationalContentSection';
import {
  auth,
  signInWithGoogle,
  signOutUser,
  onAuthStateChanged,
  type User,
} from './firebase';

interface SimulatedCheckoutItems {
  basePrice: string;
  inflatedPrice: string;
  urgencyBanner: string;
  scarcityText: string;
  sneakyAddons: Array<{ label: string; price: string }>;
  shamingDeclineText: string;
  acceptButtonText: string;
  tosSnippet: string;
}

interface LegacyUrlAudit {
  url: string;
  domain: string;
  grade: 'A' | 'B' | 'C' | 'D' | 'F';
  urgencyCount: number;
  sneakyCount: number;
  shamingCount: number;
  tosRisks: string[];
  findings: string[];
  cancellationDifficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'IMPOSSIBLE';
  cancellationSteps: string;
  directCancelUrl: string;
  summary: string;
  simulatedCheckoutItems: SimulatedCheckoutItems;
}

const MASTER_FORENSIC_PROMPT = `You are OpenShield Core — a Principal Consumer Protection Auditor, UI/UX Forensic Engineer (trained on the Princeton WebTap Dark Patterns Corpus, Brignull's Deceptive Design Taxonomy, ToS;DR, and JustDeleteMe), and Legal Clause Analyst.

TARGET WEBSITE / URL TO AUDIT: {{INSERT_WEBSITE_LINK_HERE}}

Execute a rigorous 5-part forensic audit of this website or checkout page:

1. EXECUTIVE SAFETY GRADE (A, B, C, D, or F):
   - Grade A: Ethical UI, zero pre-checked boxes, transparent pricing, 1-click cancellation, fair ToS.
   - Grade B: Minor promotional nudges, clear opt-outs, simple online cancellation.
   - Grade C: Noticeable urgency pressure or multi-step cancellation, standard arbitration clause.
   - Grade D: Aggressive dark patterns (countdown timers, hidden fees, confirm-shaming) or hard "Iliad Flow" cancellation.
   - Grade F: Predatory Roach Motel (requires phone call/certified mail to cancel, sneaky auto-renewals, pre-checked costly add-ons, forced class-action waiver).

2. DECEPTIVE UI DARK PATTERNS (content.js signature match):
   - Fake Urgency & Scarcity: Countdown timers (00:04:59), "Only X left in stock", "X people viewing this right now".
   - Sneaky Pre-Checked Boxes & Drip Pricing: Pre-ticked insurance/VIP add-ons, hidden service fees added at final checkout.
   - Confirm-Shaming & Visual Interference: Guilt-trip decline copy ("No thanks, I prefer paying full price") or tiny low-contrast opt-out links.

3. PREDATORY TERMS OF SERVICE RED FLAGS:
   - Forced Arbitration & Class-Action Waiver (/waive.*class action|binding arbitration/i)
   - Sells Personal Data to Third Parties (/sell.*third[- ]party|share with marketing partners/i)
   - Sneaky Auto-Renewal Subscription (/auto[- ]?renew|automatically billed|recurring charge/i)
   - Strict No-Refund Clause (/non[- ]refundable|no refunds under any circumstances/i)
   - Claims Permanent Ownership of Content (/irrevocable,?\\s*perpetual.*license/i)
   - Unilateral Modification Without Notice (/modify these terms at any time without notice/i)

4. ROACH MOTEL & CANCELLATION DIFFICULTY (EASY | MEDIUM | HARD | IMPOSSIBLE):
   - Provide exact step-by-step instructions to cancel or delete an account without getting trapped in retention loops, plus the direct cancellation URL.

5. 1-CLICK NEUTRALIZATION PLAN:
   - List every checkbox to uncheck, opt-out link to click, and billing setting to disable before submitting payment.`;

const INITIAL_ADOBE_RAW_TEXT = `Section 1. Annual Contract, Paid Monthly
Your Creative Cloud plan is billed at ₹1,675 per month under an annual commitment and your subscription will automatically renew each year unless you cancel before your annual renewal date.
Section 2. Cancellation & Early Termination Fee
Should you cancel after 14 days of your initial order, you will be billed a non-refundable early termination fee equal to 50% of your remaining annual contract obligation. All fees are non-refundable once the 14-day period expires.
Section 3. Free Trials & Add-On Conversions
Your 30-day Adobe Stock free trial will automatically convert to a paid monthly subscription of ₹2,399 per month unless cancelled before the trial ends. Optional protection and stock add-ons are pre-selected at checkout for convenience.
Section 4. Dispute Resolution & Arbitration
Any dispute or claim arising out of these terms shall be resolved through binding arbitration, and you waive any right to participate in a class action lawsuit.
Section 5. Modifications to Terms
We may modify these terms at any time without notice by posting revised terms on our website.`;

const INITIAL_URL_REPORT: AnalysisReport = analyzeLegalText({
  rawText: INITIAL_ADOBE_RAW_TEXT,
  title: 'Adobe Creative Cloud Subscription & Cancellation Terms',
  sourceType: 'url',
  sourceLabel: 'https://www.adobe.com/creativecloud/plans.html',
  pageCount: 1,
  hostname: 'adobe.com',
  analysisMode: 'Gemini AI + Forensic Rules',
});

const INITIAL_LEGACY_AUDIT: LegacyUrlAudit = {
  url: 'https://www.adobe.com/creativecloud/plans.html',
  domain: 'adobe.com',
  grade: 'F',
  urgencyCount: 2,
  sneakyCount: 2,
  shamingCount: 1,
  tosRisks: [
    'Sneaky Auto-Renewal Subscription',
    'Strict No-Refund Clause (50% Early Termination Fee)',
    'Can Change Rules Anytime Without Notice',
  ],
  findings: [
    'Pre-ticked opt-in checkbox found: Adobe Stock 30-day auto-renewing trial',
    'Sneaky Trap: "Annual Plan, Paid Monthly" locks users into a 12-month contract',
    'ToS Risk: 50% early termination penalty charged if canceled after 14 days',
    'Confirm-Shaming: "No thanks, I prefer to pay full price and risk losing cloud backups"',
  ],
  cancellationDifficulty: 'HARD',
  cancellationSteps:
    'Navigate to Account -> Plans & Payment -> Manage Plan -> Cancel Plan. Decline 3 consecutive retention discount screens and verify whether a 50% early termination fee applies.',
  directCancelUrl: 'https://account.adobe.com/plans',
  summary:
    'Adobe uses an "Annual Plan, Paid Monthly" structure that looks like a monthly subscription but enforces a 50% early termination fee of remaining contract obligations after 14 days.',
  simulatedCheckoutItems: {
    basePrice: '₹1,675/mo',
    inflatedPrice: '₹4,074/mo',
    urgencyBanner: 'Hurry! Offer expires in 00:08:42 — 41 people are viewing this plan!',
    scarcityText: 'Only 2 seats left at this promotional rate!',
    sneakyAddons: [
      { label: 'Add Adobe Stock 10-Asset Monthly Plan (Auto-renews after trial)', price: '₹2,399' },
    ],
    shamingDeclineText: 'No thanks, I prefer to pay full price and risk losing cloud backups',
    acceptButtonText: 'Accept Annual Commitment & Start Trial',
    tosSnippet:
      'Should you cancel after 14 days, you will be billed a non-refundable 50% early termination fee of your remaining annual contract obligation, which automatically renews. We may modify these terms at any time without notice.',
  },
};

interface ExtensionPresetSite {
  id: string;
  label: string;
  url: string;
  domain: string;
  initialGrade: 'A' | 'B' | 'C' | 'D' | 'F';
  basePrice: string;
  inflatedPrice: string;
  urgencyBanner: string | null;
  scarcityText: string | null;
  addons: Array<{ id: string; label: string; price: string; defaultChecked: boolean }>;
  shamingDeclineText: string;
  acceptButtonText: string;
  tosClauses: Array<{ text: string; flagged: boolean; badge?: string }>;
  tosRisks: string[];
  cancellationDifficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'IMPOSSIBLE';
  directCancelUrl: string;
}

const EXTENSION_PRESET_SITES: ExtensionPresetSite[] = [
  {
    id: 'shadyairlines',
    label: 'ShadyAirlines Checkout (Grade F)',
    url: 'https://shadyairlines.example/final-checkout',
    domain: 'shadyairlines.example',
    initialGrade: 'F',
    basePrice: '₹42,999',
    inflatedPrice: '₹46,497',
    urgencyBanner: 'Hurry! Offer expires in 00:04:57 — 38 people are viewing this flight right now!',
    scarcityText: 'Only 1 left in stock at this fare (₹42,999)!',
    addons: [
      {
        id: 'vip-bag',
        label: 'Add ₹2,499 VIP Baggage Protection (Recommended)',
        price: '₹2,499',
        defaultChecked: true,
      },
      {
        id: 'club-gold',
        label: 'Auto-enroll in ShadyClub Gold for ₹999/month recurring',
        price: '₹999',
        defaultChecked: true,
      },
    ],
    shamingDeclineText:
      "No thanks, I don't like saving money and I'll risk it without flight protection",
    acceptButtonText: 'YES! Protect My Trip & Lock In Price',
    tosClauses: [
      {
        text: 'By booking this ticket, you agree to binding arbitration and waive class action rights. ',
        flagged: true,
        badge: 'Forced Arbitration & Class-Action Waiver',
      },
      {
        text: 'Your ShadyClub Gold membership will auto-renew monthly as a recurring charge. ',
        flagged: true,
        badge: 'Sneaky Auto-Renewal Subscription',
      },
      {
        text: 'All bookings are strictly non-refundable under any circumstances. ',
        flagged: true,
        badge: 'Strict No-Refund Clause',
      },
      {
        text: 'We may sell third-party data and share with marketing partners, and modify these terms at any time without notice.',
        flagged: true,
        badge: 'Sells Personal Data & Unilateral Rule Changes',
      },
    ],
    tosRisks: [
      'Forced Arbitration & Class-Action Waiver',
      'Sneaky Auto-Renewal Subscription',
      'Strict No-Refund Clause',
      'Sells Personal Data to Third Parties',
      'Can Change Rules Anytime Without Notice',
    ],
    cancellationDifficulty: 'HARD',
    directCancelUrl: 'https://shadyairlines.example/account/cancel-club',
  },
  {
    id: 'adobe',
    label: 'Adobe Cloud Trial (Grade F)',
    url: 'https://www.adobe.com/creativecloud/plans.html',
    domain: 'adobe.com',
    initialGrade: 'F',
    basePrice: '₹1,675/mo',
    inflatedPrice: '₹4,074/mo',
    urgencyBanner: 'Hurry! Offer expires in 00:08:42 — 41 people are viewing this plan!',
    scarcityText: 'Only 2 seats left at this promotional rate!',
    addons: [
      {
        id: 'stock-trial',
        label: 'Include Adobe Stock 10-Asset Monthly Plan (Auto-billed ₹2,399/mo after trial)',
        price: '₹2,399',
        defaultChecked: true,
      },
    ],
    shamingDeclineText: 'No thanks, I prefer to pay full price and continue without protection',
    acceptButtonText: 'Accept Annual Commitment & Start Trial',
    tosClauses: [
      {
        text: 'Your subscription will automatically renew each year unless canceled before your renewal date. ',
        flagged: true,
        badge: 'Sneaky Auto-Renewal Subscription',
      },
      {
        text: 'Should you cancel after 14 days, you will be charged a non-refundable 50% early termination fee. ',
        flagged: true,
        badge: 'Strict No-Refund Clause',
      },
      {
        text: 'We may modify these terms at any time without notice.',
        flagged: true,
        badge: 'Can Change Rules Anytime Without Notice',
      },
    ],
    tosRisks: [
      'Sneaky Auto-Renewal Subscription',
      'Strict No-Refund Clause',
      'Can Change Rules Anytime Without Notice',
    ],
    cancellationDifficulty: 'HARD',
    directCancelUrl: 'https://account.adobe.com/plans',
  },
  {
    id: 'cleanbooks',
    label: 'CleanBooks Ethical Store (Grade A)',
    url: 'https://cleanbooks.example/cart',
    domain: 'cleanbooks.example',
    initialGrade: 'A',
    basePrice: '₹899',
    inflatedPrice: '₹899',
    urgencyBanner: null,
    scarcityText: null,
    addons: [
      {
        id: 'gift-wrap',
        label: 'Optional: Add recyclable gift wrapping (+₹49)',
        price: '₹49',
        defaultChecked: false,
      },
    ],
    shamingDeclineText: 'Continue with standard shipping',
    acceptButtonText: 'Complete Purchase (₹899)',
    tosClauses: [
      {
        text: '30-day no-questions-asked full refund policy. Zero auto-renewals, zero data selling, and 1-click account deletion at any time.',
        flagged: false,
      },
    ],
    tosRisks: [],
    cancellationDifficulty: 'EASY',
    directCancelUrl: 'https://cleanbooks.example/account/delete',
  },
];

export default function App() {
  const [lang, setLang] = useState<SupportedLanguage>('en');
  const [installedInBrowser, setInstalledInBrowser] = useState<boolean>(false);
  const [showBrowserInstaller, setShowBrowserInstaller] = useState<boolean>(false);
  const [copiedExtUrl, setCopiedExtUrl] = useState<boolean>(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [showLoginModal, setShowLoginModal] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [authNotice, setAuthNotice] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setCurrentUser(u);
    });
    return () => unsub();
  }, []);

  // --- SECTION 1 STATE: Paste a Link and Analyze It ---
  const [manualUrlInput, setManualUrlInput] = useState<string>(
    'https://www.adobe.com/creativecloud/plans.html'
  );
  const [isScanningUrl, setIsScanningUrl] = useState<boolean>(false);
  const [urlReport, setUrlReport] = useState<AnalysisReport>(INITIAL_URL_REPORT);
  const [legacyUrlAudit, setLegacyUrlAudit] = useState<LegacyUrlAudit>(INITIAL_LEGACY_AUDIT);
  const [urlRiskFilter, setUrlRiskFilter] = useState<'ALL' | RiskLevel>('ALL');
  const [urlError, setUrlError] = useState<string | null>(null);
  const [offerPasteFallback, setOfferPasteFallback] = useState<boolean>(false);
  const [showPromptPanel, setShowPromptPanel] = useState<boolean>(false);
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [copiedUrlReport, setCopiedUrlReport] = useState<boolean>(false);
  const [activeUrlSpokenTarget, setActiveUrlSpokenTarget] = useState<ActiveSpokenTarget>({
    sectionId: null,
    findingId: null,
    kind: null,
  });

  // --- Bridge from Section 1 to Section 2 (Paste Text fallback) ---
  const [externalPasteText, setExternalPasteText] = useState<string | null>(null);

  // --- SECTION 3 STATE: Live Chrome Extension Simulator (content.js + popup.js) ---
  const [activeSite, setActiveSite] = useState<ExtensionPresetSite>(EXTENSION_PRESET_SITES[0]);
  const [checkedAddons, setCheckedAddons] = useState<Record<string, boolean>>({
    'vip-bag': true,
    'club-gold': true,
  });
  const [isNeutralized, setIsNeutralized] = useState<boolean>(false);
  const [isNeutralizing, setIsNeutralizing] = useState<boolean>(false);
  const [neutralizeProgress, setNeutralizeProgress] = useState<number>(0);
  const [neutralizeStageText, setNeutralizeStageText] = useState<string>('');
  const [highlightsEnabled, setHighlightsEnabled] = useState<boolean>(true);
  const [injectedPopupCount, setInjectedPopupCount] = useState<number>(0);
  const [pausedSites, setPausedSites] = useState<Record<string, boolean>>({});
  const [dismissedFindings, setDismissedFindings] = useState<Record<string, boolean>>({});
  const [downloadedJsonNotice, setDownloadedJsonNotice] = useState<string | null>(null);

  const isSitePaused = !!pausedSites[activeSite.domain];

  // Zero-Redirect "Add to Browser" handler: stays 100% in-app, arms the 3D shield, and opens the Interactive Browser Activation Studio
  const handleAddToBrowser = () => {
    setInstalledInBrowser(true);
    setShowBrowserInstaller(true);
  };

  const handleCopyExtensionsUrl = () => {
    navigator.clipboard?.writeText('chrome://extensions');
    setCopiedExtUrl(true);
    setTimeout(() => setCopiedExtUrl(false), 2000);
  };

  const shield3DMode: Shield3DVisualMode = isScanningUrl
    ? 'scanning'
    : isNeutralizing
    ? 'neutralizing'
    : installedInBrowser || isNeutralized
    ? 'protected'
    : 'idle';

  const handleManualUrlAudit = async (overrideUrl?: string) => {
    const target = (overrideUrl ?? manualUrlInput).trim();
    if (!target) {
      setUrlError(
        'Please paste or type a valid website or policy URL (e.g., https://www.adobe.com).'
      );
      setOfferPasteFallback(false);
      return;
    }
    setUrlError(null);
    setOfferPasteFallback(false);
    setIsScanningUrl(true);

    try {
      const response = await fetch('/api/analyze-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: target }),
      });
      const data = await response.json();
      if (!response.ok || data.error) {
        setUrlError(data.error || 'Could not analyze the provided URL.');
        setOfferPasteFallback(Boolean(data.offerPasteFallback));
      } else {
        setUrlReport(data.report);
        if (data.legacyAudit) {
          setLegacyUrlAudit(data.legacyAudit);
        }
        setUrlRiskFilter('ALL');
      }
    } catch (err: unknown) {
      setUrlError(err instanceof Error ? err.message : 'Network error while analyzing URL.');
      setOfferPasteFallback(true);
    } finally {
      setIsScanningUrl(false);
    }
  };

  const handleCopyUrlReport = () => {
    const lines = [
      `OpenShield URL Analysis Report — ${urlReport.title}`,
      `URL: ${urlReport.sourceLabel}`,
      `Scanned At: ${new Date(urlReport.scannedAt).toLocaleString()}`,
      `Overall Assessment: ${urlReport.overallRisk} (${urlReport.findings.length} findings)`,
      `Summary: ${lang === 'hi' ? urlReport.overallSummaryHi : urlReport.overallSummary}`,
      '',
      ...urlReport.findings.map(
        (f, i) =>
          `${i + 1}. [${f.riskLevel.toUpperCase()}] ${f.category} — ${
            lang === 'hi' ? f.titleHi : f.title
          } (${f.location})\n   Explanation: ${
            lang === 'hi' ? f.explanationHi : f.explanation
          }\n   Exact Quote: "${f.quote}"\n   Why It Matters: ${
            lang === 'hi' ? f.whyItMattersHi : f.whyItMatters
          }\n   What To Check: ${lang === 'hi' ? f.whatToCheckHi : f.whatToCheck}`
      ),
    ].join('\n');
    navigator.clipboard?.writeText(lines);
    setCopiedUrlReport(true);
    setTimeout(() => setCopiedUrlReport(false), 2000);
  };

  const loadAuditedUrlIntoExtension = (audit: LegacyUrlAudit) => {
    const customSite: ExtensionPresetSite = {
      id: `custom-${audit.domain}`,
      label: `${audit.domain} (Live Link)`,
      url: audit.url.startsWith('http') ? audit.url : `https://${audit.url}`,
      domain: audit.domain,
      initialGrade: audit.grade,
      basePrice: audit.simulatedCheckoutItems.basePrice,
      inflatedPrice: audit.simulatedCheckoutItems.inflatedPrice,
      urgencyBanner: audit.urgencyCount > 0 ? audit.simulatedCheckoutItems.urgencyBanner : null,
      scarcityText: audit.urgencyCount > 0 ? audit.simulatedCheckoutItems.scarcityText : null,
      addons: audit.simulatedCheckoutItems.sneakyAddons.map((a, idx) => ({
        id: `custom-addon-${idx}`,
        label: a.label,
        price: a.price,
        defaultChecked: true,
      })),
      shamingDeclineText: audit.simulatedCheckoutItems.shamingDeclineText,
      acceptButtonText: audit.simulatedCheckoutItems.acceptButtonText,
      tosClauses: [
        {
          text: audit.simulatedCheckoutItems.tosSnippet,
          flagged: audit.tosRisks.length > 0,
          badge: audit.tosRisks[0] || 'ToS Red Flag',
        },
      ],
      tosRisks: audit.tosRisks,
      cancellationDifficulty: audit.cancellationDifficulty,
      directCancelUrl: audit.directCancelUrl,
    };

    setActiveSite(customSite);
    const nextChecked: Record<string, boolean> = {};
    customSite.addons.forEach((a) => {
      nextChecked[a.id] = a.defaultChecked;
    });
    setCheckedAddons(nextChecked);
    setIsNeutralized(false);
    setIsNeutralizing(false);
    setNeutralizeProgress(0);
    setHighlightsEnabled(true);
    setInjectedPopupCount(0);
    setDismissedFindings({});

    const extEl = document.getElementById('extension-work-section');
    if (extEl) {
      extEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const selectPresetSite = (site: ExtensionPresetSite) => {
    setActiveSite(site);
    const nextChecked: Record<string, boolean> = {};
    site.addons.forEach((a) => {
      nextChecked[a.id] = a.defaultChecked;
    });
    setCheckedAddons(nextChecked);
    setIsNeutralized(false);
    setIsNeutralizing(false);
    setNeutralizeProgress(0);
    setHighlightsEnabled(true);
    setInjectedPopupCount(0);
    setDismissedFindings({});
  };

  const handleEqualizeUI = () => {
    if (isNeutralizing || isNeutralized || isSitePaused) return;
    setIsNeutralizing(true);
    setNeutralizeProgress(28);
    setNeutralizeStageText('Unchecking sneaky pre-checked add-on boxes...');

    setTimeout(() => {
      setNeutralizeProgress(68);
      setNeutralizeStageText('Stripping fake urgency & scarcity countdown timers...');
    }, 180);

    setTimeout(() => {
      setNeutralizeProgress(100);
      setNeutralizeStageText('Equalizing confirm-shaming links & restoring Grade A...');
    }, 360);

    setTimeout(() => {
      const cleared: Record<string, boolean> = {};
      activeSite.addons.forEach((a) => {
        cleared[a.id] = false;
      });
      setCheckedAddons(cleared);
      setInjectedPopupCount(0);
      setIsNeutralizing(false);
      setIsNeutralized(true);
    }, 560);
  };

  const handleResetExtensionDemo = () => {
    selectPresetSite(activeSite);
  };

  const togglePauseOnSite = () => {
    setPausedSites((prev) => ({
      ...prev,
      [activeSite.domain]: !prev[activeSite.domain],
    }));
  };

  const liveSneakyCount = isSitePaused
    ? 0
    : Object.values(checkedAddons).filter(Boolean).length;
  const liveUrgencyCount =
    isSitePaused || isNeutralized
      ? 0
      : (activeSite.urgencyBanner ? 1 : 0) +
        (activeSite.scarcityText ? 1 : 0) +
        injectedPopupCount;
  const liveShamingCount =
    isSitePaused || isNeutralized || activeSite.initialGrade === 'A' ? 0 : 1;
  const liveTosRiskCount = isSitePaused ? 0 : activeSite.tosRisks.length;

  const totalLiveIssues =
    liveSneakyCount + liveUrgencyCount + liveShamingCount + liveTosRiskCount * 2;

  const liveGrade: 'A' | 'B' | 'C' | 'D' | 'F' =
    isSitePaused || isNeutralized
      ? 'A'
      : totalLiveIssues === 0
      ? 'A'
      : totalLiveIssues <= 2
      ? 'B'
      : totalLiveIssues <= 5
      ? 'C'
      : totalLiveIssues <= 8
      ? 'D'
      : 'F';

  const rawLiveFindings: string[] = [];
  if (!isSitePaused) {
    if (liveSneakyCount > 0) {
      rawLiveFindings.push(`Pre-ticked opt-in checkbox found (${liveSneakyCount})`);
    }
    if (liveUrgencyCount > 0 && activeSite.urgencyBanner) {
      rawLiveFindings.push(`Fake Urgency: "${activeSite.urgencyBanner.slice(0, 58)}..."`);
    }
    if (liveShamingCount > 0) {
      rawLiveFindings.push(`Confirm-Shaming: "${activeSite.shamingDeclineText.slice(0, 58)}..."`);
    }
    activeSite.tosRisks.forEach((risk) => {
      rawLiveFindings.push(`ToS Risk: ${risk}`);
    });
  }

  const liveFindings = rawLiveFindings.filter((f) => !dismissedFindings[f]);

  const handleDownloadAuditJson = () => {
    const reportPayload = {
      reportVersion: '1.0.0',
      generatedAt: new Date().toISOString(),
      scanner: 'OpenShield — Dark Pattern & ToS Buster (Manifest V3)',
      target: {
        domain: activeSite.domain,
        url: activeSite.url,
        uiNeutralized: isNeutralized,
        scanningPausedOnSite: isSitePaused,
        basePrice: activeSite.basePrice,
        inflatedPrice: activeSite.inflatedPrice,
        activeCheckoutTotal:
          isNeutralized || liveSneakyCount === 0
            ? activeSite.basePrice
            : activeSite.inflatedPrice,
      },
      gradeAssessment: {
        currentGrade: liveGrade,
        initialGrade: activeSite.initialGrade,
        totalWeightedIssues: totalLiveIssues,
        cancellationDifficulty: activeSite.cancellationDifficulty,
        directUnsubscribeUrl: activeSite.directCancelUrl,
      },
      darkPatternBreakdown: {
        fakeUrgencyAndScarcityCount: liveUrgencyCount,
        sneakyPreCheckedBoxesCount: liveSneakyCount,
        confirmShamingCount: liveShamingCount,
        tosRedFlagsCount: liveTosRiskCount,
      },
      detectedTraps: liveFindings,
      tosAnalysis: {
        redFlagCategories: activeSite.tosRisks,
        clausesInspected: activeSite.tosClauses.map((c) => ({
          clauseText: c.text.trim(),
          flaggedAsPredatory: c.flagged,
          riskCategory: c.badge || null,
        })),
      },
    };

    const jsonString = JSON.stringify(reportPayload, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const blobUrl = URL.createObjectURL(blob);
    const filename = `openshield-forensic-audit-${activeSite.domain.replace(/[^a-z0-9.-]/gi, '-')}.json`;

    const link = document.createElement('a');
    link.href = blobUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(blobUrl);

    setDownloadedJsonNotice(`Downloaded ${filename}`);
    setTimeout(() => setDownloadedJsonNotice(null), 3000);
  };

  const handleCopyPrompt = () => {
    const textToCopy = MASTER_FORENSIC_PROMPT.replace(
      '{{INSERT_WEBSITE_LINK_HERE}}',
      manualUrlInput || 'https://example.com'
    );
    navigator.clipboard?.writeText(textToCopy);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const scrollToId = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const gradeBadgeStyle = (g: 'A' | 'B' | 'C' | 'D' | 'F') => {
    if (g === 'A' || g === 'B') return 'bg-emerald-600 text-white';
    if (g === 'C') return 'bg-amber-500 text-slate-950';
    return 'bg-red-600 text-white';
  };

  const filteredUrlFindings =
    urlRiskFilter === 'ALL'
      ? urlReport.findings
      : urlReport.findings.filter((f) => f.riskLevel === urlRiskFilter);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col overflow-x-hidden">
      {/* Top Bar: Minimal Shield Logo + "OpenShield" Wordmark — Responsive Nav — Auth & 3D Add to Browser */}
      <header className="sticky top-0 z-40 bg-[#050814]/95 border-b border-slate-800/90 text-white">
        <div className="max-w-[1200px] mx-auto flex items-center justify-between gap-3 px-4 sm:px-6 py-3">
          <a
            href="#top"
            data-testid="navbar-brand-link"
            onClick={(e) => {
              e.preventDefault();
              setMobileMenuOpen(false);
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className="inline-flex items-center gap-2.5 text-base sm:text-lg font-extrabold tracking-tight text-white whitespace-nowrap shrink-0"
          >
            <OpenShieldLogo size={32} testId="navbar-brand-logo" />
            <span>OpenShield</span>
          </a>

          <nav
            aria-label="Primary Product Navigation"
            className="hidden lg:flex items-center gap-6 text-sm font-semibold text-slate-300"
          >
            <a
              href="#manual-link-section"
              onClick={(e) => {
                e.preventDefault();
                scrollToId('manual-link-section');
              }}
              className="hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0"
            >
              {lang === 'hi' ? 'शर्तें जाँचें' : 'Analyze Terms'}
            </a>
            <a
              href="#upload-document-section"
              onClick={(e) => {
                e.preventDefault();
                scrollToId('upload-document-section');
              }}
              className="hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0"
            >
              {lang === 'hi' ? 'दस्तावेज़ अपलोड' : 'Upload Document'}
            </a>
            <a
              href="#extension-work-section"
              onClick={(e) => {
                e.preventDefault();
                scrollToId('extension-work-section');
              }}
              className="hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0"
            >
              {lang === 'hi' ? 'क्रोम एक्सटेंशन' : 'Chrome Extension'}
            </a>
            <a
              href="#educational-content-section"
              onClick={(e) => {
                e.preventDefault();
                scrollToId('educational-content-section');
              }}
              className="hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0"
            >
              {lang === 'hi' ? 'शैक्षिक लेख' : 'Education'}
            </a>
            <a
              href="#open-source-rules-section"
              onClick={(e) => {
                e.preventDefault();
                scrollToId('open-source-rules-section');
              }}
              className="hover:text-cyan-300 transition-colors whitespace-nowrap shrink-0"
            >
              {lang === 'hi' ? 'नियम रजिस्ट्री' : 'Rule Registry'}
            </a>
          </nav>

          <div className="flex items-center gap-2 shrink-0">
            {/* Bilingual Selector: English | हिन्दी */}
            <div
              role="group"
              aria-label="Language selector"
              className="hidden sm:inline-flex items-center rounded-full bg-slate-900 p-0.5 border border-slate-700/90 text-xs"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400 ml-2 mr-1 hidden md:inline" />
              <button
                type="button"
                data-testid="lang-toggle-en"
                onClick={() => setLang('en')}
                className={`px-2.5 py-1 rounded-full font-bold cursor-pointer transition-colors ${
                  lang === 'en'
                    ? 'bg-cyan-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                English
              </button>
              <button
                type="button"
                data-testid="lang-toggle-hi"
                onClick={() => setLang('hi')}
                className={`px-2.5 py-1 rounded-full font-bold cursor-pointer transition-colors ${
                  lang === 'hi'
                    ? 'bg-cyan-400 text-slate-950'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                हिन्दी
              </button>
            </div>

            {/* Sign In / Account Trigger (Opens branded login/account dialog) */}
            <button
              type="button"
              data-testid="navbar-login-btn"
              onClick={() => setShowLoginModal(true)}
              className="hidden md:inline-flex items-center gap-1.5 min-h-[40px] px-3.5 py-1.5 rounded-full bg-slate-900 hover:bg-slate-800 border border-slate-700 text-xs font-bold text-slate-200 cursor-pointer transition-colors whitespace-nowrap shrink-0"
            >
              {currentUser ? (
                <>
                  <UserCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>{currentUser.displayName?.split(' ')[0] || 'Account'}</span>
                </>
              ) : (
                <>
                  <LogIn className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>{lang === 'hi' ? 'लॉग इन' : 'Sign In'}</span>
                </>
              )}
            </button>

            {/* Desktop No-Redirect 3D Add to Browser Button */}
            <div className="hidden sm:block">
              <OpenShield3DButton
                testId="top-add-to-browser"
                size="sm"
                installedInBrowser={installedInBrowser}
                onClick={handleAddToBrowser}
                label={lang === 'hi' ? 'ब्राउज़र में जोड़ें' : 'Add to Browser'}
                installedLabel={lang === 'hi' ? 'ब्राउज़र में जोड़ा गया' : 'Added to Browser'}
              />
            </div>

            {/* Mobile Hamburger Menu Button (44x44px touch target) */}
            <button
              type="button"
              data-testid="mobile-menu-toggle"
              aria-expanded={mobileMenuOpen}
              aria-controls="mobile-navigation-drawer"
              aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
              onClick={() => setMobileMenuOpen((prev) => !prev)}
              className="lg:hidden inline-flex items-center justify-center min-w-[44px] min-h-[44px] rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-100 cursor-pointer transition-colors"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div
            id="mobile-navigation-drawer"
            data-testid="mobile-navigation-drawer"
            className="lg:hidden border-t border-slate-800 bg-[#050814] px-4 pt-3 pb-5 space-y-3"
          >
            <nav className="flex flex-col space-y-1" aria-label="Mobile Navigation">
              <a
                href="#manual-link-section"
                onClick={(e) => {
                  e.preventDefault();
                  setMobileMenuOpen(false);
                  scrollToId('manual-link-section');
                }}
                className="min-h-[44px] px-3 rounded-xl flex items-center justify-between text-sm font-bold text-slate-100 hover:bg-slate-900"
              >
                <span>{lang === 'hi' ? 'शर्तें और URL जाँचें' : 'Analyze Terms & URL'}</span>
                <ArrowRight className="w-4 h-4 text-cyan-400" />
              </a>
              <a
                href="#upload-document-section"
                onClick={(e) => {
                  e.preventDefault();
                  setMobileMenuOpen(false);
                  scrollToId('upload-document-section');
                }}
                className="min-h-[44px] px-3 rounded-xl flex items-center justify-between text-sm font-bold text-slate-100 hover:bg-slate-900"
              >
                <span>{lang === 'hi' ? 'दस्तावेज़ और टेक्स्ट अपलोड' : 'Upload Document & Text'}</span>
                <ArrowRight className="w-4 h-4 text-cyan-400" />
              </a>
              <a
                href="#extension-work-section"
                onClick={(e) => {
                  e.preventDefault();
                  setMobileMenuOpen(false);
                  scrollToId('extension-work-section');
                }}
                className="min-h-[44px] px-3 rounded-xl flex items-center justify-between text-sm font-bold text-slate-100 hover:bg-slate-900"
              >
                <span>{lang === 'hi' ? 'लाइव क्रोम एक्सटेंशन' : 'Live Chrome Extension'}</span>
                <ArrowRight className="w-4 h-4 text-cyan-400" />
              </a>
              <a
                href="#educational-content-section"
                onClick={(e) => {
                  e.preventDefault();
                  setMobileMenuOpen(false);
                  scrollToId('educational-content-section');
                }}
                className="min-h-[44px] px-3 rounded-xl flex items-center justify-between text-sm font-bold text-slate-100 hover:bg-slate-900"
              >
                <span>{lang === 'hi' ? 'शैक्षिक लेख और अधिकार' : 'Educational Content'}</span>
                <ArrowRight className="w-4 h-4 text-cyan-400" />
              </a>
              <a
                href="#open-source-rules-section"
                onClick={(e) => {
                  e.preventDefault();
                  setMobileMenuOpen(false);
                  scrollToId('open-source-rules-section');
                }}
                className="min-h-[44px] px-3 rounded-xl flex items-center justify-between text-sm font-bold text-slate-100 hover:bg-slate-900"
              >
                <span>{lang === 'hi' ? 'ओपन-सोर्स नियम रजिस्ट्री' : 'Open-Source Rule Registry'}</span>
                <ArrowRight className="w-4 h-4 text-cyan-400" />
              </a>
            </nav>

            <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-2">
              <div className="inline-flex items-center rounded-full bg-slate-900 p-1 border border-slate-700 text-xs">
                <button
                  type="button"
                  onClick={() => setLang('en')}
                  className={`min-h-[36px] px-3 rounded-full font-bold cursor-pointer ${
                    lang === 'en' ? 'bg-cyan-400 text-slate-950' : 'text-slate-300'
                  }`}
                >
                  English
                </button>
                <button
                  type="button"
                  onClick={() => setLang('hi')}
                  className={`min-h-[36px] px-3 rounded-full font-bold cursor-pointer ${
                    lang === 'hi' ? 'bg-cyan-400 text-slate-950' : 'text-slate-300'
                  }`}
                >
                  हिन्दी
                </button>
              </div>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setShowLoginModal(true);
                }}
                className="min-h-[44px] px-4 rounded-xl bg-slate-900 border border-slate-700 text-xs font-bold text-slate-100 inline-flex items-center gap-2 cursor-pointer"
              >
                <LogIn className="w-4 h-4 text-cyan-400" />
                <span>{currentUser ? 'Account' : 'Sign In'}</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  scrollToId('manual-link-section');
                }}
                className="min-h-[48px] w-full px-4 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Search className="w-4 h-4 shrink-0" />
                <span>{lang === 'hi' ? 'शर्तें विश्लेषण करें' : 'Analyze Terms'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMobileMenuOpen(false);
                  handleAddToBrowser();
                }}
                className="min-h-[48px] w-full px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 border border-cyan-500/40 text-white font-extrabold text-sm inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <Shield className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>
                  {installedInBrowser
                    ? lang === 'hi'
                      ? 'ब्राउज़र में जोड़ा गया'
                      : 'Added to Browser'
                    : lang === 'hi'
                    ? 'ब्राउज़र में जोड़ें'
                    : 'Add to Browser'}
                </span>
              </button>
            </div>
          </div>
        )}
      </header>

      <main
        id="top"
        className="flex-1 max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-10"
      >
        {/* PREMIUM AI CYBERSECURITY HERO SECTION WITH STATIC-SVG-FIRST -> 3D SHIELD */}
        <section
          data-testid="hero-section"
          className="relative rounded-3xl bg-gradient-to-br from-[#050814] via-[#0A1124] to-[#0F172A] text-white border border-slate-800/90 p-5 sm:p-8 lg:p-10 shadow-[0_25px_60px_-20px_rgba(2,6,23,0.65)] overflow-hidden"
        >
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-center">
            {/* Left 7 Columns: Headline, Value Proposition, and Primary CTAs */}
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-cyan-500/30 text-cyan-300 text-xs font-bold shadow-sm max-w-full">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                <span className="truncate">
                  OpenShield AI · Hidden-Terms &amp; Dark-Pattern Detector
                </span>
                <span className="text-slate-600 hidden sm:inline">·</span>
                <span className="text-violet-300 hidden sm:inline shrink-0">100% Privacy-First</span>
              </div>

              <div>
                <h1 className="text-3xl sm:text-4xl lg:text-[42px] font-extrabold text-white tracking-tight leading-[1.12] text-balance">
                  {lang === 'hi'
                    ? 'सहमति देने से पहले नियमों और शर्तों में छिपे जोखिमों और डार्क पैटर्न को पकड़ें।'
                    : 'Detect Hidden Risks in Terms & Conditions Before You Agree.'}
                </h1>

                <p className="text-sm sm:text-base text-slate-300 mt-3.5 max-w-2xl leading-relaxed">
                  {lang === 'hi'
                    ? 'AI-आधारित दस्तावेज़, URL और चेकआउट विश्लेषण जो अन्यायपूर्ण क्लॉज़, ऑटो-रिन्यूअल ट्रैप, वास्तविक 12-महीने की लागत और भ्रामक वेबसाइट पैटर्न को मूल उद्धरण के साथ उजागर करता है।'
                    : 'AI-powered document, URL, and checkout analysis that exposes predatory renewal clauses, forced arbitration, hidden 12-month costs, and manipulative dark patterns—verified by exact source quotations.'}
                </p>
              </div>

              {/* Primary CTA Row: Prominent "Analyze Terms" CTA + 3D "Add to Browser" + Upload Document */}
              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 pt-1">
                <button
                  type="button"
                  data-testid="hero-analyze-terms-cta"
                  onClick={() => scrollToId('manual-link-section')}
                  className="min-h-[54px] px-7 py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 to-sky-500 hover:from-cyan-300 hover:to-sky-400 text-slate-950 font-extrabold text-sm cursor-pointer transition-all shadow-lg shadow-cyan-500/25 inline-flex items-center justify-center gap-2.5 whitespace-nowrap shrink-0"
                >
                  <Search className="w-4 h-4 shrink-0" />
                  <span>{lang === 'hi' ? 'शर्तें विश्लेषण करें' : 'Analyze Terms'}</span>
                  <ArrowRight className="w-4 h-4 shrink-0" />
                </button>

                <OpenShield3DButton
                  testId="hero-add-to-browser"
                  size="lg"
                  installedInBrowser={installedInBrowser}
                  onClick={handleAddToBrowser}
                  label={lang === 'hi' ? 'ब्राउज़र में जोड़ें' : 'Add to Browser'}
                  installedLabel={lang === 'hi' ? 'ब्राउज़र में जोड़ा गया' : 'Added to Browser'}
                />

                <button
                  type="button"
                  data-testid="hero-upload-doc-cta"
                  onClick={() => scrollToId('upload-document-section')}
                  className="min-h-[54px] px-5 py-3.5 rounded-2xl bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-100 font-bold text-sm cursor-pointer transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                >
                  <FileText className="w-4 h-4 text-violet-400 shrink-0" />
                  <span>{lang === 'hi' ? 'दस्तावेज़ अपलोड करें' : 'Upload PDF / Text'}</span>
                </button>
              </div>

              {/* Cybersecurity Telemetry & Trust Metric Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3.5 rounded-2xl bg-[#0B132B]/90 border border-slate-800">
                  <div className="text-xs font-bold text-slate-400">
                    {lang === 'hi' ? 'क्लॉज़ सिग्नेचर' : 'Forensic Rules'}
                  </div>
                  <div className="text-lg sm:text-xl font-extrabold text-white mt-0.5 tabular-nums">
                    14 Signatures
                  </div>
                  <div className="text-[11px] text-cyan-400 font-semibold">
                    Exact Source Quotations
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0B132B]/90 border border-slate-800">
                  <div className="text-xs font-bold text-slate-400">
                    {lang === 'hi' ? 'लागत कैलकुलेटर' : 'Financial Impact'}
                  </div>
                  <div className="text-lg sm:text-xl font-extrabold text-white mt-0.5 tabular-nums">
                    INR &amp; USD
                  </div>
                  <div className="text-[11px] text-violet-300 font-semibold">
                    3–24 Month Cost Model
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-[#0B132B]/90 border border-slate-800">
                  <div className="text-xs font-bold text-slate-400">
                    {lang === 'hi' ? 'ब्राउज़र सुरक्षा' : 'Live Extension'}
                  </div>
                  <div className="text-lg sm:text-xl font-extrabold text-white mt-0.5">
                    Manifest V3
                  </div>
                  <div className="text-[11px] text-emerald-400 font-semibold">
                    1-Click Trap Neutralizer
                  </div>
                </div>
              </div>
            </div>

            {/* Right 5 Columns: Static-SVG-First -> Smooth 3D Hero Shield */}
            <div className="lg:col-span-5 w-full max-w-[480px] mx-auto lg:max-w-none">
              <OpenShield3DScene
                mode={shield3DMode}
                installedInBrowser={installedInBrowser}
                findingsCount={urlReport.findings.length}
                grade={liveGrade}
                lang={lang}
                onActivateBrowserShield={handleAddToBrowser}
              />
            </div>
          </div>

          {/* In-Page Interactive Browser Extension Activation Studio (Zero Redirect, Zero Forced Popup) */}
          {showBrowserInstaller && (
            <div
              data-testid="browser-installer-banner"
              className="mt-8 p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 text-slate-100 border border-emerald-500/30 shadow-2xl space-y-5"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800 pb-4">
                <div className="space-y-1">
                  <div className="inline-flex items-center gap-2 text-xs font-extrabold text-emerald-400">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>
                      {lang === 'hi'
                        ? 'OpenShield ब्राउज़र सुरक्षा सक्रिय — कोई बाहरी रीडायरेक्ट नहीं'
                        : 'OpenShield Browser Protection Activated In-App — Zero External Redirect'}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300">
                    {lang === 'hi'
                      ? 'नीचे दिए गए इंटरैक्टिव ब्राउज़र टूलबार में OpenShield पिन हो चुका है, या आप अपने Chrome/Brave/Edge के लिए लोकल Manifest V3 पैकेज विकल्प चुन सकते हैं।'
                      : 'OpenShield is now armed in the interactive browser environment below. You can immediately test live dark-pattern neutralization or optionally load the unpacked Manifest V3 folder in Chrome, Brave, or Edge.'}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    data-testid="launch-live-extension-btn"
                    onClick={() => scrollToId('extension-work-section')}
                    className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold cursor-pointer transition-colors inline-flex items-center gap-1.5 whitespace-nowrap shadow-md"
                  >
                    <Shield className="w-3.5 h-3.5 shrink-0" />
                    <span>
                      {lang === 'hi'
                        ? 'लाइव ब्राउज़र एक्सटेंशन चलाएँ'
                        : 'Open Live Extension Simulator'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowBrowserInstaller(false)}
                    aria-label="Close installer studio"
                    className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* 3-Step Visual Interactive Browser Integration Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-400 whitespace-nowrap">
                      Step 1 · Instant Shield
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-bold whitespace-nowrap">
                      Active Now
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    Your 3D Forensic Shield is armed right inside this workspace—no Chrome Web Store redirect required.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-sky-400 whitespace-nowrap">
                      Step 2 · Developer Load
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyExtensionsUrl}
                      className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-[11px] font-bold cursor-pointer inline-flex items-center gap-1 whitespace-nowrap shrink-0"
                    >
                      {copiedExtUrl ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3 shrink-0" />
                          <span>Copy URL</span>
                        </>
                      )}
                    </button>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    To install in your system browser: paste <code className="text-sky-300">chrome://extensions</code>, enable <strong>Developer mode</strong>, and click <strong>Load unpacked</strong>.
                  </p>
                </div>

                <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-300">
                      Step 3 · Optional Source Files
                    </span>
                    <span className="text-[10px] text-slate-400">Manifest V3</span>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <a
                      href="/extension/manifest.json"
                      download="manifest.json"
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Download className="w-3 h-3 text-emerald-400" />
                      <span>manifest.json</span>
                    </a>
                    <a
                      href="/extension/content.js"
                      download="content.js"
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Download className="w-3 h-3 text-sky-400" />
                      <span>content.js</span>
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* =====================================================================
            FEATURE 1: PASTE A LINK AND ANALYZE IT (URL ANALYZER + HIDDEN COST + ACTION PLAN)
           ===================================================================== */}
        <section
          id="manual-link-section"
          className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200">
            <div>
              <div className="text-xs font-bold text-[#0b57d0] tracking-wide mb-1">
                01. Paste a Link and Analyze It
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                {lang === 'hi'
                  ? 'वेबसाइट, सब्सक्रिप्शन पेज या नियम व शर्तें (URL) की जाँच करें'
                  : 'Analyze a Website, Subscription Page, or Terms URL'}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                {lang === 'hi'
                  ? 'छिपे हुए शुल्क, ऑटो-रिन्यूअल, बाध्यकारी मध्यस्थता और रद्दीकरण की कठिनाइयों को मूल उद्धरण और कुल लागत अनुमान के साथ देखें।'
                  : 'Paste any public website or policy URL to inspect exact quotations, estimated hidden costs, side-by-side clause translations, and practical next steps.'}
              </p>
            </div>

            <button
              type="button"
              data-testid="toggle-best-prompt-btn"
              onClick={() => setShowPromptPanel((prev) => !prev)}
              className="px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-800 cursor-pointer transition-colors whitespace-nowrap shrink-0 self-start sm:self-center"
            >
              {showPromptPanel ? 'Hide Forensic Prompt' : 'View Best-of-Best Forensic Prompt'}
            </button>
          </div>

          {showPromptPanel && (
            <div className="mt-6 p-5 rounded-xl bg-slate-900 text-slate-100 border border-slate-800">
              <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
                <div>
                  <div className="text-sm font-bold text-white">
                    OpenShield Forensic Dark Pattern &amp; ToS Audit Prompt
                  </div>
                  <div className="text-xs text-slate-400">
                    Grounded in the Princeton WebTap Dark Patterns Corpus, ToS;DR, JustDeleteMe, and CCPA 2023 Guidelines.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCopyPrompt}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs cursor-pointer transition-colors whitespace-nowrap shrink-0"
                >
                  {copiedPrompt ? (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      Copied to Clipboard
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Copy Best-of-Best Prompt
                    </>
                  )}
                </button>
              </div>
              <pre className="text-xs font-mono text-slate-200 bg-slate-950 p-4 rounded-lg overflow-x-auto whitespace-pre-wrap leading-relaxed border border-slate-800">
                {MASTER_FORENSIC_PROMPT.replace(
                  '{{INSERT_WEBSITE_LINK_HERE}}',
                  manualUrlInput || 'https://example.com'
                )}
              </pre>
            </div>
          )}

          {/* Main URL Input & "Analyze website" Button */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleManualUrlAudit();
            }}
            className="mt-6 flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                aria-label="Paste a website or policy URL"
                value={manualUrlInput}
                onChange={(e) => setManualUrlInput(e.target.value)}
                placeholder="Paste a website or policy URL..."
                className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-300 text-sm text-slate-900 focus:outline-none focus:border-[#0b57d0] focus:bg-white"
              />
            </div>
            <button
              type="submit"
              disabled={isScanningUrl}
              data-testid="audit-link-submit-btn"
              className="px-6 py-3 rounded-xl bg-[#0b57d0] hover:bg-[#0842a0] disabled:opacity-50 text-white font-bold text-sm cursor-pointer transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              {isScanningUrl ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Analyzing website...</span>
                </>
              ) : (
                <>
                  <Search className="w-4 h-4" />
                  <span>{lang === 'hi' ? 'वेबसाइट का विश्लेषण करें' : 'Analyze website'}</span>
                </>
              )}
            </button>
          </form>

          {/* Quick Sample Links */}
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-slate-500 font-medium">Sample Policy URLs:</span>
              {[
                { label: 'adobe.com/plans', url: 'https://www.adobe.com/creativecloud/plans.html' },
                { label: 'amazon.com/prime', url: 'https://www.amazon.com/gp/prime' },
                { label: 'planetfitness.com/join', url: 'https://www.planetfitness.com/gyms' },
                { label: 'signal.org (Privacy-First)', url: 'https://signal.org/legal' },
              ].map((sample) => (
                <button
                  key={sample.url}
                  type="button"
                  onClick={() => {
                    setManualUrlInput(sample.url);
                    handleManualUrlAudit(sample.url);
                  }}
                  className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium cursor-pointer transition-colors whitespace-nowrap"
                >
                  {sample.label}
                </button>
              ))}
            </div>
            <span className="text-slate-500">
              Only submitted URLs are analyzed; OpenShield never tracks your browsing history.
            </span>
          </div>

          {urlError && (
            <div
              data-testid="url-error-banner"
              className="mt-4 p-4 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            >
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div>
                  <div className="font-bold">URL Retrieval Notice</div>
                  <div className="mt-0.5">{urlError}</div>
                </div>
              </div>

              {offerPasteFallback && (
                <button
                  type="button"
                  onClick={() => {
                    setExternalPasteText('');
                    scrollToId('upload-document-section');
                  }}
                  className="px-3.5 py-2 rounded-lg bg-red-700 hover:bg-red-800 text-white font-bold text-xs cursor-pointer whitespace-nowrap shrink-0"
                >
                  Paste Terms Text Below Instead
                </button>
              )}
            </div>
          )}

          {/* Structured URL Analysis Report */}
          <div className="mt-6 pt-6 border-t border-slate-200 space-y-6">
            {/* 1. Overall Risk Summary Header */}
            <div
              data-testid="url-overall-summary-card"
              data-tts-active={activeUrlSpokenTarget.kind === 'overview' ? 'true' : 'false'}
              className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-xl border transition-all ${
                activeUrlSpokenTarget.kind === 'overview'
                  ? 'bg-blue-50/60 border-[#0b57d0] ring-2 ring-[#0b57d0]/60 shadow-sm'
                  : 'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <span className="font-bold text-slate-900">{urlReport.title}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono text-slate-700">{urlReport.sourceLabel}</span>
                  <span aria-hidden="true">·</span>
                  <span>{urlReport.analysisMode}</span>
                </div>

                <div className="text-base font-extrabold text-slate-900">
                  {lang === 'hi' ? 'समग्र जोखिम सारांश:' : 'Overall Risk Summary:'}{' '}
                  <span
                    className={
                      urlReport.overallRisk === 'High Concern'
                        ? 'text-red-700'
                        : urlReport.overallRisk === 'Moderate Concern'
                        ? 'text-amber-700'
                        : 'text-emerald-700'
                    }
                  >
                    {urlReport.overallRisk}
                  </span>
                </div>

                <p className="text-xs sm:text-sm text-slate-700 max-w-3xl leading-relaxed">
                  {lang === 'hi' ? urlReport.overallSummaryHi : urlReport.overallSummary}
                </p>
                <p className="text-[11px] text-slate-500">
                  {lang === 'hi' ? urlReport.limitationsHi : urlReport.limitations}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleManualUrlAudit()}
                  className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-800 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Rescan</span>
                </button>

                <button
                  type="button"
                  onClick={handleCopyUrlReport}
                  className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-800 cursor-pointer inline-flex items-center gap-1.5"
                >
                  {copiedUrlReport ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy Report</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  data-testid="load-into-extension-btn"
                  onClick={() => loadAuditedUrlIntoExtension(legacyUrlAudit)}
                  className="px-4 py-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span>Simulate in Chrome Extension</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* 1B. Listen to Results (Text-to-Speech) Panel */}
            <ListenToResultsPanel
              report={urlReport}
              lang={lang}
              testIdPrefix="url-tts"
              onActiveTargetChange={(target) => {
                setActiveUrlSpokenTarget(target);
                if (target.findingId && urlRiskFilter !== 'ALL') {
                  setUrlRiskFilter('ALL');
                }
              }}
            />

            {/* Verified Service Directory Banner */}
            {urlReport.knownServiceInfo && (
              <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <span className="font-bold text-slate-900">
                    Verified Service Directory ({urlReport.knownServiceInfo.serviceName}):
                  </span>{' '}
                  <span className="text-slate-700">
                    Cancellation Difficulty:{' '}
                    <strong>{urlReport.knownServiceInfo.cancellationDifficulty}</strong> · Source:{' '}
                    {urlReport.knownServiceInfo.sourceAttribution} (Verified{' '}
                    {urlReport.knownServiceInfo.lastVerified})
                  </span>
                </div>
                {urlReport.knownServiceInfo.verifiedCancellationUrl && (
                  <a
                    href={urlReport.knownServiceInfo.verifiedCancellationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold text-[#0b57d0] hover:underline inline-flex items-center gap-1 shrink-0"
                  >
                    <span>Direct Cancellation Page</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                )}
              </div>
            )}

            {/* 2. Hidden Cost Calculator */}
            <HiddenCostCalculatorCard
              rawText={urlReport.extractedText}
              initialEstimate={urlReport.hiddenCostEstimate}
              lang={lang}
            />

            {/* 3. Counts by Risk Level Filter Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <button
                type="button"
                onClick={() => setUrlRiskFilter('ALL')}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-colors ${
                  urlRiskFilter === 'ALL'
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="text-xl font-extrabold tabular-nums">
                  {urlReport.findings.length}
                </div>
                <div className="text-xs font-semibold">All Findings</div>
              </button>

              <button
                type="button"
                onClick={() => setUrlRiskFilter('Critical')}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-colors ${
                  urlRiskFilter === 'Critical'
                    ? 'bg-red-700 text-white border-red-700'
                    : 'bg-red-50/70 text-red-950 border-red-200 hover:bg-red-100/70'
                }`}
              >
                <div className="text-xl font-extrabold tabular-nums">
                  {urlReport.countsByRisk.Critical}
                </div>
                <div className="text-xs font-semibold">Critical Risk</div>
              </button>

              <button
                type="button"
                onClick={() => setUrlRiskFilter('High')}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-colors ${
                  urlRiskFilter === 'High'
                    ? 'bg-orange-600 text-white border-orange-600'
                    : 'bg-orange-50/70 text-orange-950 border-orange-200 hover:bg-orange-100/70'
                }`}
              >
                <div className="text-xl font-extrabold tabular-nums">
                  {urlReport.countsByRisk.High}
                </div>
                <div className="text-xs font-semibold">High Risk</div>
              </button>

              <button
                type="button"
                onClick={() => setUrlRiskFilter('Medium')}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-colors ${
                  urlRiskFilter === 'Medium'
                    ? 'bg-amber-500 text-slate-950 border-amber-500'
                    : 'bg-amber-50/70 text-amber-950 border-amber-200 hover:bg-amber-100/70'
                }`}
              >
                <div className="text-xl font-extrabold tabular-nums">
                  {urlReport.countsByRisk.Medium}
                </div>
                <div className="text-xs font-semibold">Medium Risk</div>
              </button>

              <button
                type="button"
                onClick={() => setUrlRiskFilter('Low')}
                className={`p-3.5 rounded-xl border text-left cursor-pointer transition-colors ${
                  urlRiskFilter === 'Low'
                    ? 'bg-slate-700 text-white border-slate-700'
                    : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div className="text-xl font-extrabold tabular-nums">
                  {urlReport.countsByRisk.Low}
                </div>
                <div className="text-xs font-semibold">Low Risk</div>
              </button>
            </div>

            {/* 4. Evidence-First Finding Cards (with Clause Translator & India Legal Context) */}
            {filteredUrlFindings.length === 0 ? (
              <div className="p-6 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-3 text-emerald-950">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div className="text-xs sm:text-sm font-medium">
                  {urlReport.findings.length === 0
                    ? 'No matching predatory clauses or dark patterns were triggered in the retrieved text. (Note: This is not a guarantee that the agreement is completely risk-free.)'
                    : `No findings in the "${urlRiskFilter}" risk level.`}
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {filteredUrlFindings.map((finding) => (
                  <EvidenceFindingCard
                    key={finding.id}
                    finding={finding}
                    lang={lang}
                    testId="url-evidence-card"
                    isBeingReadAloud={activeUrlSpokenTarget.findingId === finding.id}
                  />
                ))}
              </div>
            )}

            {/* 5. OpenShield Action Plan Checklist */}
            <ActionPlanChecklistCard
              actionPlan={urlReport.actionPlan}
              lang={lang}
              isBeingReadAloud={activeUrlSpokenTarget.kind === 'action-plan'}
            />
          </div>
        </section>

        {/* =====================================================================
            FEATURE 2: UPLOAD & ANALYZE DOCUMENTS (PDF · IMAGE · PASTE TEXT · DIFF)
           ===================================================================== */}
        <DocumentAnalyzerSection
          lang={lang}
          externalPasteText={externalPasteText}
          onClearExternalPasteText={() => setExternalPasteText(null)}
        />

        {/* =====================================================================
            FEATURE 3: LIVE CHROME EXTENSION & CHECKOUT TRAP DETECTOR SIMULATOR
           ===================================================================== */}
        <section
          id="extension-work-section"
          className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8"
        >
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
            <div>
              <div className="text-xs font-bold text-[#0b57d0] tracking-wide mb-1">
                03. Live Chrome Extension &amp; Checkout Trap Detector (Manifest V3)
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">
                {lang === 'hi'
                  ? 'रियल-टाइम में चेकआउट ट्रैप की पहचान और निष्क्रियकरण देखें'
                  : 'See How OpenShield Flags & Neutralizes Checkout Traps in Real Time'}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Left: Live webpage with OpenShield&apos;s reversible warning badges and floating
                HUD. Right: The Chrome Extension Popup (`popup.html`) with rescan, site pause,
                dismissal, and 1-click UI equalization.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {EXTENSION_PRESET_SITES.map((site) => (
                <button
                  key={site.id}
                  type="button"
                  onClick={() => selectPresetSite(site)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                    activeSite.id === site.id
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {site.label}
                </button>
              ))}
            </div>
          </div>

          {/* Extension Action Toolbar */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 bg-slate-50 px-4 py-3 rounded-xl border border-slate-200">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isSitePaused}
                onClick={() => setInjectedPopupCount((c) => c + 1)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 disabled:opacity-50 text-amber-900 text-xs font-bold cursor-pointer transition-colors whitespace-nowrap"
              >
                <Plus className="w-3.5 h-3.5" />
                Inject Dynamic Scarcity Trap (MutationObserver)
              </button>

              <button
                type="button"
                onClick={() => setHighlightsEnabled((prev) => !prev)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap"
              >
                {highlightsEnabled ? (
                  <>
                    <Eye className="w-3.5 h-3.5 text-emerald-600" />
                    Extension Overlays: ON
                  </>
                ) : (
                  <>
                    <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                    Extension Overlays: OFF
                  </>
                )}
              </button>

              <button
                type="button"
                data-testid="pause-site-scanning-btn"
                onClick={togglePauseOnSite}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap ${
                  isSitePaused
                    ? 'bg-amber-500 text-slate-950 border-amber-500'
                    : 'bg-white border-slate-300 hover:bg-slate-100 text-slate-700'
                }`}
              >
                {isSitePaused ? (
                  <>
                    <PlayCircle className="w-3.5 h-3.5" />
                    Resume Scanning on {activeSite.domain}
                  </>
                ) : (
                  <>
                    <PauseCircle className="w-3.5 h-3.5" />
                    Pause Scanning on {activeSite.domain}
                  </>
                )}
              </button>
            </div>

            <button
              type="button"
              data-testid="rescan-page-btn"
              onClick={handleResetExtensionDemo}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Rescan Page
            </button>
          </div>

          <div className="mt-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* LEFT 7 COLUMNS: Simulated Browser Tab */}
            <div className="lg:col-span-7 rounded-2xl border border-slate-300 bg-white overflow-hidden shadow-sm">
              <div className="px-4 py-2.5 bg-slate-100 border-b border-slate-200 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-300 flex-1 min-w-0">
                  <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span className="text-xs font-mono text-slate-700 truncate">
                    {activeSite.url}
                  </span>
                </div>
                <span className="text-xs font-semibold text-slate-600 whitespace-nowrap shrink-0">
                  {isSitePaused ? 'content.js: Paused' : 'content.js: Active'}
                </span>
              </div>

              {(isNeutralizing || isNeutralized) && (
                <div
                  data-testid="neutralizing-progress-banner"
                  className="bg-slate-900 text-slate-100 px-5 py-3 border-b border-slate-800 transition-opacity duration-200"
                >
                  <div className="flex items-center justify-between text-xs font-bold mb-1.5">
                    <span className="text-emerald-400 flex items-center gap-2">
                      {isNeutralizing ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>{neutralizeStageText}</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>
                            All UI Dark Patterns Neutralized — Base Price Restored (
                            {activeSite.basePrice})
                          </span>
                        </>
                      )}
                    </span>
                    <span className="font-mono text-emerald-300 tabular-nums">
                      {isNeutralized ? '100%' : `${neutralizeProgress}%`}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-400 rounded-full transition-all duration-200"
                      style={{
                        width: isNeutralized ? '100%' : `${neutralizeProgress}%`,
                      }}
                    />
                  </div>
                </div>
              )}

              <div
                className={`p-6 space-y-5 transition-opacity duration-200 ${
                  isNeutralizing ? 'opacity-50' : 'opacity-100'
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-4 border-b border-slate-200">
                  <div>
                    <h3 className="text-lg font-extrabold text-slate-900">
                      Checkout — {activeSite.domain}
                    </h3>
                    <p className="text-xs text-slate-500">
                      Observable UI patterns vs. suspected dark patterns highlighted non-destructively
                    </p>
                  </div>
                  <div className="px-3.5 py-2 rounded-xl bg-slate-100 border border-slate-200 text-right">
                    <div className="text-[11px] text-slate-500 font-medium">Checkout Total</div>
                    <div className="text-base font-extrabold text-slate-900 tabular-nums">
                      {isNeutralized || liveSneakyCount === 0
                        ? activeSite.basePrice
                        : activeSite.inflatedPrice}
                    </div>
                  </div>
                </div>

                {!isNeutralized && activeSite.urgencyBanner && (
                  <div
                    className={`p-3.5 rounded-lg text-xs font-bold text-orange-950 ${
                      highlightsEnabled && !isSitePaused
                        ? 'openshield-flagged-urgency'
                        : 'bg-orange-50'
                    }`}
                  >
                    <span>🔥 {activeSite.urgencyBanner}</span>
                    {highlightsEnabled && !isSitePaused && (
                      <span className="openshield-badge">⏳ High-Pressure Scarcity / Timer</span>
                    )}
                  </div>
                )}

                {!isNeutralized && activeSite.scarcityText && (
                  <div
                    className={`p-3 rounded-lg text-xs font-semibold text-slate-900 ${
                      highlightsEnabled && !isSitePaused
                        ? 'openshield-flagged-urgency'
                        : 'bg-amber-50'
                    }`}
                  >
                    <span>{activeSite.scarcityText}</span>
                    {highlightsEnabled && !isSitePaused && (
                      <span className="openshield-badge">⏳ High-Pressure Scarcity / Timer</span>
                    )}
                  </div>
                )}

                {!isNeutralized &&
                  Array.from({ length: injectedPopupCount }).map((_, idx) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg text-xs font-semibold text-slate-900 ${
                        highlightsEnabled && !isSitePaused
                          ? 'openshield-flagged-urgency'
                          : 'bg-orange-50'
                      }`}
                    >
                      <span>
                        ⚡ Flash Alert #{idx + 1}: 19 shoppers just booked this in the last 2
                        minutes — hurry, almost gone!
                      </span>
                      {highlightsEnabled && !isSitePaused && (
                        <span className="openshield-badge">
                          ⏳ MutationObserver Caught Scarcity
                        </span>
                      )}
                    </div>
                  ))}

                <div className="space-y-3">
                  <div className="text-xs font-bold text-slate-700">
                    Optional Protection &amp; Membership Add-Ons:
                  </div>
                  {activeSite.addons.map((addon) => {
                    const isChecked = !!checkedAddons[addon.id];
                    const isFlaggedSneaky =
                      isChecked && addon.defaultChecked && highlightsEnabled && !isSitePaused;
                    return (
                      <label
                        key={addon.id}
                        className={`flex items-start justify-between gap-3 p-3.5 rounded-lg border border-slate-200 cursor-pointer text-xs ${
                          isFlaggedSneaky ? 'openshield-flagged-sneaky' : 'bg-slate-50'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={(e) =>
                              setCheckedAddons((prev) => ({
                                ...prev,
                                [addon.id]: e.target.checked,
                              }))
                            }
                            className="mt-0.5 w-4 h-4 accent-red-600 cursor-pointer"
                          />
                          <div>
                            <span className="font-semibold text-slate-900">{addon.label}</span>
                            {isFlaggedSneaky && (
                              <span className="openshield-badge">⚠️ Sneaky Pre-Checked Box</span>
                            )}
                          </div>
                        </div>
                        <span className="font-bold text-slate-900 tabular-nums shrink-0">
                          +{addon.price}
                        </span>
                      </label>
                    );
                  })}
                </div>

                <div className="pt-2 space-y-2.5">
                  <button
                    type="button"
                    className="w-full py-3 px-5 rounded-xl bg-[#0b57d0] text-white font-bold text-sm cursor-pointer"
                  >
                    {activeSite.acceptButtonText}
                  </button>

                  {activeSite.initialGrade === 'A' ? (
                    <button
                      type="button"
                      className="w-full py-2.5 px-4 rounded-xl border border-slate-300 text-slate-700 font-semibold text-xs cursor-pointer"
                    >
                      {activeSite.shamingDeclineText}
                    </button>
                  ) : isNeutralized ? (
                    <button
                      type="button"
                      onClick={handleEqualizeUI}
                      className="openshield-equalized-btn w-full text-center"
                    >
                      Neutralized Honest Decline: Continue Without Extra Add-Ons (Pay{' '}
                      {activeSite.basePrice})
                    </button>
                  ) : (
                    <div
                      className={`p-2.5 text-center ${
                        highlightsEnabled && !isSitePaused ? 'openshield-flagged-shaming' : ''
                      }`}
                    >
                      <button
                        type="button"
                        onClick={handleEqualizeUI}
                        className="text-[11px] text-slate-400 underline cursor-pointer"
                      >
                        {activeSite.shamingDeclineText}
                      </button>
                      {highlightsEnabled && !isSitePaused && (
                        <span className="openshield-badge">🎭 Guilt-Trip / Confirm-Shaming</span>
                      )}
                    </div>
                  )}
                </div>

                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                  <div className="font-bold text-slate-800 mb-1.5">
                    Terms of Service &amp; Billing Fine Print:
                  </div>
                  <p>
                    {activeSite.tosClauses.map((clause, i) => (
                      <React.Fragment key={i}>
                        <span
                          className={
                            clause.flagged && highlightsEnabled && !isSitePaused
                              ? 'openshield-flagged-tos'
                              : ''
                          }
                        >
                          {clause.text}
                        </span>
                        {clause.flagged &&
                          highlightsEnabled &&
                          !isSitePaused &&
                          clause.badge && (
                            <span className="openshield-badge">📜 ToS Trap: {clause.badge}</span>
                          )}
                      </React.Fragment>
                    ))}
                  </p>
                </div>

                <div className="openshield-floating-hud" data-testid="floating-hud">
                  <div>
                    <strong>🛡️ OpenShield:</strong>{' '}
                    {isSitePaused ? (
                      <span className="text-amber-300 font-bold">Paused on this site</span>
                    ) : (
                      <>
                        Grade{' '}
                        <span
                          className={
                            liveGrade === 'A' || liveGrade === 'B'
                              ? 'text-emerald-400 font-extrabold'
                              : 'text-red-400 font-extrabold'
                          }
                        >
                          {liveGrade}
                        </span>{' '}
                        ({liveFindings.length} traps)
                      </>
                    )}
                  </div>
                  <button
                    type="button"
                    data-testid="hud-neutralize-btn"
                    onClick={handleEqualizeUI}
                  >
                    {isNeutralized ? 'UI Neutralized' : 'Neutralize All'}
                  </button>
                </div>
              </div>
            </div>

            {/* RIGHT 5 COLUMNS: Authentic Chrome Extension Popup */}
            <aside className="lg:col-span-5 rounded-2xl bg-[#0F172A] text-slate-50 p-6 border border-slate-800 shadow-lg space-y-5">
              <div className="flex items-center justify-between pb-4 border-b border-slate-800">
                <div>
                  <div className="flex items-center gap-2">
                    <OpenShieldLogo size={24} testId="dashboard-brand-logo" />
                    <h3 className="text-base font-extrabold text-white">OpenShield Popup</h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    popup.html · Real-Time DOM &amp; ToS Report
                  </p>
                </div>
                <div
                  data-testid="popup-grade-badge"
                  className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl font-extrabold tabular-nums ${gradeBadgeStyle(
                    liveGrade
                  )}`}
                >
                  {liveGrade}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-[#1E293B] border border-slate-700/70">
                  <div className="text-2xl font-extrabold text-orange-400 tabular-nums">
                    {liveUrgencyCount}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">⏳ Fake Urgency</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#1E293B] border border-slate-700/70">
                  <div className="text-2xl font-extrabold text-red-400 tabular-nums">
                    {liveSneakyCount}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">☑️ Sneaky Boxes</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#1E293B] border border-slate-700/70">
                  <div className="text-2xl font-extrabold text-purple-400 tabular-nums">
                    {liveShamingCount}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">🎭 Guilt-Trip UI</div>
                </div>
                <div className="p-3.5 rounded-xl bg-[#1E293B] border border-slate-700/70">
                  <div className="text-2xl font-extrabold text-red-400 tabular-nums">
                    {liveTosRiskCount}
                  </div>
                  <div className="text-xs text-slate-400 mt-0.5">📜 ToS Red Flags</div>
                </div>
              </div>

              <div className="rounded-xl bg-[#1E293B] border border-slate-700/70 p-4 max-h-52 overflow-y-auto space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <div className="text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                    Detected Traps on {activeSite.domain}
                  </div>
                  {Object.keys(dismissedFindings).length > 0 && (
                    <button
                      type="button"
                      onClick={() => setDismissedFindings({})}
                      className="text-[11px] text-sky-400 hover:underline cursor-pointer"
                    >
                      Restore dismissed
                    </button>
                  )}
                </div>

                {isSitePaused ? (
                  <div className="text-amber-300 font-medium py-2">
                    Scanning is currently paused on {activeSite.domain}.
                  </div>
                ) : liveFindings.length === 0 ? (
                  <div className="flex items-center gap-2 text-emerald-400 font-semibold py-2">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>No dark patterns or ToS traps detected!</span>
                  </div>
                ) : (
                  liveFindings.map((item, index) => (
                    <div
                      key={index}
                      className="py-1.5 border-b border-slate-700/60 last:border-none text-slate-200 leading-relaxed flex items-start justify-between gap-2"
                    >
                      <span>• {item}</span>
                      <button
                        type="button"
                        title="Dismiss this warning"
                        aria-label={`Dismiss ${item}`}
                        onClick={() =>
                          setDismissedFindings((prev) => ({
                            ...prev,
                            [item]: true,
                          }))
                        }
                        className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer shrink-0"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-slate-400">Cancellation Difficulty: </span>
                  <strong className="text-white">{activeSite.cancellationDifficulty}</strong>
                </div>
                <a
                  href={activeSite.directCancelUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-emerald-400 hover:underline font-semibold inline-flex items-center gap-1"
                >
                  <span>Direct Unsubscribe</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  data-testid="popup-equalize-btn"
                  disabled={isNeutralizing || isSitePaused}
                  onClick={handleEqualizeUI}
                  className="w-full py-3 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-75 text-slate-950 font-extrabold text-xs cursor-pointer transition-colors inline-flex items-center justify-center gap-2"
                >
                  {isNeutralizing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Neutralizing Dark Patterns ({neutralizeProgress}%)...</span>
                    </>
                  ) : isNeutralized ? (
                    <>
                      <Check className="w-4 h-4" />
                      <span>Traps Neutralized! (Price Equalized to {activeSite.basePrice})</span>
                    </>
                  ) : (
                    <span>✨ Neutralize All Dark Patterns</span>
                  )}
                </button>

                <button
                  type="button"
                  data-testid="popup-download-json-btn"
                  onClick={handleDownloadAuditJson}
                  className="w-full py-2.5 px-4 rounded-xl bg-[#1E293B] hover:bg-slate-700 border border-slate-700 text-slate-100 font-bold text-xs cursor-pointer transition-colors inline-flex items-center justify-center gap-2"
                >
                  {downloadedJsonNotice ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-300">{downloadedJsonNotice}</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5 text-sky-400" />
                      <span>Download Forensic Audit Report (JSON)</span>
                    </>
                  )}
                </button>
              </div>
            </aside>
          </div>
        </section>

        {/* =====================================================================
            FEATURE 4: EDUCATIONAL CONTENT (SEARCH GROUNDING)
           ===================================================================== */}
        <EducationalContentSection lang={lang} />

        {/* =====================================================================
            FEATURE 5: OPEN-SOURCE TRANSPARENCY ENGINE & RULE REGISTRY
           ===================================================================== */}
        <OpenSourceRuleRegistryPanel lang={lang} />
      </main>

      {/* Login / Cloud Account Modal with Minimal OpenShield Brand Logo */}
      {showLoginModal && (
        <div
          data-testid="login-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="login-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75"
        >
          <div className="w-full max-w-md rounded-2xl bg-[#050814] border border-slate-800 p-6 text-white shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2.5">
                <OpenShieldLogo size={28} testId="login-brand-logo" />
                <div>
                  <h2 id="login-modal-title" className="text-base font-extrabold text-white">
                    OpenShield Account
                  </h2>
                  <p className="text-xs text-slate-400">
                    Optional Cloud Sync · 100% Zero-Tracking Guarantee
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowLoginModal(false)}
                aria-label="Close login modal"
                className="min-w-[36px] min-h-[36px] rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {currentUser ? (
              <div className="space-y-4">
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1">
                  <div className="font-bold text-emerald-400">Signed in with Google</div>
                  <div className="text-slate-200 font-semibold">
                    {currentUser.displayName || 'Verified User'}
                  </div>
                  <div className="text-slate-400">{currentUser.email}</div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await signOutUser();
                    setAuthNotice('Signed out successfully.');
                  }}
                  className="min-h-[44px] w-full px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogOut className="w-4 h-4 text-red-400" />
                  <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-slate-300 leading-relaxed">
                  All URL, PDF, and text analyses work immediately without an account. Sign in with
                  Google if you wish to sync saved forensic audit reports across devices.
                </p>
                {authNotice && (
                  <div className="p-3 rounded-xl bg-slate-900 border border-cyan-500/30 text-xs text-cyan-300">
                    {authNotice}
                  </div>
                )}
                <button
                  type="button"
                  data-testid="google-signin-submit-btn"
                  onClick={async () => {
                    try {
                      setAuthNotice(null);
                      await signInWithGoogle();
                      setShowLoginModal(false);
                    } catch {
                      setAuthNotice(
                        'Popup sign-in was cancelled or blocked by browser preview settings. All forensic tools remain 100% unlocked.'
                      );
                    }
                  }}
                  className="min-h-[44px] w-full px-4 py-3 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs inline-flex items-center justify-center gap-2 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Continue with Google</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Branded Midnight-Navy Footer with OpenShield Logo & Open-Source Attribution */}
      <footer className="border-t border-slate-800 bg-[#050814] py-8 px-6 text-xs text-slate-400 mt-12">
        <div className="max-w-[1200px] mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <OpenShieldLogo size={24} testId="footer-brand-logo" />
            <span className="font-extrabold text-white">OpenShield</span>
            <span className="text-slate-600">·</span>
            <span>
              v1.2.0 — AI-Powered Hidden-Terms &amp; Dark-Pattern Detector · Zero Browsing History
              Tracking
            </span>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="/extension/manifest.json"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-cyan-300 transition-colors"
            >
              manifest.json
            </a>
            <span aria-hidden="true">·</span>
            <a
              href="/extension/content.js"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-cyan-300 transition-colors"
            >
              content.js
            </a>
            <span aria-hidden="true">·</span>
            <a
              href="/extension/popup.html"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-cyan-300 transition-colors"
            >
              popup.html
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
