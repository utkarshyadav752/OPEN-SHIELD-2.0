/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OpenShield — Pure, Deterministic Legal Clause, Document, URL, Hidden Cost,
 * Action Plan, Bilingual (EN/HI), India Regulatory Context & Diff Engine.
 */

export type RiskLevel = 'Critical' | 'High' | 'Medium' | 'Low';
export type ConfidenceLevel = 'High' | 'Medium' | 'Low';
export type SupportedLanguage = 'en' | 'hi';

export interface IndiaLegalContext {
  applicableFramework: string;
  classification: 'Statutory Provision' | 'Regulatory Guideline' | 'Consumer Best Practice';
  noteEn: string;
  noteHi: string;
  officialSourceUrl: string;
  verifiedDate: string;
}

export interface EvidenceFinding {
  id: string;
  ruleId: string;
  category: string;
  title: string;
  titleHi: string;
  riskLevel: RiskLevel;
  explanation: string;
  explanationHi: string;
  quote: string;
  location: string;
  whyItMatters: string;
  whyItMattersHi: string;
  whatRemainsUnclear: string;
  whatRemainsUnclearHi: string;
  whatToCheck: string;
  whatToCheckHi: string;
  confidence: ConfidenceLevel;
  provenance: 'Factual Clause Extraction' | 'AI-Assisted Interpretation';
  missingInfoOrLimitations: string;
  originalSourceReference: string;
  indiaLegalContext: IndiaLegalContext;
}

export interface HiddenCostBreakdownItem {
  label: string;
  amount: number;
  currencySymbol: string;
  frequency: 'one-time' | 'monthly' | 'annual';
  quote: string;
  location: string;
}

export interface HiddenCostEstimate {
  calculable: boolean;
  currencySymbol: string;
  currencyCode: string;
  currencyAssumed: boolean;
  periodMonths: number;
  freeTrialDays: number | null;
  trialQuote: string | null;
  initialPayment: number | null;
  monthlyRecurringCost: number | null;
  annualRecurringCost: number | null;
  estimatedTotalForPeriod: number | null;
  estimatedTotalWithAddonsForPeriod: number | null;
  earlyTerminationPenaltyPercent: number | null;
  estimatedMidTermCancelPenalty: number | null;
  penaltyQuote: string | null;
  refundLimitationSummary: string | null;
  cancellationConditionSummary: string | null;
  statedBaseItems: HiddenCostBreakdownItem[];
  statedAddons: HiddenCostBreakdownItem[];
  statedAdditionalFees: HiddenCostBreakdownItem[];
  assumptions: string[];
  assumptionsHi: string[];
  nonCalculableReason?: string;
  nonCalculableReasonHi?: string;
}

export interface ActionPlanItem {
  id: string;
  priority: 'Immediate' | 'Before Paying' | 'Record Keeping';
  title: string;
  titleHi: string;
  detail: string;
  detailHi: string;
  supportingQuote?: string;
  supportingLocation?: string;
  ruleId?: string;
  officialLink?: {
    label: string;
    url: string;
  };
}

export interface AnalysisReport {
  title: string;
  sourceType: 'url' | 'pdf' | 'image' | 'text';
  sourceLabel: string;
  scannedAt: string;
  analysisMode:
    | 'Gemini AI + Forensic Rules'
    | 'Hybrid AI + Deterministic Rules'
    | 'Deterministic Rule-Based Mode';
  pageCount: number | null;
  clausesAnalyzed: number;
  overallRisk:
    | 'High Concern'
    | 'Moderate Concern'
    | 'Low Concern'
    | 'No Matching Concerns Detected';
  overallSummary: string;
  overallSummaryHi: string;
  limitations: string;
  limitationsHi: string;
  countsByRisk: {
    Critical: number;
    High: number;
    Medium: number;
    Low: number;
  };
  findings: EvidenceFinding[];
  hiddenCostEstimate: HiddenCostEstimate;
  actionPlan: ActionPlanItem[];
  extractedText: string;
  promptInjectionDetected: boolean;
  promptInjectionNote?: string;
  knownServiceInfo?: {
    serviceName: string;
    tosdrClass?: string;
    cancellationDifficulty?: 'EASY' | 'MEDIUM' | 'HARD' | 'IMPOSSIBLE';
    verifiedCancellationUrl?: string;
    sourceAttribution: string;
    lastVerified: string;
  };
}

export interface PolicyDiffChange {
  id: string;
  changeType:
    | 'Changed Price / Fee'
    | 'Changed Renewal Condition'
    | 'Changed Cancellation / Refund Provision'
    | 'Changed Dispute / Arbitration Clause'
    | 'Changed Data-Sharing Provision'
    | 'Added Risky Clause'
    | 'Removed Clause'
    | 'Modified Wording';
  riskImpact: 'Increased Risk' | 'Reduced Risk' | 'Neutral / Clarified';
  summaryEn: string;
  summaryHi: string;
  beforeQuote: string | null;
  afterQuote: string | null;
  category?: string;
}

export interface PolicyDiffReport {
  versionALabel: string;
  versionBLabel: string;
  comparedAt: string;
  addedCount: number;
  removedCount: number;
  modifiedCount: number;
  formattingOnlyIgnoredCount: number;
  summaryEn: string;
  summaryHi: string;
  changes: PolicyDiffChange[];
}

export interface UrlValidationResult {
  valid: boolean;
  normalizedUrl?: string;
  hostname?: string;
  error?: string;
}

/**
 * Validates user-supplied URLs and prevents SSRF, private-network access,
 * localhost access, and unsupported protocols.
 */
export function validateUntrustedUrl(rawInput: string): UrlValidationResult {
  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    return { valid: false, error: 'Please enter a website or policy URL.' };
  }

  if (trimmed.length > 2048) {
    return { valid: false, error: 'URL exceeds the maximum allowed length of 2,048 characters.' };
  }

  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) && !/^https?:\/\//i.test(trimmed)) {
    return {
      valid: false,
      error: 'Unsupported protocol. Only standard http:// and https:// URLs are permitted.',
    };
  }

  const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  let parsed: URL;
  try {
    parsed = new URL(candidate);
  } catch {
    return { valid: false, error: 'Malformed URL. Please check the domain and try again.' };
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return {
      valid: false,
      error: 'Unsupported protocol. Only HTTP and HTTPS destinations are allowed.',
    };
  }

  if (parsed.username || parsed.password) {
    return {
      valid: false,
      error: 'URLs containing embedded credentials are not allowed.',
    };
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');

  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === '0.0.0.0' ||
    host === '::1' ||
    host === '0:0:0:0:0:0:0:1'
  ) {
    return {
      valid: false,
      error:
        'Access to localhost, loopback, or internal network hostnames is blocked for security.',
    };
  }

  if (host.includes(':')) {
    if (
      host.startsWith('fe80:') ||
      host.startsWith('fc') ||
      host.startsWith('fd') ||
      host === '::'
    ) {
      return {
        valid: false,
        error: 'Access to private or link-local IPv6 addresses is blocked.',
      };
    }
  }

  const ipv4Match = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const octets = ipv4Match.slice(1, 5).map(Number);
    if (octets.some((o) => o < 0 || o > 255)) {
      return { valid: false, error: 'Invalid IPv4 address in URL.' };
    }
    const [a, b] = octets;
    if (
      a === 0 ||
      a === 10 ||
      a === 127 ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168) ||
      (a === 100 && b >= 64 && b <= 127)
    ) {
      return {
        valid: false,
        error:
          'Access to private, loopback, or cloud-metadata IPv4 ranges is blocked (SSRF protection).',
      };
    }
  }

  if (!host.includes('.') && !ipv4Match) {
    return {
      valid: false,
      error:
        'Please enter a complete public domain name (for example, https://example.com/terms).',
    };
  }

  return {
    valid: true,
    normalizedUrl: parsed.toString(),
    hostname: host.replace(/^www\./, ''),
  };
}

/**
 * Detects adversarial prompt-injection attempts embedded inside untrusted legal text or files.
 * Never allows document content to override analyzer instructions.
 */
