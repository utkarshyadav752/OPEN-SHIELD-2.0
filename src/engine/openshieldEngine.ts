export type PatternTaxonomyId =
  | 'urgency'
  | 'scarcity'
  | 'social_proof'
  | 'sneaking'
  | 'confirm_shaming';

export type RoachDifficulty = 'easy' | 'medium' | 'hard' | 'impossible';

export type SafetyGrade = 'A' | 'B' | 'C' | 'D' | 'F';

export interface JustDeleteMeSite {
  name: string;
  domains: string[];
  difficulty: RoachDifficulty;
  url: string;
  notes: string;
}

export interface TosRedFlagRule {
  id: string;
  pattern: RegExp;
  patternSource: string;
  label: string;
  explanation: string;
  severity: 'critical' | 'high' | 'medium';
  points: number;
}

export interface TaxonomyRuleSignature {
  id: string;
  taxonomy: PatternTaxonomyId;
  name: string;
  regexSource: string;
  regex?: RegExp;
  domSelector?: string;
  styleFilter?: {
    maxFontSizePx: number;
    minPrimaryToSecondaryAreaRatio: number;
    lowContrastThreshold: number;
  };
  academicSource: string;
  severity: 'critical' | 'high' | 'medium';
  description: string;
  example: string;
}

export interface TosdrPreRatedService {
  domain: string;
  name: string;
  classGrade: 'A' | 'B' | 'C' | 'D' | 'E';
  summary: string;
}

export interface DetectedFinding {
  id: string;
  category: PatternTaxonomyId | 'tos' | 'visual_interference';
  badgeText: string;
  title: string;
  snippet: string;
  severity: 'critical' | 'high' | 'medium';
  ruleId: string;
  financialImpactInr?: number;
}

export interface ScanInputSnapshot {
  domain: string;
  pageTitle: string;
  textBlocks: string[];
  checkboxes: Array<{
    id: string;
    label: string;
    checked: boolean;
    costInr?: number;
  }>;
  buttons: Array<{
    id: string;
    text: string;
    role: 'primary' | 'opt_out';
    fontSizePx: number;
    widthPx: number;
    heightPx: number;
    contrastRatio: number;
  }>;
  tosText: string;
}

export interface AuditReport {
  domain: string;
  grade: SafetyGrade;
  scoreOutOf100: number;
  totalIssues: number;
  urgencyCount: number;
  scarcityCount: number;
  socialProofCount: number;
  sneakyCount: number;
  shamingCount: number;
  visualInterferenceCount: number;
  tosRisks: string[];
  findings: DetectedFinding[];
  roachMotel: JustDeleteMeSite | null;
  tosdrService: TosdrPreRatedService | null;
  potentialSavingsInr: number;
}

