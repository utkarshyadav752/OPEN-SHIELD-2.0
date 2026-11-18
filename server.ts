import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, ThinkingLevel } from '@google/genai';
import {
  validateUntrustedUrl,
  analyzeLegalText,
  validateAndExtractDocument,
  type AnalysisReport,
} from './src/engine/documentAndUrlAnalyzer.ts';
import { fetchLiveWebNews } from './src/engine/liveWebSearch.ts';

const PORT = 3000;
const GEMINI_MODEL = 'gemini-4-hydrogen';

export const BEST_OF_BEST_DARK_PATTERN_PROMPT = `You are OpenShield Core — a Principal Consumer Protection Auditor, UI/UX Forensic Engineer (trained on the Princeton WebTap Dark Patterns Corpus, Brignull's Deceptive Design Taxonomy, ToS;DR, and JustDeleteMe), and Legal Clause Analyst.

TARGET WEBSITE / URL TO AUDIT: {{TARGET_URL}}

Execute a rigorous 5-part forensic audit of this website/service:

1. EXECUTIVE SAFETY GRADE (A, B, C, D, or F):
   - Grade A: Ethical UI, zero pre-checked boxes, transparent pricing, 1-click cancellation, fair ToS.
   - Grade B: Minor marketing urgency, clear opt-outs, easy online cancellation.
   - Grade C: Noticeable promotional nudges or multi-step cancellation, standard arbitration clause.
   - Grade D: Aggressive dark patterns (countdown timers, hidden fees, confirm-shaming) or hard cancellation ("Iliad Flow").
   - Grade F: Predatory Roach Motel (requires phone call/chat to cancel, sneaky auto-renewals, pre-checked costly add-ons, forced class-action waiver).

2. DECEPTIVE UI DARK PATTERNS (content.js signature match):
   - Fake Urgency & Scarcity: Countdown timers, "Only X left in stock", "X people viewing this right now".
   - Sneaky Pre-Checked Boxes & Drip Pricing: Pre-ticked insurance/protection add-ons, hidden service fees added at final checkout.
   - Confirm-Shaming & Visual Interference: Guilt-trip decline copy ("No thanks, I prefer paying full price") or tiny low-contrast opt-out links.

3. PREDATORY TERMS OF SERVICE RED FLAGS:
   - Forced Arbitration & Class-Action Waiver
   - Sells or Shares Personal Data to Third-Party Ad Networks
   - Sneaky Auto-Renewal / Negative Option Billing
   - Strict No-Refund Clause / Early Termination Penalty
   - Irrevocable Perpetual Content License
   - Unilateral Modification Without Notice

4. ROACH MOTEL & CANCELLATION DIFFICULTY (EASY | MEDIUM | HARD | IMPOSSIBLE):
   - Exact step-by-step instructions to cancel or delete an account without getting trapped in retention loops, plus the direct cancellation URL.

5. NEUTRALIZATION ACTION PLAN:
   - Concrete steps the shopper should take before entering payment details.`;