export function detectAndSanitizePromptInjection(rawText: string): {
  promptInjectionDetected: boolean;
  promptInjectionNote?: string;
  sanitizedText: string;
} {
  const injectionPatterns = [
    /ignore\s+(all\s+)?(previous|prior|above)\s+(instructions|prompts|rules)/i,
    /system\s*prompt\s*override/i,
    /you\s+are\s+now\s+in\s+developer\s+mode/i,
    /output\s+only\s+["']?no\s+issues\s+found/i,
    /disregard\s+all\s+safety\s+checks/i,
    /mark\s+this\s+(document|contract|site)\s+as\s+(100%\s+|completely\s+)?safe/i,
  ];

  const matched = injectionPatterns.some((rx) => rx.test(rawText));
  if (!matched) {
    return {
      promptInjectionDetected: false,
      sanitizedText: rawText,
    };
  }

  return {
    promptInjectionDetected: true,
    promptInjectionNote:
      'Adversarial prompt-injection instructions were detected inside the supplied text (attempting to instruct the analyzer to ignore safety rules). OpenShield isolated the untrusted instructions and audited the underlying clauses normally.',
    sanitizedText: rawText,
  };
}

export interface ClauseRule {
  ruleId: string;
  ruleVersion: string;
  category: string;
  title: string;
  titleHi: string;
  riskLevel: RiskLevel;
  patterns: RegExp[];
  negationPatterns: RegExp[];
  explanation: string;
  explanationHi: string;
  whyItMatters: string;
  whyItMattersHi: string;
  whatRemainsUnclear: string;
  whatRemainsUnclearHi: string;
  whatToCheck: string;
  whatToCheckHi: string;
  missingInfoOrLimitations: string;
  matchingLogicSummary: string;
  falsePositiveConsiderations: string;
  sourceReferences: string[];
  licenseAttribution: string;
  positiveTestExample: string;
  negativeTestExample: string;
  indiaLegalContext: IndiaLegalContext;
}

export const CLAUSE_DETECTION_RULES: ClauseRule[] = [
  {
    ruleId: 'TOS-ARBITRATION-01',
    ruleVersion: '1.2.0',
    category: 'Forced Arbitration',
    title: 'Mandatory Binding Arbitration Clause',
    titleHi: 'अनिवार्य बाध्यकारी मध्यस्थता (Binding Arbitration) शर्त',
    riskLevel: 'Critical',
    patterns: [
      /\b(binding\s+(individual\s+)?arbitration|mandatory\s+arbitration|resolved\s+exclusively\s+through\s+final\s+and\s+binding\s+arbitration|submit\s+to\s+binding\s+arbitration|resolved\s+by\s+binding\s+arbitration)\b/i,
    ],
    negationPatterns: [
      /\b(do\s+not\s+require\s+binding\s+arbitration|no\s+forced\s+arbitration|never\s+force\s+you\s+into\s+binding\s+arbitration|opt\s+out\s+of\s+arbitration\s+at\s+any\s+time\s+without\s+penalty)\b/i,
    ],
    explanation:
      'Requires disputes to be settled privately through an arbitrator rather than in a public court or consumer forum.',
    explanationHi:
      'यह शर्त विवादों को सार्वजनिक न्यायालय या उपभोक्ता आयोग के बजाय निजी मध्यस्थ (Arbitrator) के माध्यम से सुलझाने के लिए बाध्य करती है।',
    whyItMatters:
      'You may face barriers when seeking redress in a regular civil court or public consumer tribunal.',
    whyItMattersHi:
      'इससे सामान्य न्यायालय या सार्वजनिक उपभोक्ता मंच में शिकायत ले जाने के आपके विकल्प सीमित हो सकते हैं।',
    whatRemainsUnclear:
      'Does not specify who pays the arbitration filing fees, where the hearing takes place, or whether statutory consumer forums remain accessible.',
    whatRemainsUnclearHi:
      'यह स्पष्ट नहीं करता कि मध्यस्थता शुल्क कौन देगा या क्या वैधानिक उपभोक्ता आयोग का विकल्प खुला है।',
    whatToCheck:
      'Check if the agreement allows a 30-day written opt-out notice after signup and verify your statutory rights under local consumer law.',
    whatToCheckHi:
      'जाँच करें कि क्या साइन-अप के 30 दिनों के भीतर लिखित रूप से मध्यस्थता से बाहर निकलने (Opt-out) का विकल्प दिया गया है।',
    missingInfoOrLimitations:
      'Enforceability of mandatory consumer arbitration clauses depends on your jurisdiction and statutory consumer protection remedies.',
    matchingLogicSummary:
      'Matches explicit binding/mandatory arbitration phrases while excluding clauses that negate arbitration or allow unconditional opt-out.',
    falsePositiveConsiderations:
      'Suppresses matches when "do not require binding arbitration" or "no forced arbitration" is present in the same sentence.',
    sourceReferences: [
      'ToS;DR — Forced Arbitration Topic Corpus (CC BY-SA 3.0)',
      'Consumer Protection Act, 2019 (India) — Consumer Disputes Redressal Commission Jurisdiction',
    ],
    licenseAttribution: 'Apache-2.0 / ToS;DR CC BY-SA 3.0',
    positiveTestExample: 'Any dispute will be resolved through binding arbitration.',
    negativeTestExample: 'We do not require binding arbitration for consumer disputes.',
    indiaLegalContext: {
      applicableFramework:
        'Consumer Protection Act, 2019 & Indian Supreme Court Consumer Forum Precedents',
      classification: 'Statutory Provision',
      noteEn:
        'In India, statutory remedies before Consumer Commissions under the Consumer Protection Act, 2019 are generally available to consumers in addition to contractual dispute clauses (see Emaar MGF Land Ltd. v. Aftab Singh). Check jurisdiction clauses carefully.',
      noteHi:
        'भारत में उपभोक्ता संरक्षण अधिनियम, 2019 के तहत उपभोक्ता आयोग में जाने का वैधानिक अधिकार सामान्यतः निजी मध्यस्थता शर्तों के बावजूद उपलब्ध रहता है।',
      officialSourceUrl: 'https://consumeraffairs.nic.in/',
      verifiedDate: '2026-10-01',
    },
  },
  {
    ruleId: 'TOS-CLASS-WAIVER-02',
    ruleVersion: '1.2.0',
    category: 'Class-Action Waiver',
    title: 'Class-Action & Representative Lawsuit Waiver',
    titleHi: 'सामूहिक मुकदमे (Class-Action) के अधिकार का त्याग',
    riskLevel: 'Critical',
    patterns: [
      /\b(waive\s+(any\s+|your\s+)?right\s+to\s+(participate\s+in\s+)?a\s+class\s+action|class[- ]action\s+waiver|only\s+on\s+an\s+individual\s+basis\s+and\s+not\s+in\s+a\s+class|waive\s+class\s+action)\b/i,
    ],
    negationPatterns: [
      /\b(do\s+not\s+waive\s+your\s+class[- ]action\s+rights|no\s+class[- ]action\s+waiver)\b/i,
    ],
    explanation:
      'Prohibits customers from joining together in a class-action or collective complaint against the company.',
    explanationHi:
      'यह शर्त ग्राहकों को कंपनी के विरुद्ध सामूहिक मुकदमा या संयुक्त उपभोक्ता शिकायत दर्ज करने से रोकती है।',
    whyItMatters:
      'If many customers are overcharged a small amount, pursuing an individual claim alone can be too costly or time-consuming.',
    whyItMattersHi:
      'यदि अनेक ग्राहकों से छोटी राशि वसूली जाए, तो अकेले अलग-अलग कानूनी लड़ाई लड़ना महँगा और कठिन हो सकता है।',
    whatRemainsUnclear:
      'Whether statutory collective complaints through a regulator or recognized consumer association are affected.',
    whatRemainsUnclearHi:
      'यह स्पष्ट नहीं है कि नियामक प्राधिकरण या पंजीकृत उपभोक्ता संगठन के माध्यम से सामूहिक शिकायत पर इसका क्या प्रभाव होगा।',
    whatToCheck:
      'Verify whether small-claims disputes or statutory consumer association complaints are exempted from this waiver.',
    whatToCheckHi:
      'जाँच करें कि क्या छोटे दावों (Small Claims) या उपभोक्ता संघ की शिकायतों को इस छूट से बाहर रखा गया है।',
    missingInfoOrLimitations:
      'Statutory collective action rights vary by country and cannot always be waived by standard-form contracts.',
    matchingLogicSummary:
      'Detects explicit class-action waiver and "individual basis only" dispute restrictions.',
    falsePositiveConsiderations:
      'Ignores clauses explicitly stating users do not waive class-action rights.',
    sourceReferences: [
      'ToS;DR — Class Action Waiver Corpus (CC BY-SA 3.0)',
      'Consumer Protection Act, 2019 — Section 35(1)(c) (Class/Representative Consumer Complaints)',
    ],
    licenseAttribution: 'Apache-2.0 / ToS;DR CC BY-SA 3.0',
    positiveTestExample: 'You waive any right to participate in a class action lawsuit.',
    negativeTestExample: 'You do not waive your class-action rights under this agreement.',
    indiaLegalContext: {
      applicableFramework: 'Consumer Protection Act, 2019 (Section 35(1)(c) & CCPA Powers)',
      classification: 'Statutory Provision',
      noteEn:
        'Section 35(1)(c) of the Consumer Protection Act, 2019 permits one or more consumers having the same interest to file a joint complaint with permission of the District Commission.',
      noteHi:
        'उपभोक्ता संरक्षण अधिनियम, 2019 की धारा 35(1)(c) समान हित वाले उपभोक्ताओं को आयोग की अनुमति से संयुक्त शिकायत दर्ज करने की सुविधा देती है।',
      officialSourceUrl: 'https://consumeraffairs.nic.in/',
      verifiedDate: '2026-10-01',
    },
  },
  {
    ruleId: 'TOS-AUTORENEW-03',
    ruleVersion: '1.2.0',
    category: 'Automatic Subscription Renewal',
    title: 'Automatic Renewal & Recurring Billing',
    titleHi: 'स्वचालित सदस्यता नवीनीकरण (Auto-Renewal) और आवर्ती शुल्क',
    riskLevel: 'High',
    patterns: [
      /\b(automatically\s+renew(s)?|auto[- ]?renew(s|al|ing)?|automatically\s+continue|automatically\s+billed\s+each|recurring\s+(monthly|annual)\s+charge\s+unless\s+cancel)/i,
    ],
    negationPatterns: [
      /\b(zero\s+auto[- ]?renewals|never\s+automatically\s+renew|does\s+not\s+auto[- ]?renew|no\s+automatic\s+renewal)\b/i,
    ],
    explanation:
      'Your subscription or contract will continue charging your payment method automatically at the end of each billing cycle.',
    explanationHi:
      'प्रत्येक बिलिंग अवधि समाप्त होने पर आपकी भुगतान विधि से सदस्यता शुल्क स्वचालित रूप से कटता रहेगा।',
    whyItMatters:
      'Without advance notice or a calendar reminder, you may be billed for another month or full year automatically.',
    whyItMattersHi:
      'समय पर रद्द न करने पर आपके कार्ड या UPI ऑटोपे से अगले महीने या पूरे वर्ष का शुल्क अपने आप कट सकता है।',
    whatRemainsUnclear:
      'Exact advance notice window (e.g., whether an email or SMS is sent 24–72 hours prior to debit) and whether renewal rates can increase.',
    whatRemainsUnclearHi:
      'यह स्पष्ट नहीं है कि पैसे कटने से कितने दिन पहले आपको ईमेल या SMS द्वारा पूर्व-सूचना दी जाएगी।',
    whatToCheck:
      'Confirm the exact cancellation deadline (e.g., 24 hours vs. 30 days before renewal) and set a reminder.',
    whatToCheckHi:
      'नवीनीकरण की अंतिम तिथि (जैसे 24 घंटे या 30 दिन पहले) की पुष्टि करें और कैलेंडर रिमाइंडर लगाएँ।',
    missingInfoOrLimitations:
      'Actual debit behavior also depends on your payment method (e.g., UPI Autopay / RBI e-Mandate rules).',
    matchingLogicSummary:
      'Matches automatic renewal and recurring billing language unless explicitly negated.',
    falsePositiveConsiderations:
      'Excludes statements promising "zero auto-renewals" or "never automatically renew".',
    sourceReferences: [
      'CCPA Guidelines for Prevention and Regulation of Dark Patterns, 2023 — Subscription Trap',
      'RBI Framework for Processing of e-Mandates on Recurring Online Transactions',
    ],
    licenseAttribution: 'Apache-2.0',
    positiveTestExample: 'Your subscription will automatically renew each year unless cancelled.',
    negativeTestExample: 'We have zero auto-renewals and never automatically renew your plan.',
    indiaLegalContext: {
      applicableFramework:
        'RBI e-Mandate Framework & CCPA Dark Patterns Guidelines, 2023 (Subscription Traps)',
      classification: 'Regulatory Guideline',
      noteEn:
        'Under RBI recurring transaction norms for Indian cards/UPI Autopay, banks send a pre-debit notification at least 24 hours before a recurring charge and allow mandate cancellation via your bank/UPI app.',
      noteHi:
        'भारतीय रिज़र्व बैंक (RBI) के ई-मैंडेट नियमों के तहत आवर्ती भुगतान कटने से कम से कम 24 घंटे पहले सूचना मिलनी चाहिए और आप अपने बैंक या UPI ऐप से भी ऑटोपे रद्द कर सकते हैं।',
      officialSourceUrl: 'https://www.rbi.org.in/',
      verifiedDate: '2026-10-01',
    },
  },
  {
    ruleId: 'TOS-NOREFUND-04',
    ruleVersion: '1.2.0',
    category: 'Non-Refundable Payments & Penalties',
    title: 'Strict No-Refund Policy or Early Termination Fee',
    titleHi: 'सख्त नो-रिफंड नीति या समय-पूर्व समाप्ति जुर्माना (Early Termination Penalty)',
    riskLevel: 'High',
    patterns: [
      /\b(strictly\s+non[- ]refundable|no\s+refunds\s+under\s+any\s+circumstances|early\s+termination\s+(fee|penalty)|50%\s+of\s+(your\s+)?remaining\s+(annual\s+)?contract|all\s+(membership\s+)?fees\s+(and\s+annual\s+charges\s+)?are\s+(strictly\s+)?non[- ]refundable)/i,
    ],
    negationPatterns: [
      /\b(full\s+refund\s+policy|pro[- ]rated\s+refund\s+at\s+any\s+time|refundable\s+within\s+30\s+days|no[- ]questions[- ]asked\s+full\s+refund)\b/i,
    ],
    explanation:
      'Payments are declared non-refundable or subject to a financial penalty if you cancel before the end of a contract term.',
    explanationHi:
      'भुगतान की गई राशि को किसी भी स्थिति में वापस न करने योग्य (Non-refundable) बताया गया है या बीच में सदस्यता छोड़ने पर भारी जुर्माना लगाया गया है।',
    whyItMatters:
      'Canceling an "annual plan, paid monthly" subscription early could trigger an immediate lump-sum penalty charge.',
    whyItMattersHi:
      '"वार्षिक प्लान, मासिक भुगतान" जैसी योजना को बीच में बंद करने पर शेष महीनों की 50% राशि एकमुश्त जुर्माने के रूप में वसूली जा सकती है।',
    whatRemainsUnclear:
      'Whether refunds are still provided in cases of service outage, defective delivery, or billing errors.',
    whatRemainsUnclearHi:
      'यह स्पष्ट नहीं है कि सेवा में खराबी या गलत बिलिंग होने पर रिफंड मिलेगा या नहीं।',
    whatToCheck:
      'Check if there is a 14-day cooling-off window and verify whether "monthly" pricing is actually a 12-month lock-in contract.',
    whatToCheckHi:
      'जाँच करें कि क्या 14 दिनों की शुरुआती कैंसिलेशन अवधि (Cooling-off window) है और क्या मासिक दिखने वाला प्लान वास्तव में 12 महीने का अनुबंध है।',
    missingInfoOrLimitations:
      'Blanket "no refund under any circumstances" clauses may not override statutory rights if a service is deficient or undelivered.',
    matchingLogicSummary:
      'Matches strict non-refundable rules and percentage-based early termination penalties.',
    falsePositiveConsiderations:
      'Suppresses matches when full or pro-rated refund guarantees are stated.',
    sourceReferences: [
      'Consumer Protection Act, 2019 — Section 2(46) (Unfair Contract: Unreasonable Early Termination Charge)',
    ],
    licenseAttribution: 'Apache-2.0',
    positiveTestExample:
      'Should you cancel after 14 days, you will be billed a 50% of remaining annual contract early termination fee.',
    negativeTestExample:
      'We offer a 30-day no-questions-asked full refund policy and pro-rated refund at any time.',
    indiaLegalContext: {
      applicableFramework: 'Consumer Protection Act, 2019 — Section 2(46)(v) (Unfair Contracts)',
      classification: 'Statutory Provision',
      noteEn:
        'Section 2(46) of the Consumer Protection Act, 2019 defines an "unfair contract" to include terms that impose disproportionate penalties on a consumer for breach or early termination of contract.',
      noteHi:
        'उपभोक्ता संरक्षण अधिनियम, 2019 की धारा 2(46) के अंतर्गत अनुबंध समाप्त करने पर उपभोक्ता पर अनुपातहीन या अत्यधिक जुर्माना लगाने वाली शर्तों को "अनुचित अनुबंध" (Unfair Contract) की श्रेणी में जाँचा जा सकता है।',
      officialSourceUrl: 'https://consumeraffairs.nic.in/',
      verifiedDate: '2026-10-01',
    },
  },
  {
    ruleId: 'TOS-ROACH-CANCEL-05',
    ruleVersion: '1.2.0',
    category: 'Difficult Cancellation Procedures',
    title: 'Restrictive or Offline Cancellation Requirement (Roach Motel)',
    titleHi: 'कठिन या ऑफ़लाइन रद्दीकरण प्रक्रिया (Roach Motel / Subscription Trap)',
    riskLevel: 'High',
    patterns: [
      /\b(cancel\s+by\s+calling|in[- ]person\s+at\s+your\s+home\s+club|certified\s+mail(\s+by\s+the|\s+to\s+cancel)?|delivered\s+in\s+person\s+at\s+your\s+home\s+club|phone\s+or\s+email\s+cancellations\s+are\s+not\s+accepted|must\s+speak\s+with\s+a\s+retention\s+specialist)\b/i,
    ],
    negationPatterns: [
      /\b(cancel\s+online\s+at\s+any\s+time\s+with\s+one\s+click|1[- ]click\s+cancellation)\b/i,
    ],
    explanation:
      'Signing up takes seconds online, but canceling requires calling customer support, visiting in person, or sending certified mail.',
    explanationHi:
      'ऑनलाइन जुड़ना कुछ सेकंड में हो जाता है, लेकिन सदस्यता रद्द करने के लिए व्यक्तिगत रूप से शाखा में जाने, फ़ोन करने या पंजीकृत डाक (Certified Mail) भेजने की शर्त रखी गई है।',
    whyItMatters:
      'Creates intentional friction ("Roach Motel") that delays cancellation past the next billing date.',
    whyItMattersHi:
      'जानबूझकर बनाई गई यह जटिलता ("Roach Motel") रद्दीकरण में देरी कराती है जिससे अगली किस्त कट जाती है।',
    whatRemainsUnclear:
      'How many business days it takes the provider to process a mailed or in-person cancellation request.',
    whatRemainsUnclearHi:
      'डाक या शाखा में दिए गए आवेदन को प्रोसेस करने में कंपनी कितने कार्यदिवस लेती है, यह स्पष्ट नहीं है।',
    whatToCheck:
      'Look for a direct online cancellation link in your account billing settings before entering payment details.',
    whatToCheckHi:
      'भुगतान विवरण दर्ज करने से पहले खाता सेटिंग्स में सीधे ऑनलाइन कैंसिलेशन विकल्प की जाँच करें।',
    missingInfoOrLimitations:
      'Some providers offer online cancellation only in specific jurisdictions where mandated by law.',
    matchingLogicSummary:
      'Flags clauses requiring in-person visits, certified mail, or phone calls to cancel an online membership.',
    falsePositiveConsiderations:
      'Does not flag clauses guaranteeing 1-click online cancellation.',
    sourceReferences: [
      'CCPA Guidelines for Prevention and Regulation of Dark Patterns, 2023 — Annexure 1 (Subscription Trap)',
      'JustDeleteMe Taxonomy (MIT License)',
    ],
    licenseAttribution: 'Apache-2.0 / JustDeleteMe MIT',
    positiveTestExample:
      'To cancel your monthly membership, written notification must be delivered in person at your home club or via certified mail.',
    negativeTestExample: 'You may cancel online at any time with one click.',
    indiaLegalContext: {
      applicableFramework:
        'CCPA Guidelines for Prevention and Regulation of Dark Patterns, 2023 (Annexure 1, Item 5: Subscription Trap)',
      classification: 'Regulatory Guideline',
      noteEn:
        'The Central Consumer Protection Authority (CCPA) Dark Patterns Guidelines, 2023 explicitly classify making cancellation impossible, complex, or significantly harder than signup as a prohibited "Subscription Trap".',
      noteHi:
        'केंद्रीय उपभोक्ता संरक्षण प्राधिकरण (CCPA) के डार्क पैटर्न दिशानिर्देश, 2023 के तहत सदस्यता रद्द करने की प्रक्रिया को साइन-अप की तुलना में जटिल या असंभव बनाना "सब्सक्रिप्शन ट्रैप" माना गया है।',
      officialSourceUrl: 'https://consumeraffairs.nic.in/',
      verifiedDate: '2026-10-01',
    },
  },
  {
    ruleId: 'TOS-DATA-SHARING-06',
    ruleVersion: '1.2.0',
    category: 'Third-Party Data Sharing or Selling',
    title: 'Broad Third-Party Data Sharing or Monetization',
    titleHi: 'तृतीय-पक्ष (Third-Party) डेटा साझाकरण या बिक्री की शर्त',
    riskLevel: 'High',
    patterns: [
      /\b(sell\s+(your\s+)?personal\s+(data|information)|share\s+(your\s+|personal\s+)?(information\s+|data\s+)?with\s+(third[- ]party\s+)?marketing\s+partners|sell\s+third[- ]party\s+data|monetize\s+anonymized\s+or\s+identifiable\s+user\s+data|share\s+with\s+data\s+brokers)\b/i,
    ],
    negationPatterns: [
      /\b(never\s+sell\s+(your\s+)?personal\s+data|zero\s+data\s+selling|do\s+not\s+sell\s+or\s+share\s+your\s+personal\s+data)\b/i,
    ],
    explanation:
      'Permits the service to share, license, or sell customer information to external marketing partners, ad networks, or data brokers.',
    explanationHi:
      'यह शर्त कंपनी को आपका व्यक्तिगत डेटा बाहरी मार्केटिंग भागीदारों, विज्ञापन नेटवर्क या डेटा ब्रोकर्स को साझा करने या बेचने की अनुमति देती है।',
    whyItMatters:
      'Your contact details, browsing habits, or purchase history may be distributed to third-party advertisers and data brokers.',
    whyItMattersHi:
      'आपका फ़ोन नंबर, ईमेल और खरीदारी का विवरण अनचाहे विज्ञापनदाताओं और डेटा ब्रोकर्स तक पहुँच सकता है।',
    whatRemainsUnclear:
      'The specific list of third-party recipients and how to withdraw consent once data has already been shared.',
    whatRemainsUnclearHi:
      'यह स्पष्ट नहीं है कि किन-किन कंपनियों के साथ डेटा साझा किया जाएगा और एक बार साझा होने के बाद सहमति कैसे वापस ली जा सकेगी।',
    whatToCheck:
      'Check the Privacy Policy for a "Do Not Sell or Share My Personal Information" or Consent Manager withdrawal link.',
    whatToCheckHi:
      'गोपनीयता नीति (Privacy Policy) में डेटा साझाकरण से बाहर निकलने (Opt-out / Withdraw Consent) के विकल्प की जाँच करें।',
    missingInfoOrLimitations:
      'Requires reviewing the full Privacy Policy schedule to see all categories of data processors vs. independent third parties.',
    matchingLogicSummary:
      'Matches clauses permitting sale or marketing distribution of personal information to third parties.',
    falsePositiveConsiderations:
      'Suppresses matches when the text states "we never sell your personal data" or "zero data selling".',
    sourceReferences: [
      'Digital Personal Data Protection Act (DPDP Act), 2023 (India)',
      'ToS;DR — Data Sharing & Tracking Topic Corpus (CC BY-SA 3.0)',
    ],
    licenseAttribution: 'Apache-2.0 / ToS;DR CC BY-SA 3.0',
    positiveTestExample:
      'We may sell your personal information to third-party marketing partners and data brokers.',
    negativeTestExample:
      'We never sell your personal data to third parties or data brokers.',
    indiaLegalContext: {
      applicableFramework: 'Digital Personal Data Protection Act (DPDP Act), 2023 (Sections 6 & 7)',
      classification: 'Statutory Provision',
      noteEn:
        'Under the Digital Personal Data Protection Act, 2023, consent must be free, specific, informed, unconditional, and unambiguous, with a clear right to withdraw consent as easily as it was given.',
      noteHi:
        'डिजिटल व्यक्तिगत डेटा संरक्षण अधिनियम (DPDP Act), 2023 के तहत उपयोगकर्ता की सहमति स्पष्ट, सूचित और स्वतंत्र होनी चाहिए, तथा सहमति वापस लेना उतना ही सरल होना चाहिए जितना सहमति देना था।',
      officialSourceUrl: 'https://www.meity.gov.in/',
      verifiedDate: '2026-10-01',
    },
  },
  {
    ruleId: 'TOS-CONTENT-LICENSE-07',
    ruleVersion: '1.2.0',
    category: 'Perpetual Content License',
    title: 'Irrevocable, Perpetual, or Sublicensable Content License',
    titleHi: 'आपकी सामग्री पर स्थायी और अपरिवर्तनीय (Irrevocable Perpetual) लाइसेंस',
    riskLevel: 'Medium',
    patterns: [
      /\b(irrevocable,?\s+perpetual,?\s+(worldwide,?\s+)?royalty[- ]free\s+license|permanent\s+ownership\s+of\s+your\s+content|perpetual\s+and\s+transferable\s+right\s+to\s+use,?\s+reproduce)\b/i,
    ],
    negationPatterns: [
      /\b(you\s+retain\s+full\s+ownership\s+of\s+your\s+data(\s+and\s+content)?|we\s+do\s+not\s+claim\s+any\s+ownership)\b/i,
    ],
    explanation:
      'Grants the platform a permanent, irrevocable right to use, modify, or sublicense content you upload even after you delete your account.',
    explanationHi:
      'यह शर्त प्लेटफ़ॉर्म को आपके द्वारा अपलोड की गई सामग्री का खाता हटाने के बाद भी हमेशा के लिए उपयोग या उप-लाइसेंस करने का अधिकार देती है।',
    whyItMatters:
      'Photos, documents, or creative work uploaded to the service could be reused commercially or for training without compensation.',
    whyItMattersHi:
      'आपकी फ़ोटो, दस्तावेज़ या रचनात्मक कार्य का बिना किसी भुगतान के व्यावसायिक उपयोग किया जा सकता है।',
    whatRemainsUnclear:
      'Whether private/unshared files are excluded from this broad license and whether account deletion revokes sublicenses.',
    whatRemainsUnclearHi:
      'यह स्पष्ट नहीं है कि निजी फ़ाइलें इस लाइसेंस से बाहर हैं या नहीं।',
    whatToCheck:
      'Verify whether deleting your account terminates the license within a reasonable technical window.',
    whatToCheckHi:
      'जाँच करें कि क्या खाता हटाने (Account Deletion) पर यह लाइसेंस समाप्त हो जाता है।',
    missingInfoOrLimitations:
      'Standard hosting services require a limited license to display your files back to you, whereas "irrevocable and perpetual" extends beyond hosting.',
    matchingLogicSummary:
      'Matches "irrevocable, perpetual" content license grants while ignoring ownership-retention assurances.',
    falsePositiveConsiderations:
      'Does not flag clauses stating "you retain full ownership of your data".',
    sourceReferences: ['ToS;DR — Copyright & Content License Corpus (CC BY-SA 3.0)'],
    licenseAttribution: 'Apache-2.0 / ToS;DR CC BY-SA 3.0',
    positiveTestExample:
      'You grant us an irrevocable, perpetual, worldwide, royalty-free license to use your content.',
    negativeTestExample: 'You retain full ownership of your data and content.',
    indiaLegalContext: {
      applicableFramework: 'Indian Copyright Act, 1957 (Section 19 — Assignment & Licensing)',
      classification: 'Consumer Best Practice',
      noteEn:
        'Check whether the license is restricted to operating the service or permits unrestricted commercial sublicensing.',
      noteHi:
        'जाँच करें कि क्या लाइसेंस केवल सेवा चलाने तक सीमित है या अनियंत्रित व्यावसायिक उपयोग की अनुमति देता है।',
      officialSourceUrl: 'https://copyright.gov.in/',
      verifiedDate: '2026-10-01',
    },
  },
  {
    ruleId: 'TOS-UNILATERAL-MOD-08',
    ruleVersion: '1.2.0',
    category: 'Unilateral Changes to Terms',
    title: 'Modify Terms Anytime Without Prior Notice',
    titleHi: 'बिना पूर्व सूचना के कभी भी नियम व शर्तें बदलने का अधिकार',
    riskLevel: 'Medium',
    patterns: [
      /\b(modify\s+these\s+terms\s+at\s+any\s+time\s+without\s+(prior\s+)?notice|change\s+the\s+agreement\s+solely\s+at\s+our\s+discretion\s+without\s+notifying\s+you)\b/i,
    ],
    negationPatterns: [
      /\b(notify\s+you\s+at\s+least\s+\d+\s+days\s+before\s+material\s+changes)\b/i,
    ],
    explanation:
      'Allows the provider to alter pricing, rules, or dispute procedures at any time without emailing or notifying users.',
    explanationHi:
      'यह शर्त कंपनी को उपयोगकर्ताओं को ईमेल या सूचना दिए बिना किसी भी समय नियम, शुल्क या नीतियों को बदलने की अनुमति देती है।',
    whyItMatters:
      'Continued use of the website after silent edits is treated as acceptance of the new terms.',
    whyItMattersHi:
      'बिना सूचना के बदलाव के बाद वेबसाइट का उपयोग जारी रखने को नई शर्तों की स्वीकृति मान लिया जाता है।',
    whatRemainsUnclear:
      'Whether material changes to subscription prices or dispute rules will be notified by email.',
    whatRemainsUnclearHi:
      'यह स्पष्ट नहीं है कि कीमत या विवाद नियमों में बड़े बदलाव होने पर ईमेल सूचना मिलेगी या नहीं।',
    whatToCheck:
      'Save or download a copy of the terms as they existed on the day you subscribed.',
    whatToCheckHi:
      'सदस्यता लेते समय लागू नियमों और शर्तों की एक प्रति अपने पास सुरक्षित रख लें।',
    missingInfoOrLimitations:
      'Unilateral changes to material financial terms without notice may be contested under general contract law principles.',
    matchingLogicSummary:
      'Flags "modify these terms at any time without notice" clauses.',
    falsePositiveConsiderations:
      'Suppresses matches when advance notice (e.g., 30 days) is promised.',
    sourceReferences: ['ToS;DR — Changes to Terms Without Notice Corpus (CC BY-SA 3.0)'],
    licenseAttribution: 'Apache-2.0 / ToS;DR CC BY-SA 3.0',
    positiveTestExample: 'We may modify these terms at any time without notice.',
    negativeTestExample: 'We will notify you at least 30 days before material changes take effect.',
    indiaLegalContext: {
      applicableFramework: 'Consumer Protection Act, 2019 — Section 2(46)(vi) (Unfair Contracts)',
      classification: 'Statutory Provision',
      noteEn:
        'Unilaterally altering the terms of a contract without notice or giving the consumer an option to exit without penalty may be scrutinized as an unfair contract term.',
      noteHi:
        'बिना सूचना दिए एकतरफा अनुबंध की शर्तों को बदलना उपभोक्ता संरक्षण अधिनियम के तहत अनुचित अनुबंध के रूप में देखा जा सकता है।',
      officialSourceUrl: 'https://consumeraffairs.nic.in/',
      verifiedDate: '2026-10-01',
    },
  },
  {
    ruleId: 'TOS-HIDDEN-FEES-09',
    ruleVersion: '1.2.0',
    category: 'Hidden Fees & Drip Pricing',
    title: 'Undisclosed Service, Processing, or Enhancement Fees',
    titleHi: 'छिपे हुए शुल्क और ड्रिप प्राइसिंग (Drip Pricing / Surcharges)',
    riskLevel: 'High',
    patterns: [
      /\b(annual\s+(club\s+enhancement|maintenance)\s+fee|non[- ]optional\s+service\s+processing\s+surcharge|mandatory\s+service\s+and\s+processing\s+fee\s+will\s+be\s+added|convenience\s+fee\s+added\s+at\s+final\s+step|administrative\s+recovery\s+fee)\b/i,
    ],
    negationPatterns: [
      /\b(zero\s+hidden\s+fees|no\s+processing\s+or\s+service\s+surcharges)\b/i,
    ],
    explanation:
      'Adds mandatory secondary surcharges, club enhancement fees, or processing fees on top of the advertised base price.',
    explanationHi:
      'विज्ञापित मूल कीमत के अलावा अनिवार्य वार्षिक रखरखाव शुल्क, प्रोसेसिंग शुल्क या सर्विस सरचार्ज जोड़ा जाता है।',
    whyItMatters:
      'The true total cost over 12 months can be significantly higher than the headline monthly price.',
    whyItMattersHi:
      '12 महीनों में आपकी वास्तविक कुल लागत शुरुआती विज्ञापित कीमत से कहीं अधिक हो सकती है।',
    whatRemainsUnclear:
      'The exact date on which recurring annual maintenance or processing surcharges are billed.',
    whatRemainsUnclearHi:
      'यह अतिरिक्त वार्षिक या प्रोसेसिंग शुल्क किस तारीख को काटा जाएगा, यह स्पष्ट नहीं हो सकता।',
    whatToCheck:
      'Review the final itemized order summary and check the Hidden Cost Calculator below before paying.',
    whatToCheckHi:
      'भुगतान करने से पहले अंतिम बिल का पूरा विवरण और नीचे दिए गए हिडन कॉस्ट कैलकुलेटर की जाँच करें।',
    missingInfoOrLimitations:
      'Some checkout surcharges appear only on the final payment step.',
    matchingLogicSummary:
      'Detects mandatory enhancement fees, processing surcharges, and late-stage drip pricing disclosures.',
    falsePositiveConsiderations:
      'Ignores clauses guaranteeing "zero hidden fees".',
    sourceReferences: [
      'CCPA Guidelines for Prevention and Regulation of Dark Patterns, 2023 — Annexure 1, Item 3 (Drip Pricing)',
      'Princeton WebTap Dark Patterns Corpus (Mathur et al., CSCW 2019)',
    ],
    licenseAttribution: 'Apache-2.0',
    positiveTestExample:
      'You will be billed a recurring annual club enhancement fee in addition to monthly dues.',
    negativeTestExample: 'Our plans include zero hidden fees and no processing surcharges.',
    indiaLegalContext: {
      applicableFramework:
        'CCPA Guidelines for Prevention and Regulation of Dark Patterns, 2023 (Annexure 1, Item 3: Drip Pricing)',
      classification: 'Regulatory Guideline',
      noteEn:
        'Under the CCPA Dark Patterns Guidelines, 2023, revealing mandatory additional charges only at the final checkout stage or hiding obligatory fees from the upfront price is prohibited as "Drip Pricing".',
      noteHi:
        'CCPA डार्क पैटर्न दिशानिर्देश, 2023 के अंतर्गत अनिवार्य अतिरिक्त शुल्कों को शुरुआती कीमत में न दिखाकर अंत में जोड़ना "ड्रिप प्राइसिंग" (Drip Pricing) के रूप में प्रतिबंधित है।',
      officialSourceUrl: 'https://consumeraffairs.nic.in/',
      verifiedDate: '2026-10-01',
    },
  },
  {
    ruleId: 'TOS-TRIAL-CONVERSION-10',
    ruleVersion: '1.2.0',
    category: 'Trial-to-Paid Conversion',
    title: 'Silent Free-Trial to Paid Subscription Conversion',
    titleHi: 'मुफ़्त ट्रायल का स्वतः सशुल्क सदस्यता में बदलना (Trial-to-Paid Conversion)',
    riskLevel: 'High',
    patterns: [
      /\b(trial\s+will\s+automatically\s+convert\s+to\s+a\s+paid|after\s+(your\s+)?(\d+[- ]day\s+)?free\s+trial,?\s+you\s+will\s+be\s+automatically\s+charged|auto[- ]billed\s+immediately\s+upon\s+trial\s+expiration|unless\s+cancell?ed\s+before\s+the\s+trial\s+ends)\b/i,
    ],
    negationPatterns: [
      /\b(no\s+credit\s+card\s+required\s+for\s+trial|trial\s+expires\s+automatically\s+without\s+charging)\b/i,
    ],
    explanation:
      'Converts a free or discounted trial directly into a paid recurring subscription without asking for confirmation when the trial ends.',
    explanationHi:
      'मुफ़्त ट्रायल समाप्त होते ही बिना किसी नई अनुमति के उसे सीधे सशुल्क आवर्ती सदस्यता (Paid Subscription) में बदल दिया जाता है।',
    whyItMatters:
      'Forgetting the exact trial expiration date or cancellation notice window results in an immediate recurring charge.',
    whyItMattersHi:
      'ट्रायल समाप्त होने की सटीक तारीख भूल जाने पर आपके खाते से तुरंत शुल्क कट सकता है।',
    whatRemainsUnclear:
      'Whether canceling during the trial terminates free access immediately or lets you use the remaining trial days.',
    whatRemainsUnclearHi:
      'यह स्पष्ट नहीं है कि ट्रायल के दौरान ऑटो-नवीनीकरण बंद करने पर मुफ़्त सुविधा तुरंत बंद हो जाएगी या ट्रायल अवधि तक चलेगी।',
    whatToCheck:
      'Check if you can disable auto-renewal immediately after starting the trial and note any 24–48 hour advance cancellation deadline.',
    whatToCheckHi:
      'ट्रायल शुरू करते ही सेटिंग्स में जाकर ऑटो-रिन्यूअल बंद करने की जाँच करें और 24-48 घंटे पूर्व रद्दीकरण की शर्त देखें।',
    missingInfoOrLimitations:
      'Check the exact trial duration and time zone used to calculate trial expiration.',
    matchingLogicSummary:
      'Matches automatic trial-to-paid conversion clauses while ignoring no-card-required trials.',
    falsePositiveConsiderations:
      'Excludes trials that expire automatically without charging.',
    sourceReferences: [
      'CCPA Guidelines for Prevention and Regulation of Dark Patterns, 2023 — Forced Action / Subscription Trap',
      'Brignull Deceptive Design Taxonomy — Sneak into Basket / Hidden Subscription',
    ],
    licenseAttribution: 'Apache-2.0',
    positiveTestExample:
      'Your 30-day free trial will automatically convert to a paid monthly subscription unless cancelled before the trial ends.',
    negativeTestExample: 'Your trial expires automatically without charging your card.',
    indiaLegalContext: {
      applicableFramework:
        'CCPA Dark Patterns Guidelines, 2023 & RBI e-Mandate Pre-Debit Notification Norms',
      classification: 'Regulatory Guideline',
      noteEn:
        'Silent conversion of a free trial into a paid recurring plan without clear disclosure and easy opt-out is flagged under CCPA Subscription Trap rules.',
      noteHi:
        'स्पष्ट सूचना और आसान रद्दीकरण विकल्प के बिना मुफ़्त ट्रायल को सशुल्क प्लान में बदलना CCPA दिशानिर्देशों के तहत जाँचा जाता है।',
      officialSourceUrl: 'https://consumeraffairs.nic.in/',
      verifiedDate: '2026-10-01',
    },
  },
  {
    ruleId: 'UI-PRESELECTED-ADDON-11',
    ruleVersion: '1.2.0',
    category: 'Preselected Paid Add-Ons',
    title: 'Pre-Checked Optional Paid Add-On or Insurance',
    titleHi: 'पहले से चुने गए (Pre-Selected) सशुल्क ऐड-ऑन या बीमा (Basket Sneaking)',
    riskLevel: 'High',
    patterns: [
      /\b(pre[- ]checked(\s+by\s+default)?|pre[- ]selected\s+(at\s+checkout|add[- ]on)|auto[- ]enroll\s+in\s+\w+\s+for\s+[₹$€£]?\d+|vip\s+baggage\s+protection\s+\(recommended\))\b/i,
    ],
    negationPatterns: [],
    explanation:
      'Includes optional paid protection, insurance, or club memberships that are opted-in by default at checkout.',
    explanationHi:
      'चेकआउट के समय वैकल्पिक सशुल्क बीमा, सुरक्षा या क्लब सदस्यता के बॉक्स पहले से ही टिक (Pre-checked) किए गए हैं।',
    whyItMatters:
      'Customers who click checkout quickly may pay for extra products or recurring memberships they never intended to buy.',
    whyItMattersHi:
      'जल्दी में भुगतान करने वाले ग्राहक अनजाने में उन अतिरिक्त सेवाओं या मासिक सदस्यताओं के लिए पैसे दे बैठते हैं जिन्हें वे खरीदना नहीं चाहते थे।',
    whatRemainsUnclear:
      'Whether the pre-selected add-on is a one-time charge or a recurring monthly subscription.',
    whatRemainsUnclearHi:
      'यह स्पष्ट नहीं हो सकता कि यह अतिरिक्त शुल्क एक बार के लिए है या हर महीने कटने वाला शुल्क है।',
    whatToCheck:
      'Inspect every checkbox on the checkout page and uncheck any optional add-ons before paying.',
    whatToCheckHi:
      'भुगतान करने से पहले चेकआउट पेज के प्रत्येक चेकबॉक्स को ध्यान से देखें और अनचाहे ऐड-ऑन हटा दें।',
    missingInfoOrLimitations:
      'Verify the final checkout total after unchecking optional add-ons.',
    matchingLogicSummary:
      'Detects explicit references to pre-checked or pre-selected paid add-ons at checkout.',
    falsePositiveConsiderations:
      'Only triggers when default opt-in / pre-selection is stated or observed in the DOM.',
    sourceReferences: [
      'CCPA Guidelines for Prevention and Regulation of Dark Patterns, 2023 — Annexure 1, Item 2 (Basket Sneaking)',
      'Princeton WebTap Dark Patterns Corpus (Mathur et al., CSCW 2019)',
    ],
    licenseAttribution: 'Apache-2.0',
    positiveTestExample:
      'Optional protection and stock add-ons are pre-selected at checkout for convenience.',
    negativeTestExample: 'All optional add-ons are unchecked by default.',
    indiaLegalContext: {
      applicableFramework:
        'CCPA Guidelines for Prevention and Regulation of Dark Patterns, 2023 (Annexure 1, Item 2: Basket Sneaking)',
      classification: 'Regulatory Guideline',
      noteEn:
        'Adding optional paid items, donations, or insurance to a cart via pre-ticked checkboxes without explicit affirmative user action is defined as "Basket Sneaking" under the 2023 CCPA Guidelines.',
      noteHi:
        'उपभोक्ता की स्पष्ट सहमति के बिना पहले से टिक किए गए चेकबॉक्स के माध्यम से अतिरिक्त सशुल्क वस्तुएँ या बीमा जोड़ना CCPA दिशानिर्देश, 2023 के तहत "बास्केट स्नीकिंग" (Basket Sneaking) कहलाता है।',
      officialSourceUrl: 'https://consumeraffairs.nic.in/',
      verifiedDate: '2026-10-01',
    },
  },
  {
    ruleId: 'UI-URGENCY-SCARCITY-12',
    ruleVersion: '1.2.0',
    category: 'Misleading Urgency & Scarcity',
    title: 'High-Pressure Countdown Timer or Low-Stock Claim',
    titleHi: 'कृत्रिम जल्दबाज़ी और सीमित स्टॉक का दबाव (False Urgency & Scarcity)',
    riskLevel: 'Medium',
    patterns: [
      /\b(offer\s+expires\s+in\s+\d{1,2}:\d{2}|only\s+\d+\s+(left\s+in\s+stock|seats?\s+left|promotional\s+membership\s+left)|people\s+are\s+(viewing|looking\s+at)\s+this\s+(flight|plan|item)?\s*right\s+now)\b/i,
    ],
    negationPatterns: [],
    explanation:
      'Uses countdown timers, low-stock warnings, or live viewer counts to rush your purchase decision.',
    explanationHi:
      'आपकी खरीदारी के निर्णय में जल्दबाज़ी कराने के लिए उल्टी गिनती (Countdown Timer), "केवल 1 बचा है" या "38 लोग अभी देख रहे हैं" जैसे संदेश दिखाए गए हैं।',
    whyItMatters:
      'Artificial time pressure discourages comparison shopping and reading the cancellation or refund terms.',
    whyItMattersHi:
      'समय का कृत्रिम दबाव आपको अन्य विकल्पों की तुलना करने और नियम व शर्तें पढ़ने से रोकता है।',
    whatRemainsUnclear:
      'Whether the stated inventory limit or countdown deadline is tied to real inventory or resets on page reload.',
    whatRemainsUnclearHi:
      'यह स्पष्ट नहीं है कि यह टाइमर और स्टॉक की संख्या वास्तविक है या पेज रीलोड करने पर फिर से शुरू हो जाती है।',
    whatToCheck:
      'Refresh the page or open it in a private window to verify whether the countdown timer resets.',
    whatToCheckHi:
      'पेज को रीफ़्रेश करें या इनकॉग्निटो विंडो में खोलकर देखें कि क्या टाइमर फिर से वहीं से शुरू हो जाता है।',
    missingInfoOrLimitations:
      'A countdown timer or stock indicator is an observable UI pattern; it is deceptive only if the deadline or inventory claim is fabricated.',
    matchingLogicSummary:
      'Detects countdown timer patterns (MM:SS), "Only X left in stock", and live viewer social-proof pressure.',
    falsePositiveConsiderations:
      'Distinguishes observable urgency messaging from confirmed fabrication by advising users to test timer persistence.',
    sourceReferences: [
      'CCPA Guidelines for Prevention and Regulation of Dark Patterns, 2023 — Annexure 1, Item 1 (False Urgency)',
      'Princeton WebTap Dark Patterns Corpus (Mathur et al., CSCW 2019)',
    ],
    licenseAttribution: 'Apache-2.0',
    positiveTestExample:
      'Hurry! Offer expires in 00:04:57 — 38 people are viewing this right now and only 1 left in stock!',
    negativeTestExample: 'In stock and ready to ship at our standard everyday price.',
    indiaLegalContext: {
      applicableFramework:
        'CCPA Guidelines for Prevention and Regulation of Dark Patterns, 2023 (Annexure 1, Item 1: False Urgency)',
      classification: 'Regulatory Guideline',
      noteEn:
        'Falsely stating or implying that quantities or promotional prices are more limited than they actually are to pressure a purchase is prohibited as "False Urgency" under the CCPA Guidelines.',
      noteHi:
        'खरीदारी के लिए दबाव बनाने हेतु स्टॉक या समय-सीमा के बारे में भ्रामक दावा करना CCPA दिशानिर्देश, 2023 के तहत "फॉल्स अर्जेंसी" (False Urgency) की श्रेणी में आता है।',
      officialSourceUrl: 'https://consumeraffairs.nic.in/',
      verifiedDate: '2026-10-01',
    },
  },
  {
    ruleId: 'UI-CONFIRMSHAMING-13',
    ruleVersion: '1.2.0',
    category: 'Confirm-Shaming',
    title: 'Manipulative Guilt-Trip Decline Option',
    titleHi: 'अस्वीकार करने पर अपराधबोध कराने वाली भाषा (Confirm-Shaming)',
    riskLevel: 'Medium',
    patterns: [
      /\b(no\s+thanks,?\s*i\s+(don't|do\s+not|hate)\s+(like\s+)?saving\s+money|no\s+thanks,?\s*i\s+prefer\s+to\s+pay\s+full\s+price|i'll\s+risk\s+it\s+without\s+(flight\s+)?protection)\b/i,
    ],
    negationPatterns: [],
    explanation:
      'Frames the "No thanks" or decline option with emotionally manipulative or self-critical wording.',
    explanationHi:
      '"नहीं, धन्यवाद" (Decline) विकल्प को ऐसी भाषा में लिखा गया है जो ग्राहक को शर्मिंदगी या डर का अनुभव कराए (जैसे: "नहीं, मैं पूरी कीमत चुकाना और जोखिम उठाना पसंद करूँगा")।',
    whyItMatters:
      'Designed to nudge users into accepting paid add-ons or recurring trials out of hesitation.',
    whyItMattersHi:
      'इसका उद्देश्य उपयोगकर्ता को भावनात्मक दबाव में लाकर महँगे ऐड-ऑन या सब्सक्रिप्शन स्वीकार करने के लिए प्रेरित करना है।',
    whatRemainsUnclear:
      'Whether clicking the guilt-trip link cleanly declines all optional charges without further popups.',
    whatRemainsUnclearHi:
      'यह स्पष्ट नहीं है कि इस लिंक पर क्लिक करने से सभी अतिरिक्त शुल्क तुरंत हट जाएँगे या फिर कोई नया पॉपअप आएगा।',
    whatToCheck:
      'Treat guilt-trip decline links as standard "No, thank you" buttons and verify your cart total.',
    whatToCheckHi:
      'ऐसी भावनात्मक भाषा से प्रभावित न हों, इसे सामान्य "नहीं" बटन समझें और अपने कार्ट की कुल राशि जाँचें।',
    missingInfoOrLimitations:
      'Confirm-shaming affects user interface fairness rather than contractual obligations.',
    matchingLogicSummary:
      'Matches guilt-inducing opt-out phrasing ("No thanks, I prefer to pay full price", "I\'ll risk it without protection").',
    falsePositiveConsiderations:
      'Neutral opt-out copy ("No thanks", "Continue with standard checkout") does not trigger this rule.',
    sourceReferences: [
      'CCPA Guidelines for Prevention and Regulation of Dark Patterns, 2023 — Annexure 1, Item 4 (Confirm Shaming)',
      'Brignull Deceptive Design Taxonomy — Confirmshaming',
    ],
    licenseAttribution: 'Apache-2.0',
    positiveTestExample:
      "No thanks, I prefer to pay full price and I'll risk it without flight protection.",
    negativeTestExample: 'Continue with standard shipping.',
    indiaLegalContext: {
      applicableFramework:
        'CCPA Guidelines for Prevention and Regulation of Dark Patterns, 2023 (Annexure 1, Item 4: Confirm Shaming)',
      classification: 'Regulatory Guideline',
      noteEn:
        'Using phrasing that creates fear, shame, ridicule, or guilt to nudge a consumer into purchasing insurance or subscribing is explicitly listed as "Confirm Shaming" in the CCPA 2023 Guidelines.',
      noteHi:
        'उपभोक्ता के मन में डर, शर्म या अपराधबोध पैदा करके किसी सेवा या बीमा को चुनने के लिए प्रेरित करना CCPA दिशानिर्देश, 2023 में "कन्फर्म शेमिंग" के रूप में सूचीबद्ध है।',
      officialSourceUrl: 'https://consumeraffairs.nic.in/',
      verifiedDate: '2026-10-01',
    },
  },
  {
    ruleId: 'TOS-LIABILITY-TERM-14',
    ruleVersion: '1.2.0',
    category: 'Liability & Account Termination',
    title: 'Broad Liability Cap or Unilateral Account Termination',
    titleHi: 'एकतरफा खाता समाप्ति या शून्य देयता सीमा (Unilateral Account Termination)',
    riskLevel: 'Medium',
    patterns: [
      /\b(terminate\s+or\s+suspend\s+your\s+account\s+at\s+any\s+time\s+without\s+cause\s+or\s+refund|maximum\s+aggregate\s+liability\s+shall\s+not\s+exceed\s+\$?0|not\s+liable\s+for\s+any\s+loss\s+of\s+data\s+or\s+funds)\b/i,
    ],
    negationPatterns: [],
    explanation:
      'Allows the provider to close accounts without refunding unused prepaid balances or caps liability near zero.',
    explanationHi:
      'कंपनी बिना किसी कारण या रिफंड के कभी भी आपका खाता बंद कर सकती है और डेटा या पैसे के नुकसान की ज़िम्मेदारी से इनकार करती है।',
    whyItMatters:
      'Prepaid credits, digital purchases, or stored files could become inaccessible if an account is suspended.',
    whyItMattersHi:
      'खाता निलंबित होने पर आपके पहले से भुगतान किए गए पैसे या स्टोर की गई महत्वपूर्ण फ़ाइलें खो सकती हैं।',
    whatRemainsUnclear:
      'Whether an appeal process or data-export window is provided before permanent account deletion.',
    whatRemainsUnclearHi:
      'खाता स्थायी रूप से बंद करने से पहले अपील करने या अपना डेटा डाउनलोड करने का अवसर मिलेगा या नहीं, यह अस्पष्ट है।',
    whatToCheck:
      'Keep local backups of important files and check whether unused prepaid time is refunded upon termination.',
    whatToCheckHi:
      'अपनी महत्वपूर्ण फ़ाइलों का स्थानीय बैकअप रखें और जाँचें कि खाता बंद होने पर शेष अवधि का रिफंड मिलता है या नहीं।',
    missingInfoOrLimitations:
      'Account termination rights often distinguish between termination for cause (breach of terms) and termination without cause.',
    matchingLogicSummary:
      'Matches "terminate or suspend your account at any time without cause or refund" and zero-liability caps.',
    falsePositiveConsiderations:
      'Does not flag termination clauses that provide pro-rated refunds for termination without cause.',
    sourceReferences: ['ToS;DR — Account Suspension & Liability Limitation Corpus (CC BY-SA 3.0)'],
    licenseAttribution: 'Apache-2.0 / ToS;DR CC BY-SA 3.0',
    positiveTestExample:
      'We may terminate or suspend your account at any time without cause or refund.',
    negativeTestExample:
      'If we discontinue the service without cause, you will receive a pro-rated refund.',
    indiaLegalContext: {
      applicableFramework: 'Consumer Protection Act, 2019 — Section 2(46) (Unfair Contracts)',
      classification: 'Statutory Provision',
      noteEn:
        'Clauses permitting unilateral termination of a contract without reasonable cause or refund of prepaid consideration may be examined under Section 2(46) of the Consumer Protection Act, 2019.',
      noteHi:
        'बिना किसी उचित कारण या रिफंड के अनुबंध को एकतरफा समाप्त करने वाली शर्तें उपभोक्ता संरक्षण अधिनियम, 2019 की धारा 2(46) के अंतर्गत आती हैं।',
      officialSourceUrl: 'https://consumeraffairs.nic.in/',
      verifiedDate: '2026-10-01',
    },
  },
];

interface KnownServiceEntry {
  serviceName: string;
  tosdrClass?: string;
  cancellationDifficulty: 'EASY' | 'MEDIUM' | 'HARD' | 'IMPOSSIBLE';
  verifiedCancellationUrl: string;
  sourceAttribution: string;
  lastVerified: string;
}

const KNOWN_SERVICE_DIRECTORY: Record<string, KnownServiceEntry> = {
  'adobe.com': {
    serviceName: 'Adobe Creative Cloud',
    tosdrClass: 'Class D (ToS;DR)',
    cancellationDifficulty: 'HARD',
    verifiedCancellationUrl: 'https://account.adobe.com/plans',
    sourceAttribution: 'JustDeleteMe & ToS;DR Public Corpus',
    lastVerified: '2026-10-01',
  },
  'amazon.com': {
    serviceName: 'Amazon / Amazon Prime',
    tosdrClass: 'Class D (ToS;DR)',
    cancellationDifficulty: 'HARD',
    verifiedCancellationUrl: 'https://www.amazon.com/mc/pipelines/cancellation',
    sourceAttribution: 'JustDeleteMe & ToS;DR Public Corpus',
    lastVerified: '2026-10-01',
  },
  'netflix.com': {
    serviceName: 'Netflix',
    tosdrClass: 'Class C (ToS;DR)',
    cancellationDifficulty: 'EASY',
    verifiedCancellationUrl: 'https://www.netflix.com/cancelplan',
    sourceAttribution: 'JustDeleteMe Public Directory',
    lastVerified: '2026-10-01',
  },
  'planetfitness.com': {
    serviceName: 'Planet Fitness',
    tosdrClass: 'Class E (ToS;DR)',
    cancellationDifficulty: 'IMPOSSIBLE',
    verifiedCancellationUrl: 'https://www.planetfitness.com/about-planet-fitness/customer-service',
    sourceAttribution: 'JustDeleteMe Public Directory',
    lastVerified: '2026-10-01',
  },
  'signal.org': {
    serviceName: 'Signal Messenger',
    tosdrClass: 'Class A (ToS;DR)',
    cancellationDifficulty: 'EASY',
    verifiedCancellationUrl: 'https://support.signal.org/',
    sourceAttribution: 'ToS;DR Public Corpus',
    lastVerified: '2026-10-01',
  },
};

/**
 * Splits raw document or webpage text into logical sentences/clauses with section or page tracking.
 */
export function splitIntoClausesWithLocations(rawText: string): Array<{
  clause: string;
  location: string;
}> {
  const lines = rawText
    .replace(/\r\n/g, '\n')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean);

  const results: Array<{ clause: string; location: string }> = [];
  let currentSection = 'Section 1 / General Terms';
  let currentPage = 1;

  for (const line of lines) {
    const pageMarker =
      line.match(/^---\s*Page\s+(\d+)\s*---$/i) || line.match(/^\[Page\s+(\d+)\]$/i);
    if (pageMarker) {
      currentPage = Number(pageMarker[1]);
      currentSection = `Page ${currentPage}`;
      continue;
    }

    // Check for inline heading + clause: e.g. "Section 1. Pricing: Your subscription costs..."
    const inlineSectionMatch = line.match(
      /^((?:section|article|clause|part)\s+\d+[a-z]?\.?\s*[^:]{0,50}):\s+(.+)$/i
    );
    let contentToSplit = line;

    if (inlineSectionMatch) {
      const headingPart = inlineSectionMatch[1].trim();
      currentSection = currentPage > 1 ? `Page ${currentPage} · ${headingPart}` : headingPart;
      contentToSplit = inlineSectionMatch[2].trim();
    } else if (
      line.length <= 75 &&
      !/[.!?]$/.test(line) &&
      (/^(section|article|clause|part|\d+\.)\s+/i.test(line) ||
        /^[A-Z0-9\s,&-]{5,70}$/.test(line))
    ) {
      currentSection = currentPage > 1 ? `Page ${currentPage} · ${line}` : line;
      continue;
    }

    const sentences = contentToSplit
      .split(/(?<=[.!?])\s+(?=[A-Z0-9"“([])/g)
      .map((s) => s.trim())
      .filter((s) => s.length >= 12);

    for (const sentence of sentences) {
      results.push({
        clause: sentence,
        location: currentSection,
      });
    }
  }

  return results;
}

/**
 * PART 3: HIDDEN COST CALCULATOR
 * Extracts explicitly stated prices, trial durations, preselected add-ons, and early termination
 * penalties from the contract text. Never invents prices, taxes, or penalties when absent.
 */
export function calculateHiddenCosts(
  rawText: string,
  periodMonths = 12
): HiddenCostEstimate {
  const safePeriod = Math.max(1, Math.min(60, Math.round(periodMonths || 12)));
  const clauses = splitIntoClausesWithLocations(rawText);

  let freeTrialDays: number | null = null;
  let trialQuote: string | null = null;
  let earlyTerminationPenaltyPercent: number | null = null;
  let penaltyQuote: string | null = null;
  let refundLimitationSummary: string | null = null;
  let cancellationConditionSummary: string | null = null;

  const statedBaseItems: HiddenCostBreakdownItem[] = [];
  const statedAddons: HiddenCostBreakdownItem[] = [];
  const statedAdditionalFees: HiddenCostBreakdownItem[] = [];

  const currencyMap: Record<string, { symbol: string; code: string }> = {
    '₹': { symbol: '₹', code: 'INR' },
    'rs.': { symbol: '₹', code: 'INR' },
    inr: { symbol: '₹', code: 'INR' },
    $: { symbol: '$', code: 'USD' },
    usd: { symbol: '$', code: 'USD' },
    '€': { symbol: '€', code: 'EUR' },
    eur: { symbol: '€', code: 'EUR' },
    '£': { symbol: '£', code: 'GBP' },
    gbp: { symbol: '£', code: 'GBP' },
  };

  let detectedCurrency = { symbol: '₹', code: 'INR', assumed: true };

  for (const { clause, location } of clauses) {
    // 1. Detect free trial duration
    const trialMatch = clause.match(/\b(\d{1,3})[- ]day\s+(?:[\w\s]{0,20})?free\s+trial\b/i) ||
      clause.match(/\b(\d{1,3})[- ]day\s+trial\b/i);
    if (trialMatch && freeTrialDays === null) {
      freeTrialDays = Number(trialMatch[1]);
      trialQuote = clause;
    }

    // 2. Detect early termination penalty percentage (e.g. 50% of remaining annual contract)
    const penaltyMatch = clause.match(
      /\b(\d{1,3})%\s+(?:early\s+termination\s+(?:fee|penalty)|of\s+(?:your\s+)?remaining\s+(?:annual\s+)?contract)/i
    );
    if (penaltyMatch && earlyTerminationPenaltyPercent === null) {
      earlyTerminationPenaltyPercent = Number(penaltyMatch[1]);
      penaltyQuote = clause;
    }

    // 3. Detect refund limitation
    if (
      !refundLimitationSummary &&
      /\b(non[- ]refundable|no\s+refunds\s+under\s+any\s+circumstances)\b/i.test(clause)
    ) {
      refundLimitationSummary = clause;
    }

    // 4. Detect cancellation condition
    if (
      !cancellationConditionSummary &&
      /\b(unless\s+cancell?ed|to\s+cancel|cancel\s+before|in\s+person|certified\s+mail)\b/i.test(
        clause
      )
    ) {
      cancellationConditionSummary = clause;
    }

    // 5. Extract monetary amounts with currency symbols: e.g. ₹1,675/mo, $29.99/month, ₹2,499
    const priceRegex =
      /(₹|Rs\.?|INR|\$|USD|€|EUR|£|GBP)\s*(\d{1,3}(?:,\d{2,3})*(?:\.\d{1,2})?|\d+(?:\.\d{1,2})?)\s*(?:\/\s*(mo|month|yr|year)|per\s+(month|year))?/gi;
    let m: RegExpExecArray | null;
    while ((m = priceRegex.exec(clause)) !== null) {
      const rawCur = m[1].toLowerCase();
      const curInfo = currencyMap[rawCur] || { symbol: '₹', code: 'INR' };
      detectedCurrency = { symbol: curInfo.symbol, code: curInfo.code, assumed: false };

      const numericVal = Number(m[2].replace(/,/g, ''));
      if (!Number.isFinite(numericVal) || numericVal <= 0) continue;

      const unitToken = (m[3] || m[4] || '').toLowerCase();
      const lowerClause = clause.toLowerCase();

      let frequency: 'one-time' | 'monthly' | 'annual' = 'monthly';
      if (
        unitToken === 'yr' ||
        unitToken === 'year' ||
        /\b(annual\s+fee|per\s+year|each\s+year|annually)\b/i.test(lowerClause)
      ) {
        frequency = 'annual';
      } else if (
        unitToken === 'mo' ||
        unitToken === 'month' ||
        /\b(monthly|per\s+month|each\s+month|\/mo)\b/i.test(lowerClause)
      ) {
        frequency = 'monthly';
      } else if (
        /\b(protection|baggage|one[- ]time|activation|setup|processing|fare|ticket)\b/i.test(
          lowerClause
        ) &&
        !/\b(monthly|recurring|auto[- ]?renew)\b/i.test(lowerClause)
      ) {
        frequency = 'one-time';
      }

      const isAddon =
        /\b(add[- ]on|optional|pre[- ]selected|pre[- ]checked|vip|protection|stock\s+plan|club\s+gold|insurance)\b/i.test(
          lowerClause
        );
      const isHiddenFee =
        /\b(enhancement\s+fee|maintenance\s+fee|processing\s+fee|service\s+surcharge|convenience\s+fee)\b/i.test(
          lowerClause
        );

      const item: HiddenCostBreakdownItem = {
        label: isAddon
          ? 'Optional / Pre-Selected Add-On'
          : isHiddenFee
          ? 'Mandatory Additional Fee / Surcharge'
          : frequency === 'annual'
          ? 'Stated Annual Subscription / Charge'
          : frequency === 'monthly'
          ? 'Stated Monthly Subscription / Charge'
          : 'Stated Base / Upfront Price',
        amount: numericVal,
        currencySymbol: curInfo.symbol,
        frequency,
        quote: clause,
        location,
      };

      if (isAddon) {
        statedAddons.push(item);
      } else if (isHiddenFee) {
        statedAdditionalFees.push(item);
      } else {
        statedBaseItems.push(item);
      }
    }
  }

  const hasExplicitPrices =
    statedBaseItems.length > 0 || statedAddons.length > 0 || statedAdditionalFees.length > 0;
  const calculable =
    hasExplicitPrices ||
    freeTrialDays !== null ||
    earlyTerminationPenaltyPercent !== null;

  if (!calculable) {
    return {
      calculable: false,
      currencySymbol: detectedCurrency.symbol,
      currencyCode: detectedCurrency.code,
      currencyAssumed: true,
      periodMonths: safePeriod,
      freeTrialDays: null,
      trialQuote: null,
      initialPayment: null,
      monthlyRecurringCost: null,
      annualRecurringCost: null,
      estimatedTotalForPeriod: null,
      estimatedTotalWithAddonsForPeriod: null,
      earlyTerminationPenaltyPercent: null,
      estimatedMidTermCancelPenalty: null,
      penaltyQuote: null,
      refundLimitationSummary,
      cancellationConditionSummary,
      statedBaseItems: [],
      statedAddons: [],
      statedAdditionalFees: [],
      assumptions: [],
      assumptionsHi: [],
      nonCalculableReason:
        'No explicit monetary prices, trial durations, or percentage penalties were stated in the analyzed text. OpenShield never invents or guesses prices when they are absent from the document.',
      nonCalculableReasonHi:
        'विश्लेषित पाठ में कोई स्पष्ट मूल्य, ट्रायल अवधि या जुर्माना प्रतिशत उल्लेखित नहीं है। OpenShield कभी भी काल्पनिक कीमतों का अनुमान नहीं लगाता।',
    };
  }

  // Compute base monthly recurring & one-time amounts from stated figures only
  let baseMonthly = 0;
  let baseAnnual = 0;
  let baseOneTime = 0;

  for (const item of statedBaseItems) {
    if (item.frequency === 'monthly') baseMonthly += item.amount;
    else if (item.frequency === 'annual') baseAnnual += item.amount;
    else baseOneTime += item.amount;
  }

  let addonMonthly = 0;
  let addonOneTime = 0;
  for (const addon of statedAddons) {
    if (addon.frequency === 'monthly') addonMonthly += addon.amount;
    else if (addon.frequency === 'annual') addonMonthly += addon.amount / 12;
    else addonOneTime += addon.amount;
  }

  let extraFeeAnnual = 0;
  let extraFeeOneTime = 0;
  for (const fee of statedAdditionalFees) {
    if (fee.frequency === 'annual') extraFeeAnnual += fee.amount;
    else if (fee.frequency === 'monthly') baseMonthly += fee.amount;
    else extraFeeOneTime += fee.amount;
  }

  const effectiveMonthlyRecurring =
    baseMonthly > 0
      ? baseMonthly
      : baseAnnual > 0
      ? Math.round((baseAnnual / 12) * 100) / 100
      : null;

  const effectiveAnnualRecurring =
    baseMonthly > 0 || baseAnnual > 0 || extraFeeAnnual > 0
      ? baseMonthly * 12 + baseAnnual + extraFeeAnnual
      : null;

  const yearsInPeriod = Math.ceil(safePeriod / 12);
  const estimatedTotalForPeriod = hasExplicitPrices
    ? Math.round(
        (baseOneTime +
          extraFeeOneTime +
          baseMonthly * safePeriod +
          (baseAnnual + extraFeeAnnual) * (safePeriod / 12)) *
          100
      ) / 100
    : null;

  const estimatedTotalWithAddonsForPeriod = hasExplicitPrices
    ? Math.round(
        ((estimatedTotalForPeriod || 0) + addonOneTime + addonMonthly * safePeriod) * 100
      ) / 100
    : null;

  const initialPayment = hasExplicitPrices
    ? freeTrialDays && freeTrialDays > 0 && baseOneTime === 0
      ? 0
      : baseOneTime > 0
      ? baseOneTime
      : baseMonthly > 0
      ? baseMonthly
      : baseAnnual > 0
      ? baseAnnual
      : addonOneTime + addonMonthly
    : null;

  const estimatedMidTermCancelPenalty =
    earlyTerminationPenaltyPercent !== null && effectiveAnnualRecurring !== null
      ? Math.round(
          effectiveAnnualRecurring * 0.5 * (earlyTerminationPenaltyPercent / 100) * 100
        ) / 100
      : null;

  const assumptions: string[] = [];
  const assumptionsHi: string[] = [];

  if (hasExplicitPrices) {
    assumptions.push(
      `Assumes explicitly stated rates remain unchanged over ${safePeriod} months and excludes unstated taxes or variable usage charges.`
    );
    assumptionsHi.push(
      `यह गणना मानती है कि दस्तावेज़ में बताई गई दरें ${safePeriod} महीनों तक अपरिवर्तित रहेंगी और इसमें अघोषित कर (Taxes) शामिल नहीं हैं।`
    );
  }
  if (freeTrialDays !== null) {
    assumptions.push(
      `Includes a ${freeTrialDays}-day trial period that converts to paid billing unless cancelled before trial expiration.`
    );
    assumptionsHi.push(
      `इसमें ${freeTrialDays}-दिन का ट्रायल शामिल है जो समय से पहले रद्द न करने पर सशुल्क प्लान में बदल जाता है।`
    );
  }
  if (earlyTerminationPenaltyPercent !== null) {
    assumptions.push(
      `Contract states a ${earlyTerminationPenaltyPercent}% early termination penalty on remaining annual contract obligations.`
    );
    assumptionsHi.push(
      `अनुबंध में वार्षिक अवधि पूरी होने से पहले रद्द करने पर शेष अवधि का ${earlyTerminationPenaltyPercent}% जुर्माना उल्लेखित है।`
    );
  }
  if (yearsInPeriod >= 1 && statedAddons.length > 0) {
    assumptions.push(
      'Comparison shows base cost vs. total cost if pre-selected or optional paid add-ons are left enabled.'
    );
    assumptionsHi.push(
      'यह तुलना मूल कीमत बनाम वैकल्पिक/प्री-सेलेक्टेड ऐड-ऑन चालू रहने पर कुल लागत दिखाती है।'
    );
  }

  return {
    calculable: true,
    currencySymbol: detectedCurrency.symbol,
    currencyCode: detectedCurrency.code,
    currencyAssumed: detectedCurrency.assumed,
    periodMonths: safePeriod,
    freeTrialDays,
    trialQuote,
    initialPayment,
    monthlyRecurringCost: effectiveMonthlyRecurring,
    annualRecurringCost: effectiveAnnualRecurring,
    estimatedTotalForPeriod,
    estimatedTotalWithAddonsForPeriod,
    earlyTerminationPenaltyPercent,
    estimatedMidTermCancelPenalty,
    penaltyQuote,
    refundLimitationSummary,
    cancellationConditionSummary,
    statedBaseItems,
    statedAddons,
    statedAdditionalFees,
    assumptions,
    assumptionsHi,
  };
}

/**
 * PART 4: OPENSHIELD ACTION PLAN GENERATOR
 * Produces practical, evidence-backed next steps based on detected clauses and service directory metadata.
 */
export function generateActionPlan(
  findings: EvidenceFinding[],
  knownServiceInfo?: AnalysisReport['knownServiceInfo'],
  costEstimate?: HiddenCostEstimate
): ActionPlanItem[] {
  const actions: ActionPlanItem[] = [];
  const addedRuleIds = new Set<string>();

  for (const f of findings) {
    if (addedRuleIds.has(f.ruleId)) continue;
    addedRuleIds.add(f.ruleId);

    let priority: ActionPlanItem['priority'] = 'Before Paying';
    if (f.riskLevel === 'Critical' || f.ruleId === 'UI-PRESELECTED-ADDON-11') {
      priority = 'Immediate';
    } else if (f.ruleId === 'TOS-UNILATERAL-MOD-08' || f.ruleId === 'TOS-CONTENT-LICENSE-07') {
      priority = 'Record Keeping';
    }

    actions.push({
      id: `action-${f.ruleId}`,
      priority,
      title: `Verify ${f.category}: ${f.title}`,
      titleHi: `जाँच करें (${f.category}): ${f.titleHi}`,
      detail: f.whatToCheck,
      detailHi: f.whatToCheckHi,
      supportingQuote: f.quote,
      supportingLocation: f.location,
      ruleId: f.ruleId,
      officialLink:
        knownServiceInfo?.verifiedCancellationUrl &&
        (f.ruleId === 'TOS-AUTORENEW-03' ||
          f.ruleId === 'TOS-ROACH-CANCEL-05' ||
          f.ruleId === 'TOS-TRIAL-CONVERSION-10')
          ? {
              label: `Official ${knownServiceInfo.serviceName} Cancellation / Account Page`,
              url: knownServiceInfo.verifiedCancellationUrl,
            }
          : undefined,
    });
  }

  if (costEstimate?.freeTrialDays) {
    actions.unshift({
      id: 'action-trial-calendar',
      priority: 'Immediate',
      title: `Set a reminder before the ${costEstimate.freeTrialDays}-day trial ends`,
      titleHi: `${costEstimate.freeTrialDays}-दिन का ट्रायल समाप्त होने से पहले रिमाइंडर सेट करें`,
      detail:
        'Set a calendar alert at least 48 hours before the trial expiration date so you can decide whether to cancel before automatic billing starts.',
      detailHi:
        'ट्रायल समाप्त होने की तिथि से कम से कम 48 घंटे पहले का कैलेंडर अलर्ट लगाएँ ताकि स्वचालित शुल्क कटने से पहले आप निर्णय ले सकें।',
      supportingQuote: costEstimate.trialQuote || undefined,
    });
  }

  // Always include a record-keeping step
  actions.push({
    id: 'action-save-copy',
    priority: 'Record Keeping',
    title: 'Save a timestamped copy of these Terms & Conditions',
    titleHi: 'इन नियमों और शर्तों की तारीख-सहित प्रति सुरक्षित रखें',
    detail:
      'Download or copy this OpenShield report so you have a record of the exact wording and pricing disclosures shown to you today.',
    detailHi:
      'इस OpenShield रिपोर्ट को डाउनलोड या कॉपी कर लें ताकि आपके पास आज दिखाई गई सटीक शर्तों और कीमतों का प्रमाण रहे।',
  });

  return actions;
}

/**
 * PART 6: POLICY DOCUMENT COMPARISON ENGINE (DIFF)
 * Compares Version A (Previous Policy) and Version B (Updated Policy) using actual clause text diffing.
 */
export function comparePolicyDocuments(
  versionAText: string,
  versionBText: string,
  versionALabel = 'Version A (Previous Policy)',
  versionBLabel = 'Version B (Updated Policy)'
): PolicyDiffReport {
  const clausesA = splitIntoClausesWithLocations(versionAText);
  const clausesB = splitIntoClausesWithLocations(versionBText);

  const normalizeForExact = (s: string) => s.trim();
  const normalizeForFormatting = (s: string) =>
    s
      .toLowerCase()
      .replace(/[^\w₹$€£%]/g, '')
      .trim();

  const exactSetA = new Set(clausesA.map((c) => normalizeForExact(c.clause)));
  const exactSetB = new Set(clausesB.map((c) => normalizeForExact(c.clause)));

  const formatMapA = new Map<string, string>();
  for (const c of clausesA) {
    formatMapA.set(normalizeForFormatting(c.clause), c.clause);
  }

  let formattingOnlyIgnoredCount = 0;

  const unmatchedA: string[] = [];
  for (const c of clausesA) {
    const exact = normalizeForExact(c.clause);
    if (!exactSetB.has(exact)) {
      unmatchedA.push(c.clause);
    }
  }

  const unmatchedB: string[] = [];
  for (const c of clausesB) {
    const exact = normalizeForExact(c.clause);
    if (!exactSetA.has(exact)) {
      const fmt = normalizeForFormatting(c.clause);
      if (formatMapA.has(fmt)) {
        formattingOnlyIgnoredCount++;
      } else {
        unmatchedB.push(c.clause);
      }
    }
  }

  // Filter out formatting-only from unmatchedA as well
  const formatSetB = new Set(clausesB.map((c) => normalizeForFormatting(c.clause)));
  const substantiveRemoved = unmatchedA.filter(
    (clause) => !formatSetB.has(normalizeForFormatting(clause))
  );

  const changes: PolicyDiffChange[] = [];
  const pairedRemovedIndices = new Set<number>();

  // Pair modified clauses by shared topic/keywords (e.g. price change, renewal change, refund change, arbitration change)
  for (const addedClause of unmatchedB) {
    let bestIdx = -1;
    let bestScore = 0;

    const wordsB = new Set(
      addedClause
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length >= 4)
    );

    substantiveRemoved.forEach((removedClause, idx) => {
      if (pairedRemovedIndices.has(idx)) return;
      const wordsA = removedClause
        .toLowerCase()
        .split(/\W+/)
        .filter((w) => w.length >= 4);
      let overlap = 0;
      for (const w of wordsA) {
        if (wordsB.has(w)) overlap++;
      }
      const unionSize = new Set([...wordsA, ...wordsB]).size || 1;
      const similarity = overlap / unionSize;
      if (similarity > bestScore && similarity >= 0.22) {
        bestScore = similarity;
        bestIdx = idx;
      }
    });

    if (bestIdx !== -1) {
      pairedRemovedIndices.add(bestIdx);
      const beforeQuote = substantiveRemoved[bestIdx];
      const afterQuote = addedClause;
      const combined = `${beforeQuote} ${afterQuote}`;

      let changeType: PolicyDiffChange['changeType'] = 'Modified Wording';
      let riskImpact: PolicyDiffChange['riskImpact'] = 'Neutral / Clarified';
      let summaryEn = 'Contract wording was updated between versions.';
      let summaryHi = 'दोनों संस्करणों के बीच अनुबंध की शब्दावली में बदलाव किया गया है।';

      if (/(₹|Rs\.?|\$|€|£|\d+%)/i.test(combined)) {
        changeType = 'Changed Price / Fee';
        riskImpact = 'Increased Risk';
        summaryEn =
          'Pricing, subscription rate, or penalty percentage changed between Version A and Version B.';
        summaryHi =
          'संस्करण A और संस्करण B के बीच कीमत, सदस्यता शुल्क या जुर्माना प्रतिशत में बदलाव हुआ है।';
      } else if (/\b(renew|auto[- ]?renew|billing\s+cycle|trial)\b/i.test(combined)) {
        changeType = 'Changed Renewal Condition';
        riskImpact = /\b(automatically\s+renew|auto[- ]?renew)\b/i.test(afterQuote)
          ? 'Increased Risk'
          : 'Reduced Risk';
        summaryEn = 'Subscription renewal or trial conversion terms were modified.';
        summaryHi = 'सदस्यता नवीनीकरण या ट्रायल परिवर्तन की शर्तों में बदलाव किया गया है।';
      } else if (/\b(cancel|refund|termination|certified\s+mail|in\s+person)\b/i.test(combined)) {
        changeType = 'Changed Cancellation / Refund Provision';
        riskImpact = /\b(non[- ]refundable|in\s+person|certified\s+mail|penalty)\b/i.test(
          afterQuote
        )
          ? 'Increased Risk'
          : 'Reduced Risk';
        summaryEn = 'Cancellation procedure or refund eligibility rules were altered.';
        summaryHi = 'रद्दीकरण प्रक्रिया या रिफंड पात्रता नियमों में परिवर्तन किया गया है।';
      } else if (/\b(arbitration|class\s+action|dispute|court)\b/i.test(combined)) {
        changeType = 'Changed Dispute / Arbitration Clause';
        riskImpact = /\b(binding\s+arbitration|waive.*class\s+action)\b/i.test(afterQuote)
          ? 'Increased Risk'
          : 'Reduced Risk';
        summaryEn = 'Dispute resolution, arbitration, or class-action rights were modified.';
        summaryHi = 'विवाद समाधान, मध्यस्थता या सामूहिक मुकदमे के अधिकारों में बदलाव हुआ है।';
      } else if (/\b(sell|share|marketing\s+partners|third[- ]party|data\s+brokers)\b/i.test(combined)) {
        changeType = 'Changed Data-Sharing Provision';
        riskImpact = /\b(sell|marketing\s+partners|data\s+brokers)\b/i.test(afterQuote)
          ? 'Increased Risk'
          : 'Reduced Risk';
        summaryEn = 'Third-party data sharing or privacy terms were changed.';
        summaryHi = 'तृतीय-पक्ष डेटा साझाकरण या गोपनीयता शर्तों में बदलाव किया गया है।';
      }

      changes.push({
        id: `diff-mod-${changes.length + 1}`,
        changeType,
        riskImpact,
        summaryEn,
        summaryHi,
        beforeQuote,
        afterQuote,
      });
    } else {
      // Purely added clause in Version B
      const matchedRule = CLAUSE_DETECTION_RULES.find(
        (r) =>
          !r.negationPatterns.some((n) => n.test(addedClause)) &&
          r.patterns.some((p) => p.test(addedClause))
      );
      changes.push({
        id: `diff-add-${changes.length + 1}`,
        changeType: 'Added Risky Clause',
        riskImpact: matchedRule ? 'Increased Risk' : 'Neutral / Clarified',
        summaryEn: matchedRule
          ? `New ${matchedRule.category} clause added in ${versionBLabel}.`
          : `New clause added in ${versionBLabel}.`,
        summaryHi: matchedRule
          ? `${versionBLabel} में नई "${matchedRule.titleHi}" शर्त जोड़ी गई है।`
          : `${versionBLabel} में नई शर्त जोड़ी गई है।`,
        beforeQuote: null,
        afterQuote: addedClause,
        category: matchedRule?.category,
      });
    }
  }

  // Remaining unpaired clauses from Version A are pure removals
  substantiveRemoved.forEach((removedClause, idx) => {
    if (pairedRemovedIndices.has(idx)) return;
    changes.push({
      id: `diff-rem-${changes.length + 1}`,
      changeType: 'Removed Clause',
      riskImpact: 'Neutral / Clarified',
      summaryEn: `Clause present in ${versionALabel} was removed in ${versionBLabel}.`,
      summaryHi: `${versionALabel} में मौजूद यह शर्त ${versionBLabel} से हटा दी गई है।`,
      beforeQuote: removedClause,
      afterQuote: null,
    });
  });

  const addedCount = changes.filter((c) => c.beforeQuote === null && c.afterQuote !== null).length;
  const removedCount = changes.filter(
    (c) => c.beforeQuote !== null && c.afterQuote === null
  ).length;
  const modifiedCount = changes.filter(
    (c) => c.beforeQuote !== null && c.afterQuote !== null
  ).length;

  return {
    versionALabel,
    versionBLabel,
    comparedAt: new Date().toISOString(),
    addedCount,
    removedCount,
    modifiedCount,
    formattingOnlyIgnoredCount,
    summaryEn:
      changes.length === 0
        ? `No substantive wording changes detected between ${versionALabel} and ${versionBLabel} (${formattingOnlyIgnoredCount} formatting-only differences ignored).`
        : `Detected ${changes.length} substantive policy changes (${modifiedCount} modified, ${addedCount} added, ${removedCount} removed). Review the exact before-and-after quotations below.`,
    summaryHi:
      changes.length === 0
        ? `${versionALabel} और ${versionBLabel} के बीच कोई महत्वपूर्ण बदलाव नहीं मिला।`
        : `दोनों दस्तावेज़ों की तुलना में ${changes.length} महत्वपूर्ण बदलाव मिले (${modifiedCount} संशोधित, ${addedCount} नए जोड़े गए, ${removedCount} हटाए गए)। नीचे सटीक तुलना देखें।`,
    changes,
  };
}

/**
 * Analyzes supplied text using the 14-category deterministic rule engine, Hidden Cost Calculator,
 * and Action Plan Generator. Never fabricates quotes.
 */
export function analyzeLegalText(options: {
  rawText: string;
  title: string;
  sourceType: 'url' | 'pdf' | 'image' | 'text';
  sourceLabel: string;
  pageCount?: number | null;
  hostname?: string;
  analysisMode?:
    | 'Gemini AI + Forensic Rules'
    | 'Hybrid AI + Deterministic Rules'
    | 'Deterministic Rule-Based Mode';
  calculationPeriodMonths?: number;
}): AnalysisReport {
  const {
    rawText,
    title,
    sourceType,
    sourceLabel,
    pageCount = null,
    hostname = '',
    analysisMode = 'Gemini AI + Forensic Rules',
    calculationPeriodMonths = 12,
  } = options;

  const injectionCheck = detectAndSanitizePromptInjection(rawText);
  const clauses = splitIntoClausesWithLocations(injectionCheck.sanitizedText);
  const findings: EvidenceFinding[] = [];
  const seenRuleQuotes = new Set<string>();

  for (const { clause, location } of clauses) {
    for (const rule of CLAUSE_DETECTION_RULES) {
      if (rule.negationPatterns.some((neg) => neg.test(clause))) {
        continue;
      }

      const matched = rule.patterns.some((rx) => rx.test(clause));
      if (!matched) continue;

      const dedupeKey = `${rule.ruleId}::${clause.toLowerCase().slice(0, 120)}`;
      if (seenRuleQuotes.has(dedupeKey)) continue;
      seenRuleQuotes.add(dedupeKey);

      findings.push({
        id: `${rule.ruleId}-${findings.length + 1}`,
        ruleId: rule.ruleId,
        category: rule.category,
        title: rule.title,
        titleHi: rule.titleHi,
        riskLevel: rule.riskLevel,
        explanation: rule.explanation,
        explanationHi: rule.explanationHi,
        quote: clause,
        location,
        whyItMatters: rule.whyItMatters,
        whyItMattersHi: rule.whyItMattersHi,
        whatRemainsUnclear: rule.whatRemainsUnclear,
        whatRemainsUnclearHi: rule.whatRemainsUnclearHi,
        whatToCheck: rule.whatToCheck,
        whatToCheckHi: rule.whatToCheckHi,
        confidence: clause.length >= 45 ? 'High' : 'Medium',
        provenance: 'Factual Clause Extraction',
        missingInfoOrLimitations: rule.missingInfoOrLimitations,
        originalSourceReference: `${sourceLabel} (${location})`,
        indiaLegalContext: rule.indiaLegalContext,
      });
    }
  }

  const severityOrder: Record<RiskLevel, number> = {
    Critical: 0,
    High: 1,
    Medium: 2,
    Low: 3,
  };
  findings.sort((a, b) => severityOrder[a.riskLevel] - severityOrder[b.riskLevel]);

  const countsByRisk = {
    Critical: findings.filter((f) => f.riskLevel === 'Critical').length,
    High: findings.filter((f) => f.riskLevel === 'High').length,
    Medium: findings.filter((f) => f.riskLevel === 'Medium').length,
    Low: findings.filter((f) => f.riskLevel === 'Low').length,
  };

  let overallRisk: AnalysisReport['overallRisk'] = 'No Matching Concerns Detected';
  if (countsByRisk.Critical > 0 || countsByRisk.High >= 2) {
    overallRisk = 'High Concern';
  } else if (countsByRisk.High === 1 || countsByRisk.Medium >= 2) {
    overallRisk = 'Moderate Concern';
  } else if (countsByRisk.Medium === 1 || countsByRisk.Low > 0) {
    overallRisk = 'Low Concern';
  }

  const overallSummary =
    findings.length === 0
      ? `OpenShield analyzed ${clauses.length} clauses in "${title}" and found 0 matching high-risk or deceptive clauses across our 14 screening categories. Note: This indicates no matching patterns were triggered, not a guarantee that the agreement is completely risk-free.`
      : `OpenShield analyzed ${clauses.length} clauses in "${title}" and identified ${
          findings.length
        } evidence-backed ${
          findings.length === 1 ? 'finding' : 'findings'
        } (${countsByRisk.Critical} Critical, ${countsByRisk.High} High, ${countsByRisk.Medium} Medium, ${countsByRisk.Low} Low). Review the exact quotations, Hidden Cost Calculator, and Action Plan below before agreeing.`;

  const overallSummaryHi =
    findings.length === 0
      ? `OpenShield ने "${title}" के ${clauses.length} वाक्यों का विश्लेषण किया और हमारे 14 जोखिम श्रेणियों में कोई भी संदिग्ध शर्त नहीं पाई। नोट: इसका अर्थ यह है कि कोई नियम ट्रिगर नहीं हुआ, यह पूर्ण कानूनी सुरक्षा की गारंटी नहीं है।`
      : `OpenShield ने "${title}" के ${clauses.length} वाक्यों की जाँच की और प्रमाण-सहित ${findings.length} जोखिम भरी शर्तें पाईं (${countsByRisk.Critical} गंभीर/Critical, ${countsByRisk.High} उच्च/High, ${countsByRisk.Medium} मध्यम/Medium)। सहमति देने से पहले नीचे मूल उद्धरण, हिडन कॉस्ट कैलकुलेटर और एक्शन प्लान अवश्य देखें।`;

  const cleanHost = hostname.toLowerCase().replace(/^www\./, '');
  const knownServiceInfo = cleanHost ? KNOWN_SERVICE_DIRECTORY[cleanHost] : undefined;

  const hiddenCostEstimate = calculateHiddenCosts(
    injectionCheck.sanitizedText,
    calculationPeriodMonths
  );
  const actionPlan = generateActionPlan(findings, knownServiceInfo, hiddenCostEstimate);

  return {
    title,
    sourceType,
    sourceLabel,
    scannedAt: new Date().toISOString(),
    analysisMode,
    pageCount,
    clausesAnalyzed: Math.max(clauses.length, 1),
    overallRisk,
    overallSummary,
    overallSummaryHi,
    limitations:
      'OpenShield provides automated consumer screening based on retrieved text, not formal legal advice. Always verify the full agreement and local consumer protection laws.',
    limitationsHi:
      'OpenShield प्राप्त पाठ के आधार पर स्वचालित उपभोक्ता जागरूकता विश्लेषण प्रदान करता है, यह औपचारिक कानूनी सलाह (Legal Advice) नहीं है।',
    countsByRisk,
    findings,
    hiddenCostEstimate,
    actionPlan,
    extractedText: rawText,
    promptInjectionDetected: injectionCheck.promptInjectionDetected,
    promptInjectionNote: injectionCheck.promptInjectionNote,
    knownServiceInfo,
  };
}

export interface DocumentValidationInput {
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  base64Data?: string;
  plainText?: string;
}

export interface DocumentExtractionResult {
  valid: boolean;
  error?: string;
  extractedText?: string;
  pageCount?: number | null;
  requiresVisionOcr?: boolean;
}

const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5 MB

/**
 * Validates uploaded PDF, Image, or Pasted Text inputs and extracts embedded text from PDFs.
 */
export function validateAndExtractDocument(
  input: DocumentValidationInput
): DocumentExtractionResult {
  if (typeof input.plainText === 'string') {
    const trimmed = input.plainText.trim();
    if (!trimmed) {
      return {
        valid: false,
        error:
          'The pasted text is empty. Please paste at least one sentence of terms or policy text.',
      };
    }
    if (trimmed.length > 250000) {
      return { valid: false, error: 'Pasted text exceeds the 250,000-character limit.' };
    }
    return {
      valid: true,
      extractedText: trimmed,
      pageCount: 1,
    };
  }

  if (!input.fileName) {
    return { valid: false, error: 'No file selected.' };
  }

  if (input.sizeBytes <= 0) {
    return { valid: false, error: `The uploaded file "${input.fileName}" is empty (0 bytes).` };
  }

  if (input.sizeBytes > MAX_FILE_SIZE_BYTES) {
    return {
      valid: false,
      error: `File "${input.fileName}" (${(input.sizeBytes / (1024 * 1024)).toFixed(
        2
      )} MB) exceeds the 5.00 MB maximum file size limit.`,
    };
  }

  const lowerName = input.fileName.toLowerCase();
  const mime = (input.mimeType || '').toLowerCase();

  const isPdf = lowerName.endsWith('.pdf') || mime === 'application/pdf';
  const isImage =
    lowerName.endsWith('.jpg') ||
    lowerName.endsWith('.jpeg') ||
    lowerName.endsWith('.png') ||
    lowerName.endsWith('.webp') ||
    mime === 'image/jpeg' ||
    mime === 'image/png' ||
    mime === 'image/webp';

  if (!isPdf && !isImage) {
    return {
      valid: false,
      error: `Unsupported file type "${input.fileName}". Please upload a PDF (.pdf) or an image (.jpg, .jpeg, .png, .webp).`,
    };
  }

  if (!input.base64Data) {
    return { valid: false, error: 'File content could not be read.' };
  }

  let buffer: Buffer;
  try {
    buffer = Buffer.from(input.base64Data, 'base64');
  } catch {
    return { valid: false, error: 'Corrupted base64 file encoding.' };
  }

  if (buffer.length === 0) {
    return { valid: false, error: 'Uploaded file buffer is empty.' };
  }

  if (isPdf) {
    const header = buffer.subarray(0, 8).toString('latin1');
    if (!header.startsWith('%PDF-')) {
      return {
        valid: false,
        error: `Corrupted or invalid PDF file "${input.fileName}": missing %PDF- header signature.`,
      };
    }

    const rawLatin = buffer.toString('latin1');
    const pageMatches = rawLatin.match(/\/Type\s*\/Page\b(?!s)/g);
    const pageCount = pageMatches && pageMatches.length > 0 ? pageMatches.length : 1;

    const extractedChunks: string[] = [];
    const literalRegex = /\(([^()\\]*(?:\\.[^()\\]*)*)\)\s*Tj/g;
    let match: RegExpExecArray | null;
    while ((match = literalRegex.exec(rawLatin)) !== null) {
      const cleaned = match[1]
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, ' ')
        .replace(/\\\(/g, '(')
        .replace(/\\\)/g, ')')
        .replace(/\\\\/g, '\\')
        .trim();
      if (cleaned.length >= 2) {
        extractedChunks.push(cleaned);
      }
    }

    const tjArrayRegex = /\[([^\]]+)\]\s*TJ/g;
    while ((match = tjArrayRegex.exec(rawLatin)) !== null) {
      const inner = match[1];
      const parts = inner.match(/\(([^()\\]*(?:\\.[^()\\]*)*)\)/g);
      if (parts) {
        const joined = parts
          .map((p) => p.slice(1, -1).replace(/\\\(/g, '(').replace(/\\\)/g, ')'))
          .join('');
        if (joined.trim().length >= 2) {
          extractedChunks.push(joined.trim());
        }
      }
    }

    const combinedText = extractedChunks.join(' ').replace(/\s+/g, ' ').trim();
    if (combinedText.length >= 25) {
      return {
        valid: true,
        extractedText: combinedText,
        pageCount,
        requiresVisionOcr: false,
      };
    }

    return {
      valid: true,
      extractedText: '',
      pageCount,
      requiresVisionOcr: true,
    };
  }

  const isPng =
    buffer.length >= 8 &&
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47;
  const isJpeg =
    buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff;
  const isWebp =
    buffer.length >= 12 &&
    buffer.subarray(0, 4).toString('ascii') === 'RIFF' &&
    buffer.subarray(8, 12).toString('ascii') === 'WEBP';

  if (!isPng && !isJpeg && !isWebp) {
    return {
      valid: false,
      error: `Corrupted or unreadable image file "${input.fileName}". Please upload a valid PNG, JPG, or WebP image.`,
    };
  }

  return {
    valid: true,
    extractedText: '',
    pageCount: 1,
    requiresVisionOcr: true,
  };
}