export const TAXONOMY_SIGNATURES: TaxonomyRuleSignature[] = [
  {
    id: 'URG-01',
    taxonomy: 'urgency',
    name: 'Countdown Timer Pressure',
    regexSource: '\\b\\d{1,2}:\\d{2}:\\d{2}\\b|offer expires in|deal ends in',
    regex: /\b\d{1,2}:\d{2}:\d{2}\b|offer expires in|deal ends in/i,
    academicSource: 'Mathur et al. (Princeton CHI 2019) & Dapde Pattern Highlighter',
    severity: 'high',
    description: 'Uses ticking timers or expiring deal copy to induce panic buying before price comparison.',
    example: 'Hurry! Offer expires in 00:04:59'
  },
  {
    id: 'URG-02',
    taxonomy: 'urgency',
    name: 'High-Pressure Action Prompt',
    regexSource: 'hurry!|act fast|last chance to book|book now before prices rise',
    regex: /hurry!|act fast|last chance to book|book now before prices rise/i,
    academicSource: 'Princeton WebTap Corpus / DPBH EthiGuard',
    severity: 'high',
    description: 'Coercive imperative phrasing designed to rush checkout completion.',
    example: 'Last chance to book at this fare!'
  },
  {
    id: 'SCR-01',
    taxonomy: 'scarcity',
    name: 'Artificial Low-Stock Claim',
    regexSource: 'only \\d+ left( in stock| at this price)?|almost gone|selling fast',
    regex: /only \d+ left( in stock| at this price)?|almost gone|selling fast/i,
    academicSource: 'Mathur et al. (Princeton CHI 2019)',
    severity: 'high',
    description: 'Claims only 1 or a few units remain at a specific price tier without verifiable inventory.',
    example: 'Only 1 left in stock at this price (₹42,999)!'
  },
  {
    id: 'SCR-02',
    taxonomy: 'scarcity',
    name: 'High-Demand Route Depletion',
    regexSource: 'in high demand|9[0-9]% of (rooms|seats|flights) booked',
    regex: /in high demand|9[0-9]% of (rooms|seats|flights) booked/i,
    academicSource: 'Princeton Dark Patterns Dataset',
    severity: 'medium',
    description: 'Insinuates imminent sell-out across an entire route or date range.',
    example: 'In high demand — 98% of seats booked on this route'
  },
  {
    id: 'SOC-01',
    taxonomy: 'social_proof',
    name: 'Concurrent Viewer Activity Notification',
    regexSource: '\\d+ people are (viewing|looking at|booking|watching) this',
    regex: /\d+ people are (viewing|looking at|booking|watching) this/i,
    academicSource: 'Mathur et al. (Princeton CHI 2019) / Dapde',
    severity: 'medium',
    description: 'Displays unverified real-time viewer numbers to manufacture competitive anxiety.',
    example: '38 people are viewing this flight right now!'
  },
  {
    id: 'SOC-02',
    taxonomy: 'social_proof',
    name: 'Recent Purchase Velocity Ticker',
    regexSource: '\\d+ (people|travelers|customers) (bought|booked|purchased) this in the last',
    regex: /\d+ (people|travelers|customers) (bought|booked|purchased) this in the last/i,
    academicSource: 'DPBH EthiGuard Dataset',
    severity: 'medium',
    description: 'Pressures users with synthetic recent transaction counts.',
    example: '42 travelers booked this in the last hour'
  },
  {
    id: 'SNK-01',
    taxonomy: 'sneaking',
    name: 'Pre-Checked Paid Add-On Checkbox',
    regexSource: 'input[type="checkbox"][checked]',
    domSelector: 'input[type="checkbox"][checked]',
    academicSource: 'Brignull / EU Digital Services Act Art. 25 / DPBH EthiGuard',
    severity: 'critical',
    description: 'Pre-selects optional ancillary insurance, VIP protection, or donations without explicit user action.',
    example: '<input type="checkbox" checked /> Add ₹2,499 VIP Baggage Protection'
  },
  {
    id: 'SNK-02',
    taxonomy: 'sneaking',
    name: 'Sneaky Trial-to-Paid Membership Conversion',
    regexSource: 'auto[- ]?enroll.*for [₹$€£]\\d+|after \\d+ days you will be charged',
    regex: /auto[- ]?enroll.*for [₹$€£]\d+|after \d+ days you will be charged/i,
    academicSource: 'Princeton Dark Patterns Dataset / FTC Negative Option Rule',
    severity: 'critical',
    description: 'Bundles a recurring subscription trial into a one-time checkout via pre-ticked consent.',
    example: 'Auto-enroll me in ShadyClub Gold for ₹999/month after 7 days'
  },
  {
    id: 'SHM-01',
    taxonomy: 'confirm_shaming',
    name: 'Guilt-Trip / Confirm-Shaming Decline Copy',
    regexSource: "no thanks,?\\s*i (don't|do not) (want|like)|no,?\\s*i prefer to pay full price|i hate saving money|continue without protection|no thanks,?\\s*i'll risk it|risk losing my luggage",
    regex: /no thanks,?\s*i (don't|do not) (want|like)|no,?\s*i prefer to pay full price|i hate saving money|continue without protection|no thanks,?\s*i'll risk it|risk losing my luggage/i,
    academicSource: 'Mathur et al. (Princeton CHI 2019) / Brignull',
    severity: 'high',
    description: 'Frames declining an upsell as a foolish or irresponsible personal choice.',
    example: 'No thanks, I prefer to pay full price and risk losing my luggage'
  },
  {
    id: 'SHM-02',
    taxonomy: 'confirm_shaming',
    name: 'ComputedStyle Visual Interference (Consent-O-Matic)',
    regexSource: 'window.getComputedStyle(el) areaRatio >= 2.8 || fontSize <= 11.5px',
    styleFilter: {
      maxFontSizePx: 11.5,
      minPrimaryToSecondaryAreaRatio: 2.8,
      lowContrastThreshold: 3.0
    },
    academicSource: 'Consent-O-Matic (Aarhus University CHI 2020)',
    severity: 'high',
    description: 'Uses CSS visual hierarchy manipulation (tiny low-contrast grey links vs oversized vibrant CTA buttons) to hide the reject option.',
    example: '18px #16a34a full-width primary CTA vs 10px #cbd5e1 muted decline link'
  }
];

export const TOS_RED_FLAG_RULES: TosRedFlagRule[] = [
  {
    id: 'TOS-ARB',
    pattern: /waive.*class action|binding arbitration/i,
    patternSource: 'waive.*class action|binding arbitration',
    label: 'Forced Arbitration & Class-Action Waiver',
    explanation: 'Strips your constitutional right to sue in court or join a class-action lawsuit if harmed.',
    severity: 'critical',
    points: 25
  },
  {
    id: 'TOS-SELL',
    pattern: /sell.*third[- ]party|share with marketing partners/i,
    patternSource: 'sell.*third[- ]party|share with marketing partners',
    label: 'Sells Personal Data to Third Parties',
    explanation: 'Permits monetizing your location, browsing history, or profile across external data brokers.',
    severity: 'critical',
    points: 25
  },
  {
    id: 'TOS-RENEW',
    pattern: /auto[- ]?renew|automatically billed|recurring charge/i,
    patternSource: 'auto[- ]?renew|automatically billed|recurring charge',
    label: 'Sneaky Auto-Renewal Subscription',
    explanation: 'Automatically bills your payment method on a recurring cycle unless canceled in advance.',
    severity: 'high',
    points: 15
  },
  {
    id: 'TOS-NOREFUND',
    pattern: /non[- ]refundable|no refunds under any circumstances/i,
    patternSource: 'non[- ]refundable|no refunds under any circumstances',
    label: 'Strict No-Refund Clause',
    explanation: 'Denies refunds even in cases of flight cancellation, service failure, or immediate booking error.',
    severity: 'high',
    points: 15
  },
  {
    id: 'TOS-LICENSE',
    pattern: /irrevocable,?\s*perpetual.*license/i,
    patternSource: 'irrevocable,?\\s*perpetual.*license',
    label: 'Claims Permanent Ownership of Your Content',
    explanation: 'Grants the company an unlimited, permanent, royalty-free right to use your uploaded photos or media.',
    severity: 'high',
    points: 15
  },
  {
    id: 'TOS-UNILATERAL',
    pattern: /modify these terms at any time without notice/i,
    patternSource: 'modify these terms at any time without notice',
    label: 'Can Change Rules Anytime Without Notice',
    explanation: 'Allows unilateral contract amendments without notifying users via email or in-app alert.',
    severity: 'medium',
    points: 10
  }
];

export const JUST_DELETE_ME_DATABASE: JustDeleteMeSite[] = [
  {
    name: 'ShadyAirlines',
    domains: ['shadyairlines.example', 'localhost', '127.0.0.1'],
    difficulty: 'hard',
    url: 'https://shadyairlines.example/account/cancel-membership-step-1',
    notes: 'Requires navigating 4 retention screens, disabling ShadyClub Gold auto-renewal 72 hours before billing cycle, and calling customer support during business hours.'
  },
  {
    name: 'StreamTrap Plus',
    domains: ['streamtrap.example'],
    difficulty: 'hard',
    url: 'https://streamtrap.example/billing/retention-maze',
    notes: 'Hides the cancel button behind 3 survey modals and forfeits remaining prepaid billing days immediately.'
  },
  {
    name: 'CleanBooks Coop',
    domains: ['cleanbooks.example'],
    difficulty: 'easy',
    url: 'https://cleanbooks.example/account/delete',
    notes: 'Instant 1-click self-service account deletion and data export with zero dark patterns.'
  },
  {
    name: 'Amazon',
    domains: ['amazon.com', 'amazon.in', 'amazon.co.uk', 'amazon.de'],
    difficulty: 'medium',
    url: 'https://www.amazon.com/gp/help/customer/display.html?nodeId=GTJQ7QZY7QL2HK4Y',
    notes: 'Multi-step Prime cancellation flow ("Iliad Flow") with repeated retention prompts before final confirmation.'
  },
  {
    name: 'Adobe Creative Cloud',
    domains: ['adobe.com'],
    difficulty: 'hard',
    url: 'https://account.adobe.com/plans',
    notes: 'Annual plans paid monthly incur a 50% early termination fee if canceled after 14 days.'
  },
  {
    name: 'New York Times',
    domains: ['nytimes.com'],
    difficulty: 'medium',
    url: 'https://myaccount.nytimes.com/seg/subscription',
    notes: 'Online cancellation requires clicking through multiple retention discount offers or live chat.'
  },
  {
    name: 'Planet Fitness',
    domains: ['planetfitness.com'],
    difficulty: 'impossible',
    url: 'https://www.planetfitness.com/about-planet-fitness/customer-service/membership-faqs',
    notes: 'Historically requires visiting your home club in person or sending a certified letter via postal mail.'
  },
  {
    name: 'Netflix',
    domains: ['netflix.com'],
    difficulty: 'easy',
    url: 'https://www.netflix.com/youraccount',
    notes: 'Clean 2-click cancellation directly from the Account overview page with zero early termination penalties.'
  },
  {
    name: 'GitHub',
    domains: ['github.com'],
    difficulty: 'easy',
    url: 'https://github.com/settings/admin',
    notes: 'Direct self-service subscription downgrade and account deletion in user settings.'
  },
  {
    name: 'SiriusXM',
    domains: ['siriusxm.com'],
    difficulty: 'hard',
    url: 'https://www.siriusxm.com/help/manage-or-cancel-service',
    notes: 'Forces users through lengthy live chat or phone retention scripts before processing cancellation.'
  }
];

export const TOSDR_PRE_RATED_LIST: TosdrPreRatedService[] = [
  {
    domain: 'shadyairlines.example',
    name: 'ShadyAirlines',
    classGrade: 'E',
    summary: 'Forced arbitration, non-refundable fares, pre-ticked recurring club fees, and third-party data brokerage.'
  },
  {
    domain: 'streamtrap.example',
    name: 'StreamTrap Plus',
    classGrade: 'D',
    summary: 'Unilateral contract modifications without notice, auto-renewing trial traps, and broad content licensing.'
  },
  {
    domain: 'cleanbooks.example',
    name: 'CleanBooks Coop',
    classGrade: 'A',
    summary: 'Plain-language terms, 30-day no-questions refund guarantee, zero third-party tracking or arbitration.'
  },
  {
    domain: 'duckduckgo.com',
    name: 'DuckDuckGo',
    classGrade: 'A',
    summary: 'Does not track you or sell personal data.'
  },
  {
    domain: 'proton.me',
    name: 'Proton',
    classGrade: 'A',
    summary: 'End-to-end encrypted; strict Swiss privacy protections and transparent terms.'
  },
  {
    domain: 'github.com',
    name: 'GitHub',
    classGrade: 'B',
    summary: 'Clear IP ownership for user repositories and straightforward account deletion.'
  },
  {
    domain: 'amazon.com',
    name: 'Amazon',
    classGrade: 'D',
    summary: 'Extensive behavioral tracking, third-party ad sharing, and multi-step Prime cancellation.'
  },
  {
    domain: 'tiktok.com',
    name: 'TikTok',
    classGrade: 'E',
    summary: 'Broad perpetual content license and cross-device behavioral/location tracking.'
  }
];

export function calculateGradeFromIssues(totalIssues: number): SafetyGrade {
  if (totalIssues === 0) return 'A';
  if (totalIssues <= 2) return 'B';
  if (totalIssues <= 4) return 'C';
  if (totalIssues <= 6) return 'D';
  return 'F';
}

export function detectVisualInterference(
  buttons: ScanInputSnapshot['buttons']
): {
  flagged: boolean;
  areaRatio: number;
  optOutFontSizePx: number;
  optOutContrast: number;
} {
  const primary = buttons.find((b) => b.role === 'primary');
  const optOut = buttons.find((b) => b.role === 'opt_out');
  if (!primary || !optOut) {
    return { flagged: false, areaRatio: 1, optOutFontSizePx: 14, optOutContrast: 7 };
  }

  const primaryArea = Math.max(1, primary.widthPx * primary.heightPx);
  const optOutArea = Math.max(1, optOut.widthPx * optOut.heightPx);
  const areaRatio = Number((primaryArea / optOutArea).toFixed(2));

  const flagged =
    areaRatio >= 2.8 || optOut.fontSizePx <= 11.5 || optOut.contrastRatio < 3.0;

  return {
    flagged,
    areaRatio,
    optOutFontSizePx: optOut.fontSizePx,
    optOutContrast: optOut.contrastRatio
  };
}

export function runOpenShieldAudit(snapshot: ScanInputSnapshot): AuditReport {
  const findings: DetectedFinding[] = [];
  const tosRisks: string[] = [];

  let urgencyCount = 0;
  let scarcityCount = 0;
  let socialProofCount = 0;
  let sneakyCount = 0;
  let shamingCount = 0;
  let visualInterferenceCount = 0;
  let potentialSavingsInr = 0;

  const urgencyRegexes = [
    /only \d+ left in stock/i,
    /\d+ people are (viewing|looking at|booking) this/i,
    /offer expires in|deal ends in/i,
    /hurry!|selling fast|almost gone/i,
    /last chance to book/i,
    /\b\d{1,2}:\d{2}:\d{2}\b/
  ];

  const scarcityRegexes = [
    /only \d+ left( in stock| at this price)?/i,
    /almost gone|selling fast/i,
    /in high demand|9[0-9]% of (rooms|seats|flights) booked/i
  ];

  const socialProofRegexes = [
    /\d+ people are (viewing|looking at|booking|watching) this/i,
    /\d+ (people|travelers|customers) (bought|booked|purchased) this in the last/i
  ];

  const shamingRegexes = [
    /no thanks,?\s*i (don't|do not) (want|like)/i,
    /no,?\s*i prefer to pay full price/i,
    /i hate saving money/i,
    /continue without protection/i,
    /no thanks,?\s*i'll risk it/i,
    /risk losing my luggage/i
  ];

  // 1. Check Sneaky Pre-Checked Checkboxes
  snapshot.checkboxes.forEach((cb, idx) => {
    if (cb.checked) {
      sneakyCount++;
      if (cb.costInr) {
        potentialSavingsInr += cb.costInr;
      }
      findings.push({
        id: `finding-sneaky-${idx}`,
        category: 'sneaking',
        badgeText: '⚠️ Sneaky Pre-Checked Box',
        title: 'Pre-ticked opt-in checkbox found',
        snippet: cb.label,
        severity: 'critical',
        ruleId: cb.label.toLowerCase().includes('auto-enroll') ? 'SNK-02' : 'SNK-01',
        financialImpactInr: cb.costInr
      });
    }
  });

  // 2. Check Text Blocks for Urgency, Scarcity, Social Proof & Confirm-Shaming
  snapshot.textBlocks.forEach((rawText, idx) => {
    const text = rawText.trim();
    if (!text) return;

    const matchesUrgency = urgencyRegexes.some((r) => r.test(text));
    const matchesScarcity = scarcityRegexes.some((r) => r.test(text));
    const matchesSocial = socialProofRegexes.some((r) => r.test(text));

    if (matchesUrgency) {
      urgencyCount++;
      if (matchesScarcity) scarcityCount++;
      if (matchesSocial) socialProofCount++;

      findings.push({
        id: `finding-urgency-${idx}`,
        category: matchesScarcity && !/expires in|\d{2}:\d{2}/i.test(text) ? 'scarcity' : 'urgency',
        badgeText: '⏳ High-Pressure Scarcity / Timer',
        title: `Urgency Trap: "${text.slice(0, 48)}${text.length > 48 ? '...' : ''}"`,
        snippet: text,
        severity: 'high',
        ruleId: matchesScarcity ? 'SCR-01' : 'URG-01'
      });
    }

    const matchesShaming = shamingRegexes.some((r) => r.test(text));
    if (matchesShaming) {
      shamingCount++;
      findings.push({
        id: `finding-shaming-${idx}`,
        category: 'confirm_shaming',
        badgeText: '🎭 Confirm-Shaming / Hidden Opt-Out',
        title: `Guilt-Trip Button: "${text.slice(0, 48)}${text.length > 48 ? '...' : ''}"`,
        snippet: text,
        severity: 'high',
        ruleId: 'SHM-01'
      });
    }
  });

  // 3. Check Visual Interference via Consent-O-Matic computedStyle metrics
  const viResult = detectVisualInterference(snapshot.buttons);
  if (viResult.flagged) {
    visualInterferenceCount++;
    findings.push({
      id: 'finding-visual-interference',
      category: 'visual_interference',
      badgeText: `🎨 Visual Interference (${viResult.areaRatio}x CTA Asymmetry, ${viResult.optOutFontSizePx}px font)`,
      title: `Consent-O-Matic Style Audit: Primary CTA is ${viResult.areaRatio}x larger than ${viResult.optOutFontSizePx}px low-contrast decline link`,
      snippet: `Primary vs Opt-Out area ratio: ${viResult.areaRatio}:1 · Contrast: ${viResult.optOutContrast}:1`,
      severity: 'high',
      ruleId: 'SHM-02'
    });
  }

  // 4. Check Predatory Terms of Service Clauses
  const combinedTosSource = `${snapshot.tosText} ${snapshot.textBlocks.join(' ')}`;
  for (const rule of TOS_RED_FLAG_RULES) {
    if (rule.pattern.test(combinedTosSource) && !tosRisks.includes(rule.label)) {
      tosRisks.push(rule.label);
      findings.push({
        id: `finding-tos-${rule.id}`,
        category: 'tos',
        badgeText: `📜 ToS Trap: ${rule.label}`,
        title: `ToS: ${rule.label}`,
        snippet: rule.explanation,
        severity: rule.severity,
        ruleId: rule.id
      });
    }
  }

  // 5. Match JustDeleteMe & ToS;DR Pre-Rated Database
  const normalizedDomain = snapshot.domain.toLowerCase().replace(/^www\./, '');
  const roachMotel =
    JUST_DELETE_ME_DATABASE.find((site) =>
      site.domains.some((d) => normalizedDomain === d || normalizedDomain.endsWith('.' + d))
    ) || null;

  const tosdrService =
    TOSDR_PRE_RATED_LIST.find((s) => s.domain === normalizedDomain) || null;

  const totalIssues =
    urgencyCount + sneakyCount + shamingCount + tosRisks.length;

  const grade = calculateGradeFromIssues(totalIssues);
  const rawPenalty =
    urgencyCount * 10 +
    sneakyCount * 15 +
    shamingCount * 12 +
    visualInterferenceCount * 8 +
    tosRisks.length * 12;
  const scoreOutOf100 = Math.max(4, 100 - rawPenalty);

  return {
    domain: snapshot.domain,
    grade,
    scoreOutOf100,
    totalIssues,
    urgencyCount,
    scarcityCount,
    socialProofCount,
    sneakyCount,
    shamingCount,
    visualInterferenceCount,
    tosRisks,
    findings,
    roachMotel,
    tosdrService,
    potentialSavingsInr
  };
}