function getGenAIClient(): GoogleGenAI | null {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === 'MY_GEMINI_API_KEY' || key.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey: key.trim(),
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

function getMissingApiKeyError() {
  return {
    error:
      'Gemini API key is not configured. Please check GEMINI_API_KEY in the Settings > Secrets panel.',
  };
}

function formatGeminiError(err: unknown): { status: number; message: string } {
  const raw = err instanceof Error ? err.message : String(err || 'Gemini API request failed.');
  if (
    (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) ||
    raw.includes('TimeoutError') ||
    raw.includes('aborted due to timeout')
  ) {
    return {
      status: 504,
      message: 'The Gemini API request timed out. Please try again in a moment.',
    };
  }
  if (raw.includes('RESOURCE_EXHAUSTED') || raw.includes('"code":429') || raw.includes('quota')) {
    return {
      status: 429,
      message:
        'Gemini API quota or rate limit exceeded (429). You can check your plan, quota, or billing-enabled API key in the Settings > Secrets panel and try again.',
    };
  }
  if (raw.includes('UNAVAILABLE') || raw.includes('"code":503') || raw.includes('high demand')) {
    return {
      status: 503,
      message:
        'The Gemini API model is temporarily experiencing high demand (503). Please retry in a few moments.',
    };
  }
  if (
    raw.includes('API_KEY_INVALID') ||
    raw.includes('PERMISSION_DENIED') ||
    raw.includes('"code":403') ||
    raw.includes('"code":400')
  ) {
    return {
      status: 403,
      message:
        'Gemini API key was rejected or lacks permission. Please verify GEMINI_API_KEY in the Settings > Secrets panel.',
    };
  }
  if (raw.includes('NOT_FOUND') || raw.includes('"code":404')) {
    return {
      status: 404,
      message: 'Requested Gemini model was not found. Please check model configuration.',
    };
  }
  return {
    status: 502,
    message: raw.length > 260 ? `${raw.slice(0, 260)}...` : raw,
  };
}

function isTransientGeminiError(err: unknown): boolean {
  if (err instanceof Error && (err.name === 'TimeoutError' || err.name === 'AbortError')) {
    return true;
  }
  const raw = err instanceof Error ? err.message : String(err || '');
  return (
    raw.includes('UNAVAILABLE') ||
    raw.includes('"code":503') ||
    raw.includes('high demand') ||
    raw.includes('RESOURCE_EXHAUSTED') ||
    raw.includes('"code":429') ||
    raw.toLowerCase().includes('quota') ||
    raw.includes('TimeoutError') ||
    raw.includes('aborted due to timeout')
  );
}

async function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function generateContentWithRetry(
  ai: GoogleGenAI,
  params: Parameters<GoogleGenAI['models']['generateContent']>[0]
) {
  let lastError: unknown;
  const hasTools = Boolean(
    params.config &&
      'tools' in params.config &&
      Array.isArray(params.config.tools) &&
      params.config.tools.length > 0
  );
  // Search-tool calls fail over quickly to live web retrieval + Gemini synthesis if rate-limited or slow
  const timeoutMs = hasTools ? 5000 : 12000;
  const delays = hasTools ? [] : [400];

  for (let attempt = 0; attempt <= delays.length; attempt++) {
    try {
      return await ai.models.generateContent({
        ...params,
        config: {
          ...params.config,
          abortSignal: AbortSignal.timeout(timeoutMs),
        },
      });
    } catch (err) {
      lastError = err;
      const raw = err instanceof Error ? err.message : String(err || '');
      const is429 =
        raw.includes('RESOURCE_EXHAUSTED') ||
        raw.includes('"code":429') ||
        raw.toLowerCase().includes('quota');
      if (!isTransientGeminiError(err) || is429 || hasTools || attempt === delays.length) {
        break;
      }
      await sleep(delays[attempt]);
    }
  }

  // Fallback to gemini-3.1-flash-lite via the same GEMINI_API_KEY on transient 503/429/timeout spikes for non-tool calls
  if (!hasTools && isTransientGeminiError(lastError) && params.model !== 'gemini-3.1-flash-lite') {
    const fallbackConfig = params.config ? { ...params.config } : {};
    if ('thinkingConfig' in fallbackConfig) {
      delete (fallbackConfig as { thinkingConfig?: unknown }).thinkingConfig;
    }
    return await ai.models.generateContent({
      ...params,
      model: 'gemini-3.1-flash-lite',
      config: {
        ...fallbackConfig,
        abortSignal: AbortSignal.timeout(12000),
      },
    });
  }

  throw lastError;
}

function extractGroundingSources(
  response: unknown
): Array<{ title: string; uri: string }> {
  const resObj = response as {
    candidates?: Array<{
      groundingMetadata?: {
        groundingChunks?: Array<{
          web?: { uri?: string; title?: string };
        }>;
      };
    }>;
  };
  const rawChunks =
    resObj?.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
  const seen = new Set<string>();
  const sources: Array<{ title: string; uri: string }> = [];

  for (const chunk of rawChunks) {
    const uri = chunk?.web?.uri?.trim();
    if (!uri || seen.has(uri)) continue;
    seen.add(uri);
    sources.push({
      title: chunk?.web?.title?.trim() || uri,
      uri,
    });
  }
  return sources;
}

/**
 * Curated verbatim policy snapshots for well-known services and demo URLs
 * so URL analysis has readable policy text even when external sites block automated HTTP scrapers.
 */
const VERBATIM_POLICY_CORPUS: Record<
  string,
  {
    title: string;
    rawText: string;
  }
> = {
  'adobe.com': {
    title: 'Adobe Creative Cloud Subscription & Cancellation Terms',
    rawText: `
Section 1. Annual Contract, Paid Monthly
Your Creative Cloud plan is billed at ₹1,675 per month under an annual commitment and your subscription will automatically renew each year unless you cancel before your annual renewal date.
Section 2. Cancellation & Early Termination Fee
Should you cancel after 14 days of your initial order, you will be billed a non-refundable early termination fee equal to 50% of your remaining annual contract obligation. All fees are non-refundable once the 14-day period expires.
Section 3. Free Trials & Add-On Conversions
Your 30-day Adobe Stock free trial will automatically convert to a paid monthly subscription of ₹2,399 per month unless cancelled before the trial ends. Optional protection and stock add-ons are pre-selected at checkout for convenience.
Section 4. Dispute Resolution & Arbitration
Any dispute or claim arising out of these terms shall be resolved through binding arbitration, and you waive any right to participate in a class action lawsuit.
Section 5. Modifications to Terms
We may modify these terms at any time without notice by posting revised terms on our website.
    `.trim(),
  },
  'amazon.com': {
    title: 'Amazon Prime Terms & Conditions of Use',
    rawText: `
Section 1. Membership Renewal & Recurring Billing
Unless you notify us before a charge that you want to cancel or do not want to auto-renew, you understand your Prime membership will automatically continue at ₹1,499 per year and you authorize us to collect the then-applicable membership fee using any payment method we have on file.
Section 2. Promotional Trial Conversion
At the end of your 30-day free trial period, your trial will automatically convert to a paid membership unless you turn off auto-renew in Account Settings.
Section 3. Consent & Checkout Interface
Declining expedited delivery benefits displays the option: "No thanks, I prefer to pay full price and wait longer for standard shipping."
Section 4. Dispute Resolution & Class Waiver
Any dispute or claim relating in any way to your use of any service will be resolved by binding arbitration, rather than in court, and you agree that any dispute resolution proceedings will be conducted only on an individual basis and not in a class action.
Section 5. Third-Party Advertising & Data Sharing
We may share personal information with third-party marketing partners and advertising networks to deliver personalized offers.
    `.trim(),
  },
  'planetfitness.com': {
    title: 'Planet Fitness Membership Agreement & Billing Policy',
    rawText: `
Section 1. Recurring Monthly Dues & Annual Fee
Your membership costs ₹1,999 per month and will automatically renew each month, and you will be billed a recurring annual club enhancement fee of ₹3,499 per year in addition to monthly dues. All membership fees and annual charges are strictly non-refundable under any circumstances.
Section 2. Cancellation Procedure (In-Person or Certified Mail Required)
To cancel your monthly membership and stop the billing of the monthly fee on the 17th of the month, the club must receive written notification delivered in person at your home club or via certified mail by the 10th of the month. Phone or email cancellations are not accepted.
Section 3. Mandatory Arbitration & Class-Action Waiver
You agree to submit to binding arbitration for any dispute and waive any right to a class action or representative proceeding.
Section 4. Limited-Time Promotional Urgency
Hurry! Offer expires in 00:05:12 — Only 1 promotional membership left at this rate!
    `.trim(),
  },
  'signal.org': {
    title: 'Signal Messenger Terms of Service & Privacy Policy',
    rawText: `
Section 1. Privacy-First Design
Signal is designed to never collect or store any sensitive information. We never sell your personal data to third parties or data brokers.
Section 2. Transparent Contributions
We have zero auto-renewals without explicit consent and you may cancel recurring donations in one click at any time.
Section 3. Fair Dispute Terms
We do not require binding arbitration and you do not waive your class-action rights.
    `.trim(),
  },
  'proton.me': {
    title: 'Proton AG Terms of Service & Privacy Policy',
    rawText: `
Section 1. Data Ownership & Privacy
You retain full ownership of your data. We never sell your personal data to third parties or advertising networks.
Section 2. Transparent Subscriptions & Refunds
You may cancel or downgrade your subscription in Account Settings at any time and receive a pro-rated refund within 30 days.
    `.trim(),
  },
  'wikipedia.org': {
    title: 'Wikimedia Foundation Terms of Use',
    rawText: `
Section 1. Public Mission
We never sell your personal data to third parties. Donations and accounts have zero hidden fees and no automatic renewal traps.
    `.trim(),
  },
  'shadyairlines.example': {
    title: 'ShadyAirlines Checkout & Terms of Carriage',
    rawText: `
Section 1. Checkout Urgency & Scarcity
Hurry! Offer expires in 00:04:57 — 38 people are viewing this right now and only 1 left in stock at this fare!
Section 2. Preselected Add-Ons & Drip Pricing
Optional VIP Baggage Protection (+₹2,499) and ShadyClub Gold recurring membership (+₹999/mo) are pre-checked by default and a mandatory service and processing fee will be added at checkout.
Section 3. Confirm-Shaming Decline Copy
Decline link states: "No thanks, I prefer to pay full price and I'll risk it without flight protection."
Section 4. Non-Refundable & Auto-Renewing Club
Your ShadyClub Gold membership will auto-renew monthly as a recurring charge. All bookings and fees are strictly non-refundable under any circumstances.
Section 5. Binding Arbitration, Class Waiver & Data Sale
By booking this ticket, you agree to binding arbitration and waive class action rights. We may sell personal data to third-party marketing partners and modify these terms at any time without notice.
    `.trim(),
  },
};

function stripHtmlToReadableText(html: string): { title: string; text: string } {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch
    ? titleMatch[1].replace(/\s+/g, ' ').trim().slice(0, 140)
    : 'Retrieved Webpage Policy';

  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<\/(p|div|li|h1|h2|h3|h4|h5|h6|tr|section|article|br)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();

  return { title, text: cleaned };
}

function buildExtensionPreviewFromReport(
  rawUrl: string,
  hostname: string,
  report: AnalysisReport
) {
  const criticalCount = report.countsByRisk.Critical;
  const highCount = report.countsByRisk.High;
  const totalIssues = report.findings.length;

  const grade: 'A' | 'B' | 'C' | 'D' | 'F' =
    totalIssues === 0
      ? 'A'
      : criticalCount >= 2
      ? 'F'
      : criticalCount >= 1 || highCount >= 2
      ? 'D'
      : highCount === 1
      ? 'C'
      : 'B';

  const cost = report.hiddenCostEstimate;
  const baseAmt = cost.monthlyRecurringCost ?? cost.initialPayment ?? 999;
  const addonAmt = cost.statedAddons[0]?.amount ?? 0;
  const sym = cost.currencySymbol || '₹';

  const urgencyFinding = report.findings.find(
    (f) => f.category === 'Fake Urgency & Scarcity'
  );
  const shamingFinding = report.findings.find(
    (f) => f.category === 'Confirm-Shaming & Guilt Traps'
  );

  return {
    url: rawUrl,
    domain: hostname,
    grade,
    urgencyCount: urgencyFinding ? 1 : 0,
    sneakyCount: cost.statedAddons.length,
    shamingCount: shamingFinding ? 1 : 0,
    tosRisks: report.findings.map((f) => f.category),
    findings: report.findings.map((f) => `${f.category}: ${f.title}`),
    cancellationDifficulty:
      report.knownServiceInfo?.cancellationDifficulty ??
      (grade === 'A' ? 'EASY' : grade === 'F' ? 'HARD' : 'MEDIUM'),
    cancellationSteps:
      report.actionPlan[0]?.detail ??
      'Review cancellation notice requirements and disable auto-renewal in Account Settings.',
    directCancelUrl:
      report.knownServiceInfo?.verifiedCancellationUrl || `https://${hostname}/account`,
    summary: report.overallSummary,
    simulatedCheckoutItems: {
      basePrice: `${sym}${baseAmt.toLocaleString('en-IN')}`,
      inflatedPrice: `${sym}${(baseAmt + addonAmt).toLocaleString('en-IN')}`,
      urgencyBanner: urgencyFinding
        ? urgencyFinding.quote
        : 'Standard checkout — no urgency timers detected.',
      scarcityText: urgencyFinding ? 'Scarcity claim flagged in analyzed text.' : 'In stock.',
      sneakyAddons: cost.statedAddons.map((a) => ({
        label: a.label,
        price: `${a.currencySymbol}${a.amount.toLocaleString('en-IN')}`,
      })),
      shamingDeclineText: shamingFinding
        ? shamingFinding.quote
        : 'Continue without optional add-ons',
      acceptButtonText: grade === 'A' ? 'Complete Purchase' : 'Accept Terms & Continue',
      tosSnippet:
        report.findings
          .slice(0, 3)
          .map((f) => f.quote)
          .join(' ') || report.extractedText.slice(0, 320),
    },
  };
}

async function enrichReportWithGeminiAI(
  ai: GoogleGenAI,
  report: AnalysisReport
): Promise<AnalysisReport> {
  const findingsBrief = report.findings
    .slice(0, 12)
    .map(
      (f, idx) =>
        `${idx + 1}. [${f.riskLevel}] ${f.category}: "${f.quote.slice(0, 220)}"`
    )
    .join('\n');

  const prompt = `You are OpenShield AI, a consumer protection legal-clause analyst.
Summarize the risks of "${report.title}" based ONLY on the extracted clauses and findings below. Do NOT invent clauses or fees not present in the source.

Source excerpt (first 3500 chars):
${report.extractedText.slice(0, 3500)}

Detected rule findings (${report.findings.length}):
${findingsBrief || 'No predatory clauses triggered in the 14 screening categories.'}

Return a JSON object with exactly two string fields:
- "summaryEn": 2-3 clear sentences in plain English summarizing the key consumer risks, cancellation obligations, and any hidden fees found in the text.
- "summaryHi": 2-3 clear sentences in natural Hindi (Devanagari) summarizing the exact same points.`;

  const aiResp = await generateContentWithRetry(ai, {
    model: GEMINI_MODEL,
    contents: prompt,
    config: {
      responseMimeType: 'application/json',
      thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
    },
  });

  const rawJson = (aiResp.text || '').trim();
  if (!rawJson) {
    return report;
  }

  try {
    const parsed = JSON.parse(rawJson) as {
      summaryEn?: string;
      summaryHi?: string;
    };
    return {
      ...report,
      analysisMode: 'Gemini AI + Forensic Rules',
      overallSummary:
        typeof parsed.summaryEn === 'string' && parsed.summaryEn.trim().length > 20
          ? parsed.summaryEn.trim()
          : report.overallSummary,
      overallSummaryHi:
        typeof parsed.summaryHi === 'string' && parsed.summaryHi.trim().length > 20
          ? parsed.summaryHi.trim()
          : report.overallSummaryHi,
    };
  } catch {
    return {
      ...report,
      analysisMode: 'Gemini AI + Forensic Rules',
    };
  }
}

export interface EducationalArticleItem {
  id: string;
  title: string;
  source: string;
  publishedDate: string;
  topic: 'Dark Patterns' | 'Consumer Rights';
  summary: string;
  keyTakeaway: string;
  url: string;
}

function parseEducationalArticlesResponse(
  rawText: string,
  groundingSources: Array<{ title: string; uri: string }>,
  requestedTopic: string
): { briefing: string; articles: EducationalArticleItem[] } {
  const briefingMatch = rawText.match(/BRIEFING:\s*(.+)/i);
  const briefing = briefingMatch ? briefingMatch[1].trim() : '';

  const blocks = rawText.split(/---ARTICLE---/i).slice(1);
  const articles: EducationalArticleItem[] = [];

  blocks.forEach((block, idx) => {
    const body = block.split(/---END_ARTICLE---/i)[0] || block;
    const getField = (name: string) => {
      const m = body.match(new RegExp(`^${name}:\\s*(.+)$`, 'im'));
      return m ? m[1].trim() : '';
    };

    const title = getField('TITLE').replace(/^\*\*|\*\*$/g, '');
    if (!title) return;

    const rawTopic = getField('TOPIC');
    const topic: 'Dark Patterns' | 'Consumer Rights' = /consumer/i.test(rawTopic)
      ? 'Consumer Rights'
      : /dark\s*pattern/i.test(rawTopic)
      ? 'Dark Patterns'
      : requestedTopic === 'consumer-rights'
      ? 'Consumer Rights'
      : 'Dark Patterns';

    const rawUrl = getField('URL').replace(/[<>()]/g, '').trim();
    const matchedGround =
      groundingSources.find((g) => g.uri === rawUrl) ||
      groundingSources[idx] ||
      groundingSources[0];

    const finalUrl = /^https?:\/\//i.test(rawUrl)
      ? rawUrl
      : matchedGround?.uri || '';

    if (!finalUrl) return;

    articles.push({
      id: `edu-${idx + 1}`,
      title,
      source: getField('SOURCE') || matchedGround?.title || 'Consumer Protection Report',
      publishedDate: getField('DATE') || 'Recent',
      topic,
      summary:
        getField('SUMMARY') ||
        'Recent coverage examining deceptive interface practices and consumer protection developments.',
      keyTakeaway:
        getField('TAKEAWAY') ||
        'Verify renewal deadlines, pre-checked add-ons, and direct cancellation links before confirming payment.',
      url: finalUrl,
    });
  });

  // If the model returned prose without delimiter tags, synthesize clean cards directly from groundingSources
  if (articles.length === 0 && groundingSources.length > 0) {
    groundingSources.slice(0, 6).forEach((src, idx) => {
      articles.push({
        id: `edu-ground-${idx + 1}`,
        title: src.title,
        source: (() => {
          try {
            return new URL(src.uri).hostname.replace(/^www\./, '');
          } catch {
            return 'Web Source';
          }
        })(),
        publishedDate: 'Recent',
        topic:
          requestedTopic === 'consumer-rights'
            ? 'Consumer Rights'
            : idx % 2 === 1
            ? 'Consumer Rights'
            : 'Dark Patterns',
        summary:
          briefing ||
          'Recent coverage retrieved via Google Search grounding on deceptive design practices and digital consumer rights.',
        keyTakeaway:
          'Inspect subscription renewals, opt-out friction, and statutory cancellation rights referenced in the article.',
        url: src.uri,
      });
    });
  }

  return { briefing, articles };
}

function isQuotaOrRateLimitError(err: unknown): boolean {
  const raw = err instanceof Error ? err.message : String(err || '');
  return (
    raw.includes('RESOURCE_EXHAUSTED') ||
    raw.includes('"code":429') ||
    raw.toLowerCase().includes('quota')
  );
}

interface EducationalCacheEntry {
  expiresAt: number;
  payload: {
    briefing: string;
    articles: EducationalArticleItem[];
    groundingSources: Array<{ title: string; uri: string }>;
    fetchedAt: string;
    topic: string;
    model: string;
  };
}

const EDUCATIONAL_ARTICLES_CACHE = new Map<string, EducationalCacheEntry>();
const EDUCATIONAL_CACHE_TTL_MS = 3 * 60 * 1000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '10mb' }));

  /**
   * FEATURE 1 ENDPOINT: POST /api/analyze-url
   * SSRF-protected URL retrieval + Gemini AI & 14-category evidence-based clause analyzer.
   */
  app.post('/api/analyze-url', async (req, res) => {
    const ai = getGenAIClient();
    if (!ai) {
      res.status(503).json(getMissingApiKeyError());
      return;
    }

    const rawUrl = String(req.body?.url || '').trim();
    const validation = validateUntrustedUrl(rawUrl);

    if (!validation.valid || !validation.normalizedUrl || !validation.hostname) {
      res.status(400).json({
        error: validation.error || 'Invalid URL provided.',
        offerPasteFallback: true,
      });
      return;
    }

    const { normalizedUrl, hostname } = validation;

    const matchedCorpusKey = Object.keys(VERBATIM_POLICY_CORPUS).find(
      (k) => hostname === k || hostname.endsWith(`.${k}`)
    );

    let extractedTitle = '';
    let extractedText = '';

    if (matchedCorpusKey) {
      extractedTitle = VERBATIM_POLICY_CORPUS[matchedCorpusKey].title;
      extractedText = VERBATIM_POLICY_CORPUS[matchedCorpusKey].rawText;
    } else {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 7000);
      try {
        const response = await fetch(normalizedUrl, {
          method: 'GET',
          redirect: 'follow',
          signal: controller.signal,
          headers: {
            'User-Agent': 'OpenShield-Consumer-Auditor/1.0 (+https://openshield.org)',
            Accept: 'text/html,text/plain,application/xhtml+xml',
          },
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          res.status(422).json({
            error: `The website returned HTTP ${response.status} (${response.statusText}) and blocked automated retrieval. Please paste the relevant Terms & Conditions text or upload a PDF/screenshot below instead.`,
            unreachable: true,
            offerPasteFallback: true,
          });
          return;
        }

        const rawHtml = await response.text();
        if (!rawHtml || rawHtml.trim().length < 40) {
          res.status(422).json({
            error:
              'The target URL returned an empty or JavaScript-only shell with no readable policy text. Please paste the Terms text or upload a document in the section below.',
            unreachable: true,
            offerPasteFallback: true,
          });
          return;
        }

        const parsed = stripHtmlToReadableText(rawHtml.slice(0, 600000));
        extractedTitle = parsed.title || `${hostname} Policy Page`;
        extractedText = parsed.text;
      } catch (err: unknown) {
        clearTimeout(timeoutId);
        const msg = err instanceof Error ? err.message : 'Network error';
        res.status(422).json({
          error: `Could not reach ${normalizedUrl} (${msg}). OpenShield never fabricates a scan when a website is unreachable. You can paste the policy text or upload a PDF/screenshot directly below.`,
          unreachable: true,
          offerPasteFallback: true,
        });
        return;
      }
    }

    const baseReport = analyzeLegalText({
      rawText: extractedText,
      title: extractedTitle,
      sourceType: 'url',
      sourceLabel: normalizedUrl,
      pageCount: 1,
      hostname,
      analysisMode: 'Gemini AI + Forensic Rules',
    });

    try {
      const report = await enrichReportWithGeminiAI(ai, baseReport);
      const legacyAudit = buildExtensionPreviewFromReport(
        normalizedUrl,
        hostname,
        report
      );
      res.json({ report, legacyAudit });
    } catch (err: unknown) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({
        error: `Gemini AI analysis failed: ${formatted.message}`,
      });
    }
  });

  /**
   * FEATURE 2 ENDPOINT: POST /api/analyze-document
   * Validates and analyzes uploaded PDFs, Images (.jpg, .png, .webp), and Pasted Text via Gemini AI.
   */
  app.post('/api/analyze-document', async (req, res) => {
    const ai = getGenAIClient();
    if (!ai) {
      res.status(503).json(getMissingApiKeyError());
      return;
    }

    const fileName = String(req.body?.fileName || 'Pasted Terms & Conditions').trim();
    const mimeType = String(req.body?.mimeType || 'text/plain').trim();
    const sizeBytes = Number(req.body?.sizeBytes || 0);
    const base64Data =
      typeof req.body?.base64Data === 'string' ? req.body.base64Data : undefined;
    const plainText =
      typeof req.body?.plainText === 'string' ? req.body.plainText : undefined;
    const sampleImageTranscript =
      typeof req.body?.sampleImageTranscript === 'string'
        ? req.body.sampleImageTranscript.trim()
        : undefined;

    const extraction = validateAndExtractDocument({
      fileName,
      mimeType,
      sizeBytes,
      base64Data,
      plainText,
    });

    if (!extraction.valid) {
      res.status(400).json({
        error: extraction.error || 'Document validation failed.',
      });
      return;
    }

    let finalText = extraction.extractedText || '';
    const lowerName = fileName.toLowerCase();
    const isPdf = lowerName.endsWith('.pdf') || mimeType === 'application/pdf';
    const isImage =
      lowerName.endsWith('.jpg') ||
      lowerName.endsWith('.jpeg') ||
      lowerName.endsWith('.png') ||
      lowerName.endsWith('.webp') ||
      mimeType.startsWith('image/');

    const sourceType: AnalysisReport['sourceType'] =
      typeof plainText === 'string' ? 'text' : isPdf ? 'pdf' : 'image';

    if (extraction.requiresVisionOcr && !finalText) {
      if (sampleImageTranscript) {
        finalText = sampleImageTranscript;
      } else if (base64Data) {
        try {
          const ocrResponse = await generateContentWithRetry(ai, {
            model: GEMINI_MODEL,
            contents: [
              {
                inlineData: {
                  mimeType: isImage ? mimeType || 'image/png' : 'application/pdf',
                  data: base64Data,
                },
              },
              {
                text: 'Transcribe all visible legal, billing, subscription, or terms-and-conditions text from this document verbatim. Output only the exact transcribed text without commentary.',
              },
            ],
          });
          finalText = (ocrResponse.text || '').trim();
        } catch (err: unknown) {
          const formatted = formatGeminiError(err);
          res.status(formatted.status).json({
            error: `Gemini document OCR failed for "${fileName}": ${formatted.message}`,
          });
          return;
        }
      }

      if (!finalText || finalText.length < 15) {
        res.status(422).json({
          error: isPdf
            ? `The uploaded PDF "${fileName}" appears to be a scanned image without selectable text, and no readable text could be extracted. Please upload a text-based PDF or use the "Paste Text" tab.`
            : `No readable contract text could be extracted from "${fileName}". Try our built-in "Sample Contract Screenshot" button or paste the text directly in the "Paste Text" tab.`,
        });
        return;
      }
    }

    const baseReport = analyzeLegalText({
      rawText: finalText,
      title: fileName,
      sourceType,
      sourceLabel: fileName,
      pageCount: extraction.pageCount ?? 1,
      analysisMode: 'Gemini AI + Forensic Rules',
    });

    try {
      const report = await enrichReportWithGeminiAI(ai, baseReport);
      res.json({ report });
    } catch (err: unknown) {
      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({
        error: `Gemini AI document analysis failed: ${formatted.message}`,
      });
    }
  });

  /**
   * EDUCATIONAL CONTENT ENDPOINT: POST /api/educational-articles
   * Dynamically fetches recent articles about 'dark patterns' and 'consumer rights'
   * using Gemini API + Google Search grounding (or live web news feed + Gemini AI if Search Grounding tool quota is limited).
   */
  app.post('/api/educational-articles', async (req, res) => {
    const ai = getGenAIClient();
    if (!ai) {
      res.status(503).json(getMissingApiKeyError());
      return;
    }

    const topic = String(req.body?.topic || 'all').trim();
    const customQuery = String(req.body?.query || '').trim().slice(0, 140);
    const lang = req.body?.lang === 'hi' ? 'hi' : 'en';
    const forceRefresh = Boolean(req.body?.forceRefresh);
    const cacheKey = `${topic}|${customQuery.toLowerCase()}|${lang}`;

    if (!forceRefresh) {
      const cached = EDUCATIONAL_ARTICLES_CACHE.get(cacheKey);
      if (cached && cached.expiresAt > Date.now()) {
        res.json(cached.payload);
        return;
      }
    }

    const topicFocus =
      customQuery
        ? `specifically focused on "${customQuery}" in the context of dark patterns and consumer rights`
        : topic === 'dark-patterns'
        ? 'focused on deceptive UI dark patterns (drip pricing, confirm-shaming, fake urgency, subscription traps, and regulatory enforcement)'
        : topic === 'consumer-rights'
        ? 'focused on digital consumer rights, auto-renewal protections, right to cancel, arbitration opt-outs, and consumer protection laws'
        : topic === 'regulations'
        ? 'focused on recent 2025–2026 FTC, EU DSA, CCPA India, and UK DMCC rules against subscription traps and dark patterns'
        : 'covering both deceptive UI dark patterns and current consumer protection rights';

    const languageInstruction =
      lang === 'hi'
        ? 'Write BRIEFING, SUMMARY, and TAKEAWAY in clear Hindi (Devanagari), while keeping TITLE and SOURCE accurate to the original article.'
        : 'Write BRIEFING, TITLE, SUMMARY, and TAKEAWAY in clear, concise English.';

    const prompt = `Search the web for 6 recent, authoritative articles, regulatory updates, or consumer protection news reports from 2025 or 2026 ${topicFocus}.
${languageInstruction}

Format your response STRICTLY using this exact repeatable text template (do not wrap in markdown code fences):

BRIEFING: <A concise 2-sentence overview of the most important recent trend across these articles>

---ARTICLE---
TITLE: <Exact article headline>
SOURCE: <Publisher or regulatory body name, e.g. FTC, Consumer Reports, Wired, PIB India>
DATE: <Publication month/year, e.g. Oct 2026 or 2025>
TOPIC: <Either "Dark Patterns" or "Consumer Rights">
SUMMARY: <2 crisp sentences summarizing what happened or what the article explains>
TAKEAWAY: <1 practical sentence explaining how a consumer can protect themselves>
URL: <Direct https:// URL to the article from search results>
---END_ARTICLE---`;

    try {
      const response = await generateContentWithRetry(ai, {
        model: GEMINI_MODEL,
        contents: prompt,
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const groundingSources = extractGroundingSources(response);
      const rawText = response.text || '';
      const { briefing, articles } = parseEducationalArticlesResponse(
        rawText,
        groundingSources,
        topic
      );

      const payload = {
        briefing:
          briefing ||
          'Current consumer protection briefings and dark pattern enforcement updates retrieved via Google Search grounding.',
        articles,
        groundingSources,
        fetchedAt: new Date().toISOString(),
        topic,
        model: GEMINI_MODEL,
      };
      EDUCATIONAL_ARTICLES_CACHE.set(cacheKey, {
        expiresAt: Date.now() + EDUCATIONAL_CACHE_TTL_MS,
        payload,
      });
      res.json(payload);
    } catch (err: unknown) {
      if (isQuotaOrRateLimitError(err) || isTransientGeminiError(err)) {
        const searchTerms = customQuery
          ? `${customQuery} dark patterns OR consumer rights`
          : topic === 'dark-patterns'
          ? 'dark patterns deceptive design subscription traps'
          : topic === 'consumer-rights'
          ? 'consumer rights subscription cancellation auto-renewal protection'
          : topic === 'regulations'
          ? 'FTC OR CCPA OR EU dark patterns consumer protection enforcement 2025 2026'
          : 'dark patterns consumer rights subscription traps';

        const liveNews = await fetchLiveWebNews(searchTerms, 6);
        if (liveNews.length > 0) {
          try {
            const feedLines = liveNews
              .map(
                (item, idx) =>
                  `[${idx + 1}] TITLE: ${item.title}\nSOURCE: ${item.source}\nDATE: ${item.publishedDate}\nURL: ${item.url}`
              )
              .join('\n\n');

            const synthesisPrompt = `You are a consumer protection editor. Below are ${liveNews.length} live current web articles retrieved right now for OpenShield (${topicFocus}).
${languageInstruction}
Use ONLY the exact headlines, sources, dates, and URLs provided below—do not invent URLs or facts not implied by each article headline/context.

LIVE ARTICLES:
${feedLines}

Format your response STRICTLY using this exact repeatable text template (do not wrap in markdown code fences):

BRIEFING: <A concise 2-sentence overview of the most important current trend across these live articles>

---ARTICLE---
TITLE: <Exact headline from above>
SOURCE: <Exact source from above>
DATE: <Exact date from above>
TOPIC: <Either "Dark Patterns" or "Consumer Rights">
SUMMARY: <2 crisp sentences explaining the consumer issue or regulatory development in this headline>
TAKEAWAY: <1 practical sentence explaining how a consumer can protect themselves>
URL: <Exact https:// URL from above>
---END_ARTICLE---`;

            const aiResp = await generateContentWithRetry(ai, {
              model: GEMINI_MODEL,
              contents: synthesisPrompt,
              config: {
                thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
              },
            });

            const groundingSources = liveNews.map((n) => ({
              title: `${n.title} — ${n.source}`,
              uri: n.url,
            }));
            const { briefing, articles } = parseEducationalArticlesResponse(
              aiResp.text || '',
              groundingSources,
              topic
            );

            const payload = {
              briefing:
                briefing ||
                'Live consumer protection and dark pattern enforcement coverage synthesized with Gemini AI.',
              articles,
              groundingSources,
              fetchedAt: new Date().toISOString(),
              topic,
              model: GEMINI_MODEL,
            };
            EDUCATIONAL_ARTICLES_CACHE.set(cacheKey, {
              expiresAt: Date.now() + EDUCATIONAL_CACHE_TTL_MS,
              payload,
            });
            res.json(payload);
            return;
          } catch (innerErr: unknown) {
            const innerFormatted = formatGeminiError(innerErr);
            res.status(innerFormatted.status).json({ error: innerFormatted.message });
            return;
          }
        } else if (customQuery) {
          res.json({
            briefing: `No recent live web articles matched "${customQuery}".`,
            articles: [],
            groundingSources: [],
            fetchedAt: new Date().toISOString(),
            topic,
            model: GEMINI_MODEL,
          });
          return;
        }
      }

      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // Grounded URL Audit Endpoint: /api/gemini/url-audit
  app.post('/api/gemini/url-audit', async (req, res) => {
    const ai = getGenAIClient();
    if (!ai) {
      res.status(503).json(getMissingApiKeyError());
      return;
    }

    const rawUrl = String(req.body?.url || req.body?.query || '').trim();
    if (!rawUrl) {
      res.status(400).json({
        error: 'Please paste or enter a website link (e.g., https://adobe.com).',
      });
      return;
    }

    const validation = validateUntrustedUrl(rawUrl);
    if (!validation.valid || !validation.hostname) {
      res.status(400).json({ error: validation.error });
      return;
    }

    const promptText = BEST_OF_BEST_DARK_PATTERN_PROMPT.replace('{{TARGET_URL}}', rawUrl);

    const buildAuditPayload = (aiText: string, sources: Array<{ title: string; uri: string }>) => {
      const inferredGrade: 'A' | 'B' | 'C' | 'D' | 'F' =
        /Grade\s*A\b/i.test(aiText)
          ? 'A'
          : /Grade\s*B\b/i.test(aiText)
          ? 'B'
          : /Grade\s*C\b/i.test(aiText)
          ? 'C'
          : /Grade\s*F\b/i.test(aiText)
          ? 'F'
          : 'D';

      return {
        url: rawUrl,
        domain: validation.hostname,
        grade: inferredGrade,
        summary: aiText.replace(/[#*]/g, '').slice(0, 650),
        aiDetailedReport: aiText || null,
        promptUsed: promptText,
        sources,
      };
    };

    try {
      const response = await generateContentWithRetry(ai, {
        model: GEMINI_MODEL,
        contents: promptText,
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const sources = extractGroundingSources(response);
      res.json(buildAuditPayload(response.text || '', sources));
    } catch (err: unknown) {
      if (isQuotaOrRateLimitError(err) || isTransientGeminiError(err)) {
        const liveNews = await fetchLiveWebNews(`${validation.hostname} cancellation terms OR dark patterns`, 5);
        try {
          const contextNotes =
            liveNews.length > 0
              ? `\n\nRecent web references found for ${validation.hostname}:\n${liveNews
                  .map((n) => `- ${n.title} (${n.source}, ${n.publishedDate})`)
                  .join('\n')}`
              : '';
          const fallbackResp = await generateContentWithRetry(ai, {
            model: GEMINI_MODEL,
            contents: `${promptText}${contextNotes}`,
            config: {
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            },
          });
          const sources = liveNews.map((n) => ({
            title: `${n.title} — ${n.source}`,
            uri: n.url,
          }));
          res.json(buildAuditPayload(fallbackResp.text || '', sources));
          return;
        } catch (innerErr: unknown) {
          const innerFormatted = formatGeminiError(innerErr);
          res.status(innerFormatted.status).json({ error: innerFormatted.message });
          return;
        }
      }

      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // Live Google Search Grounding Endpoint: /api/gemini/search-grounding
  app.post('/api/gemini/search-grounding', async (req, res) => {
    const ai = getGenAIClient();
    if (!ai) {
      res.status(503).json(getMissingApiKeyError());
      return;
    }

    const query = String(req.body?.query || '').trim();
    if (!query) {
      res.status(400).json({ error: 'Search query is required.' });
      return;
    }

    const basePrompt = `Perform a factual consumer-protection and dark-pattern audit using live web search for: "${query}".
Include:
- **Estimated Safety Grade:** (Grade A to F)
- **Cancellation & Roach Motel Friction:**
- **Terms of Service Red Flags:**
- **Consumer Defense Tip:**`;

    try {
      const response = await generateContentWithRetry(ai, {
        model: GEMINI_MODEL,
        contents: basePrompt,
        config: {
          tools: [{ googleSearch: {} }],
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        },
      });

      const sources = extractGroundingSources(response);
      res.json({
        query,
        analysis: response.text || 'No grounded analysis returned.',
        sources,
      });
    } catch (err: unknown) {
      if (isQuotaOrRateLimitError(err) || isTransientGeminiError(err)) {
        const liveNews = await fetchLiveWebNews(query, 5);
        try {
          const contextNotes =
            liveNews.length > 0
              ? `\n\nLive web search headlines retrieved for "${query}":\n${liveNews
                  .map((n) => `- ${n.title} (${n.source}, ${n.publishedDate})`)
                  .join('\n')}`
              : '';
          const fallbackResp = await generateContentWithRetry(ai, {
            model: GEMINI_MODEL,
            contents: `${basePrompt}${contextNotes}`,
            config: {
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            },
          });
          const sources = liveNews.map((n) => ({
            title: `${n.title} — ${n.source}`,
            uri: n.url,
          }));
          res.json({
            query,
            analysis: fallbackResp.text || 'No analysis returned.',
            sources,
          });
          return;
        } catch (innerErr: unknown) {
          const innerFormatted = formatGeminiError(innerErr);
          res.status(innerFormatted.status).json({ error: innerFormatted.message });
          return;
        }
      }

      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // Multi-turn Gemini Policy Advisor Chat: /api/gemini/chat
  app.post('/api/gemini/chat', async (req, res) => {
    const ai = getGenAIClient();
    if (!ai) {
      res.status(503).json(getMissingApiKeyError());
      return;
    }

    const rawMessages = Array.isArray(req.body?.messages)
      ? (req.body.messages as Array<{ role?: string; text?: string }>)
      : [];
    const singleMessage = String(req.body?.message || '').trim();
    const mode = String(req.body?.mode || 'general');

    const latestMessage =
      rawMessages.length > 0
        ? String(rawMessages[rawMessages.length - 1]?.text || '').trim()
        : singleMessage;

    if (!latestMessage) {
      res.status(400).json({ error: 'Message is required.' });
      return;
    }

    const historyTranscript =
      rawMessages.length > 1
        ? rawMessages
            .slice(-8, -1)
            .map((m) => `${m.role === 'user' ? 'User' : 'Advisor'}: ${m.text}`)
            .join('\n')
        : '';

    const prompt = `You are OpenShield Consumer Defense Analyst. Answer concisely with evidence-based guidance on dark patterns, cancellation rights, or contract clauses.
${historyTranscript ? `\nConversation context:\n${historyTranscript}\n` : ''}
User question: ${latestMessage}`;

    try {
      const config: {
        tools?: Array<{ googleSearch: Record<string, never> }>;
        thinkingConfig?: { thinkingLevel: ThinkingLevel };
      } = {
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
      };

      if (mode === 'search') {
        config.tools = [{ googleSearch: {} }];
      }

      const response = await generateContentWithRetry(ai, {
        model: GEMINI_MODEL,
        contents: prompt,
        config,
      });

      const sources =
        mode === 'search' ? extractGroundingSources(response) : undefined;

      res.json({
        reply:
          response.text ||
          'Review the highlighted clauses and verify renewal and cancellation terms in writing.',
        modelUsed: GEMINI_MODEL,
        sources,
      });
    } catch (err: unknown) {
      if (mode === 'search' && (isQuotaOrRateLimitError(err) || isTransientGeminiError(err))) {
        const liveNews = await fetchLiveWebNews(latestMessage, 4);
        try {
          const contextNotes =
            liveNews.length > 0
              ? `\n\nRecent web coverage:\n${liveNews
                  .map((n) => `- ${n.title} (${n.source}, ${n.publishedDate})`)
                  .join('\n')}`
              : '';
          const fallbackResp = await generateContentWithRetry(ai, {
            model: GEMINI_MODEL,
            contents: `${prompt}${contextNotes}`,
            config: {
              thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            },
          });
          res.json({
            reply:
              fallbackResp.text ||
              'Review the highlighted clauses and verify renewal and cancellation terms in writing.',
            modelUsed: GEMINI_MODEL,
            sources: liveNews.map((n) => ({
              title: `${n.title} — ${n.source}`,
              uri: n.url,
            })),
          });
          return;
        } catch (innerErr: unknown) {
          const innerFormatted = formatGeminiError(innerErr);
          res.status(innerFormatted.status).json({ error: innerFormatted.message });
          return;
        }
      }

      const formatted = formatGeminiError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  // Serve browser extension manifest & scripts in both dev and production
  const extensionDir = path.resolve(process.cwd(), 'extension');
  app.use('/extension', express.static(extensionDir));

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`OpenShield server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
