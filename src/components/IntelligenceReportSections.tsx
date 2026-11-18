import React, { useState } from 'react';
import {
  Calculator,
  CheckSquare,
  Square,
  ExternalLink,
  Copy,
  Check,
  BookOpen,
  Scale,
  Code2,
  ChevronDown,
  ChevronUp,
  ThumbsDown,
  ThumbsUp,
  Info,
} from 'lucide-react';
import {
  calculateHiddenCosts,
  CLAUSE_DETECTION_RULES,
  type AnalysisReport,
  type EvidenceFinding,
  type RiskLevel,
  type SupportedLanguage,
} from '../engine/documentAndUrlAnalyzer';

interface HiddenCostCalculatorCardProps {
  rawText: string;
  initialEstimate: AnalysisReport['hiddenCostEstimate'];
  lang: SupportedLanguage;
  onJumpToQuote?: (quote: string) => void;
}

export const HiddenCostCalculatorCard: React.FC<HiddenCostCalculatorCardProps> = ({
  rawText,
  initialEstimate,
  lang,
  onJumpToQuote,
}) => {
  const [periodMonths, setPeriodMonths] = useState<number>(initialEstimate.periodMonths || 12);
  const estimate = React.useMemo(
    () => calculateHiddenCosts(rawText, periodMonths),
    [rawText, periodMonths]
  );

  const fmtAmount = (val: number | null) => {
    if (val === null) return 'Not stated';
    return `${estimate.currencySymbol}${val.toLocaleString('en-IN')}`;
  };

  return (
    <div
      data-testid="hidden-cost-calculator-card"
      className="rounded-xl bg-slate-50 border border-slate-200 p-5 space-y-4"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0F172A] text-emerald-400 flex items-center justify-center shrink-0">
            <Calculator className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#0b57d0] uppercase tracking-wider">
              {lang === 'hi'
                ? 'हिडन कॉस्ट कैलकुलेटर (वित्तीय प्रभाव अनुमान)'
                : 'Hidden Cost Calculator — Financial Impact Estimate'}
            </div>
            <h3 className="text-base font-extrabold text-slate-900">
              {lang === 'hi'
                ? '“यदि मैं यह समझौता स्वीकार करता हूँ तो मुझे कुल कितना खर्च उठाना पड़ सकता है?”'
                : '“How much could this agreement cost me if I accept it?”'}
            </h3>
          </div>
        </div>

        {/* Period Selector */}
        {estimate.calculable && (
          <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 self-start sm:self-center">
            {[3, 6, 12, 24].map((m) => (
              <button
                key={m}
                type="button"
                data-testid={`cost-period-${m}m`}
                onClick={() => setPeriodMonths(m)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold cursor-pointer transition-colors ${
                  periodMonths === m
                    ? 'bg-[#0b57d0] text-white'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                {m} {lang === 'hi' ? 'माह' : 'mos'}
              </button>
            ))}
          </div>
        )}
      </div>

      {!estimate.calculable ? (
        <div className="p-4 rounded-xl bg-white border border-slate-200 text-xs text-slate-700 flex items-start gap-2.5">
          <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-slate-900">
              {lang === 'hi'
                ? 'दस्तावेज़ में स्पष्ट मौद्रिक कीमतें उल्लेखित नहीं हैं'
                : 'No Explicit Monetary Figures Stated in Analyzed Text'}
            </div>
            <p className="mt-0.5">
              {lang === 'hi' ? estimate.nonCalculableReasonHi : estimate.nonCalculableReason}
            </p>
          </div>
        </div>
      ) : (
        <>
          {/* 4-Column Financial Impact Metrics */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500">
                {lang === 'hi' ? 'शुरुआती भुगतान / ट्रायल' : 'Initial Payment / Trial'}
              </div>
              <div className="text-lg font-extrabold text-slate-900 tabular-nums mt-0.5">
                {estimate.freeTrialDays
                  ? `${estimate.freeTrialDays}-Day Free Trial`
                  : fmtAmount(estimate.initialPayment)}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {estimate.freeTrialDays
                  ? lang === 'hi'
                    ? 'ट्रायल के बाद स्वतः बिलिंग'
                    : 'Auto-converts to paid after trial'
                  : lang === 'hi'
                  ? 'प्रारंभिक देय राशि'
                  : 'Stated initial charge'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500">
                {lang === 'hi' ? 'मासिक आवर्ती शुल्क' : 'Monthly Recurring Cost'}
              </div>
              <div className="text-lg font-extrabold text-slate-900 tabular-nums mt-0.5">
                {estimate.monthlyRecurringCost !== null
                  ? `${fmtAmount(estimate.monthlyRecurringCost)}/mo`
                  : 'N/A'}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {estimate.annualRecurringCost !== null
                  ? `${fmtAmount(estimate.annualRecurringCost)} / yr base`
                  : lang === 'hi'
                  ? 'आवर्ती मासिक शुल्क'
                  : 'Stated base recurring rate'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200">
              <div className="text-[11px] font-semibold text-slate-500">
                {lang === 'hi'
                  ? `${periodMonths} महीनों की अनुमानित मूल लागत`
                  : `Est. Base Cost (${periodMonths} Months)`}
              </div>
              <div
                data-testid="cost-estimate-base-total"
                className="text-lg font-extrabold text-[#0b57d0] tabular-nums mt-0.5"
              >
                {fmtAmount(estimate.estimatedTotalForPeriod)}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {lang === 'hi' ? 'बिना वैकल्पिक ऐड-ऑन के' : 'Excluding optional add-ons'}
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-red-200">
              <div className="text-[11px] font-semibold text-red-700">
                {estimate.statedAddons.length > 0
                  ? lang === 'hi'
                    ? `ऐड-ऑन सहित कुल (${periodMonths} माह)`
                    : `Total With Preselected Add-Ons (${periodMonths}m)`
                  : lang === 'hi'
                  ? 'समय-पूर्व रद्दीकरण जुर्माना'
                  : 'Stated Early Cancel Penalty'}
              </div>
              <div
                data-testid="cost-estimate-inflated-total"
                className="text-lg font-extrabold text-red-700 tabular-nums mt-0.5"
              >
                {estimate.statedAddons.length > 0
                  ? fmtAmount(estimate.estimatedTotalWithAddonsForPeriod)
                  : estimate.earlyTerminationPenaltyPercent !== null
                  ? `${estimate.earlyTerminationPenaltyPercent}% of remaining term`
                  : fmtAmount(estimate.estimatedTotalForPeriod)}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                {estimate.earlyTerminationPenaltyPercent !== null
                  ? `Early cancel penalty: ${estimate.earlyTerminationPenaltyPercent}% stated`
                  : lang === 'hi'
                  ? 'सभी प्री-सेलेक्टेड शुल्क जोड़कर'
                  : 'Includes stated add-on charges'}
              </div>
            </div>
          </div>

          {/* Supporting Evidence Clauses & Calculation Assumptions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 text-xs">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
              <div className="font-bold text-slate-900">
                {lang === 'hi'
                  ? 'गणना की मान्यताएँ और सीमाएँ (Assumptions):'
                  : 'Calculation Assumptions & Conditions:'}
              </div>
              <ul className="list-disc list-inside space-y-1 text-slate-700">
                {(lang === 'hi' ? estimate.assumptionsHi : estimate.assumptions).map((a, idx) => (
                  <li key={idx}>{a}</li>
                ))}
              </ul>
              {estimate.refundLimitationSummary && (
                <div className="pt-1.5 border-t border-slate-100 text-slate-600">
                  <strong className="text-slate-900">Refund Rule: </strong>
                  &ldquo;{estimate.refundLimitationSummary}&rdquo;
                </div>
              )}
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 space-y-2">
              <div className="font-bold text-slate-900">
                {lang === 'hi'
                  ? 'मूल्य के पीछे मूल अनुबंध प्रमाण (Supporting Clauses):'
                  : 'Clauses Supporting Each Figure:'}
              </div>
              <div className="space-y-1.5 max-h-32 overflow-y-auto">
                {[
                  ...estimate.statedBaseItems,
                  ...estimate.statedAddons,
                  ...estimate.statedAdditionalFees,
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-start justify-between gap-2"
                  >
                    <div>
                      <span className="font-bold text-slate-900">
                        {item.label} ({item.currencySymbol}
                        {item.amount.toLocaleString('en-IN')}/{item.frequency}):
                      </span>{' '}
                      <span className="text-slate-600 font-mono text-[11px]">
                        &ldquo;{item.quote.slice(0, 95)}...&rdquo;
                      </span>
                    </div>
                    {onJumpToQuote && (
                      <button
                        type="button"
                        onClick={() => onJumpToQuote(item.quote)}
                        className="text-[11px] font-bold text-[#0b57d0] hover:underline shrink-0 cursor-pointer"
                      >
                        Source
                      </button>
                    )}
                  </div>
                ))}
                {estimate.penaltyQuote && (
                  <div className="p-2 rounded-lg bg-red-50/60 border border-red-200 text-[11px] text-red-950">
                    <strong>Penalty Clause: </strong>
                    &ldquo;{estimate.penaltyQuote}&rdquo;
                  </div>
                )}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

interface ActionPlanChecklistCardProps {
  actionPlan: AnalysisReport['actionPlan'];
  lang: SupportedLanguage;
  isBeingReadAloud?: boolean;
}

export const ActionPlanChecklistCard: React.FC<ActionPlanChecklistCardProps> = ({
  actionPlan,
  lang,
  isBeingReadAloud = false,
}) => {
  const [completedIds, setCompletedIds] = useState<Record<string, boolean>>({});
  const [copiedPlan, setCopiedPlan] = useState<boolean>(false);

  const toggleCompleted = (id: string) => {
    setCompletedIds((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const completedCount = actionPlan.filter((a) => completedIds[a.id]).length;

  const handleCopyActionPlan = () => {
    const lines = [
      lang === 'hi'
        ? 'OpenShield एक्शन प्लान — आगे आपको क्या करना चाहिए?'
        : 'OpenShield Action Plan — What should you do next?',
      ...actionPlan.map((item, idx) => {
        const status = completedIds[item.id] ? '[COMPLETED BY USER]' : '[SUGGESTED NEXT STEP]';
        const title = lang === 'hi' ? item.titleHi : item.title;
        const detail = lang === 'hi' ? item.detailHi : item.detail;
        return `${idx + 1}. ${status} [${item.priority}] ${title}\n   -> ${detail}${
          item.officialLink ? `\n   -> Official Link: ${item.officialLink.url}` : ''
        }`;
      }),
    ].join('\n');
    navigator.clipboard?.writeText(lines);
    setCopiedPlan(true);
    setTimeout(() => setCopiedPlan(false), 2000);
  };

  const priorityStyle = (p: 'Immediate' | 'Before Paying' | 'Record Keeping') => {
    if (p === 'Immediate') return 'bg-red-100 text-red-900 border-red-300';
    if (p === 'Before Paying') return 'bg-amber-100 text-amber-900 border-amber-300';
    return 'bg-slate-200 text-slate-800 border-slate-300';
  };

  return (
    <div
      data-testid="openshield-action-plan-card"
      data-tts-active={isBeingReadAloud ? 'true' : 'false'}
      className={`rounded-xl border p-5 space-y-4 transition-all ${
        isBeingReadAloud
          ? 'bg-blue-50/60 border-[#0b57d0] ring-2 ring-[#0b57d0]/50 shadow-md'
          : 'bg-slate-50 border-slate-200'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="text-xs font-bold text-[#0b57d0] uppercase tracking-wider">
              {lang === 'hi'
                ? 'OpenShield एक्शन प्लान (व्यावहारिक कदम)'
                : 'OpenShield Action Plan — Practical Consumer Checklist'}
            </div>
            {isBeingReadAloud && (
              <span
                data-testid="action-plan-speaking-badge"
                className="px-2 py-0.5 rounded-full bg-[#0b57d0] text-white text-[10px] font-extrabold uppercase tracking-wider animate-pulse"
              >
                {lang === 'hi' ? 'अभी पढ़ा जा रहा है' : 'Speaking Now'}
              </span>
            )}
          </div>
          <h3 className="text-base font-extrabold text-slate-900">
            {lang === 'hi' ? 'आगे आपको क्या करना चाहिए?' : 'What should you do next?'}
          </h3>
          <p className="text-xs text-slate-600 mt-0.5">
            {lang === 'hi'
              ? `सुझाए गए कदम बनाम आपके द्वारा पूरे किए गए कदम (${completedCount}/${actionPlan.length} जाँचे गए)। OpenShield कभी भी आपके बिना पूछे किसी बटन पर क्लिक नहीं करता।`
              : `Distinguishes Suggested Actions from Completed Actions (${completedCount} of ${actionPlan.length} marked done by you). OpenShield never clicks purchase or cancellation buttons on your behalf.`}
          </p>
        </div>

        <button
          type="button"
          onClick={handleCopyActionPlan}
          className="px-3.5 py-2 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 text-xs font-bold text-slate-800 cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-center shrink-0"
        >
          {copiedPlan ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-600" />
              <span>{lang === 'hi' ? 'कॉपी हो गया' : 'Copied Checklist'}</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span>{lang === 'hi' ? 'एक्शन प्लान कॉपी करें' : 'Copy Action Plan'}</span>
            </>
          )}
        </button>
      </div>

      <div className="space-y-2.5">
        {actionPlan.map((item) => {
          const isDone = !!completedIds[item.id];
          return (
            <div
              key={item.id}
              className={`p-3.5 rounded-xl border transition-colors flex items-start justify-between gap-3 ${
                isDone
                  ? 'bg-emerald-50/60 border-emerald-300'
                  : 'bg-white border-slate-200 hover:border-slate-300'
              }`}
            >
              <button
                type="button"
                onClick={() => toggleCompleted(item.id)}
                className="flex items-start gap-3 text-left flex-1 cursor-pointer"
              >
                {isDone ? (
                  <CheckSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${priorityStyle(
                        item.priority
                      )}`}
                    >
                      {item.priority}
                    </span>
                    <span className="text-[11px] font-semibold text-slate-500">
                      {isDone
                        ? lang === 'hi'
                          ? 'आपके द्वारा पूर्ण (Completed)'
                          : 'Completed by you'
                        : lang === 'hi'
                        ? 'सुझाया गया कदम (Suggested)'
                        : 'Suggested action'}
                    </span>
                  </div>
                  <div
                    className={`text-xs sm:text-sm font-bold ${
                      isDone ? 'line-through text-slate-500' : 'text-slate-900'
                    }`}
                  >
                    {lang === 'hi' ? item.titleHi : item.title}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    {lang === 'hi' ? item.detailHi : item.detail}
                  </p>
                </div>
              </button>

              {item.officialLink && (
                <a
                  href={item.officialLink.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-[#0b57d0] font-bold text-xs inline-flex items-center gap-1 shrink-0"
                >
                  <span>Official Page</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

interface EvidenceFindingCardProps {
  finding: EvidenceFinding;
  lang: SupportedLanguage;
  testId?: string;
  onJumpToQuote?: (quote: string) => void;
  isBeingReadAloud?: boolean;
}

export const EvidenceFindingCard: React.FC<EvidenceFindingCardProps> = ({
  finding,
  lang,
  testId = 'url-evidence-card',
  onJumpToQuote,
  isBeingReadAloud = false,
}) => {
  const [showTranslator, setShowTranslator] = useState<boolean>(false);
  const [feedbackState, setFeedbackState] = useState<'helpful' | 'false-positive' | null>(null);

  const riskBadgeClasses = (level: RiskLevel) => {
    switch (level) {
      case 'Critical':
        return 'bg-red-100 text-red-900 border-red-300';
      case 'High':
        return 'bg-orange-100 text-orange-900 border-orange-300';
      case 'Medium':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'Low':
        return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <article
      id={`finding-card-${finding.id}`}
      data-testid={testId}
      data-finding-id={finding.id}
      data-tts-active={isBeingReadAloud ? 'true' : 'false'}
      className={`p-5 rounded-xl border flex flex-col justify-between space-y-3.5 transition-all ${
        isBeingReadAloud
          ? 'bg-blue-50/50 border-[#0b57d0] ring-2 ring-[#0b57d0] shadow-md'
          : 'bg-white border-slate-200 shadow-2xs'
      }`}
    >
      <div className="space-y-3">
        {/* Top Metadata Row */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`px-2.5 py-0.5 rounded-md text-xs font-extrabold border ${riskBadgeClasses(
                finding.riskLevel
              )}`}
            >
              {finding.riskLevel} Risk
            </span>
            <span className="text-xs font-bold text-[#0b57d0]">{finding.category}</span>
            <span className="text-[11px] font-mono text-slate-400">({finding.ruleId})</span>
            {isBeingReadAloud && (
              <span
                data-testid="finding-speaking-badge"
                className="px-2.5 py-0.5 rounded-full bg-[#0b57d0] text-white text-[10px] font-extrabold uppercase tracking-wider animate-pulse"
              >
                {lang === 'hi' ? 'अभी पढ़ा जा रहा है' : 'Speaking Now'}
              </span>
            )}
          </div>

          <div className="text-[11px] text-slate-500">
            {finding.location} · Confidence: <strong className="text-slate-700">{finding.confidence}</strong> ·{' '}
            <span className="text-emerald-700 font-semibold">{finding.provenance}</span>
          </div>
        </div>

        {/* Title & Plain-English / Hindi Explanation */}
        <h3 className="text-sm sm:text-base font-extrabold text-slate-900">
          {lang === 'hi' ? finding.titleHi : finding.title}
        </h3>

        <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
          {lang === 'hi' ? finding.explanationHi : finding.explanation}
        </p>

        {/* Verbatim Source Quotation (Never translated so legal evidentiary meaning is preserved) */}
        <blockquote className="p-3.5 rounded-lg bg-slate-50 border-l-4 border-red-500 text-xs font-mono text-slate-800 leading-relaxed">
          <div className="text-[10px] font-sans font-bold uppercase tracking-wider text-slate-500 mb-1">
            {lang === 'hi'
              ? `स्रोत से सटीक मूल उद्धरण (Exact Verbatim Quote — ${finding.location})`
              : `Exact Supporting Quotation (${finding.location})`}
          </div>
          &ldquo;{finding.quote}&rdquo;
        </blockquote>

        {/* Why It Matters + What to Check Next */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
            <div className="font-bold text-slate-900 mb-0.5">
              {lang === 'hi' ? 'यह आपके लिए क्यों महत्वपूर्ण है:' : 'Potential Consumer Impact:'}
            </div>
            <div className="text-slate-700">
              {lang === 'hi' ? finding.whyItMattersHi : finding.whyItMatters}
            </div>
          </div>

          <div className="p-3 rounded-lg bg-blue-50/60 border border-blue-200">
            <div className="font-bold text-slate-900 mb-0.5">
              {lang === 'hi' ? 'सुझाया गया अगला कदम:' : 'Recommended Next Step:'}
            </div>
            <div className="text-slate-700">
              {lang === 'hi' ? finding.whatToCheckHi : finding.whatToCheck}
            </div>
          </div>
        </div>

        {/* India-Focused Contextual Intelligence Box */}
        <div className="p-3 rounded-lg bg-amber-50/60 border border-amber-200 text-xs space-y-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="font-bold text-slate-900 inline-flex items-center gap-1.5">
              <Scale className="w-3.5 h-3.5 text-amber-700 shrink-0" />
              <span>
                {lang === 'hi' ? 'भारतीय उपभोक्ता संदर्भ:' : 'India Consumer Context:'}{' '}
                {finding.indiaLegalContext.applicableFramework}
              </span>
            </div>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-900">
              {finding.indiaLegalContext.classification} · Verified{' '}
              {finding.indiaLegalContext.verifiedDate}
            </span>
          </div>
          <p className="text-slate-700 leading-relaxed">
            {lang === 'hi'
              ? finding.indiaLegalContext.noteHi
              : finding.indiaLegalContext.noteEn}
          </p>
        </div>

        {/* Expandable Side-by-Side Clause Translator */}
        {showTranslator && (
          <div
            data-testid="clause-translator-panel"
            className="p-4 rounded-xl bg-slate-900 text-slate-100 border border-slate-800 space-y-3 text-xs"
          >
            <div className="text-xs font-extrabold text-emerald-400 uppercase tracking-wider">
              {lang === 'hi'
                ? 'साइड-बाय-साइड क्लॉज़ ट्रांसलेटर (Clause Translator)'
                : 'Side-by-Side Clause Translator'}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
                <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">
                  Original Clause (Verbatim)
                </div>
                <div className="font-mono text-slate-200 leading-relaxed">
                  &ldquo;{finding.quote}&rdquo;
                </div>
              </div>
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
                <div>
                  <div className="text-[10px] font-bold uppercase text-emerald-400">
                    {lang === 'hi' ? 'सरल हिंदी में अर्थ' : 'In Plain English'}
                  </div>
                  <div className="text-slate-200 mt-0.5">
                    {lang === 'hi' ? finding.explanationHi : finding.explanation}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] font-bold uppercase text-amber-400">
                    {lang === 'hi' ? 'क्या अस्पष्ट है (What Remains Unclear)' : 'What Remains Unclear'}
                  </div>
                  <div className="text-slate-300 mt-0.5">
                    {lang === 'hi' ? finding.whatRemainsUnclearHi : finding.whatRemainsUnclear}
                  </div>
                </div>
              </div>
            </div>
            <div className="text-[11px] text-slate-400">
              <strong>Analysis Limitation: </strong>
              {finding.missingInfoOrLimitations}
            </div>
          </div>
        )}
      </div>

      {/* Bottom Action Bar: Clause Translator Toggle, Source Jump, and Local False-Positive Feedback */}
      <div className="pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            data-testid="toggle-clause-translator-btn"
            onClick={() => setShowTranslator((prev) => !prev)}
            className="font-bold text-[#0b57d0] hover:underline cursor-pointer inline-flex items-center gap-1"
          >
            {showTranslator ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" />
                <span>{lang === 'hi' ? 'क्लॉज़ ट्रांसलेटर छिपाएँ' : 'Hide Clause Translator'}</span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" />
                <span>
                  {lang === 'hi'
                    ? 'साइड-बाय-साइड क्लॉज़ ट्रांसलेटर खोलें'
                    : 'Side-by-Side Clause Translator'}
                </span>
              </>
            )}
          </button>

          {onJumpToQuote && (
            <button
              type="button"
              onClick={() => onJumpToQuote(finding.quote)}
              className="font-bold text-slate-700 hover:text-[#0b57d0] hover:underline cursor-pointer inline-flex items-center gap-1"
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>{lang === 'hi' ? 'मूल पाठ में देखें' : 'Highlight in Source Text'}</span>
            </button>
          )}
        </div>

        {/* Privacy-Conscious Local Feedback */}
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          {feedbackState === 'false-positive' ? (
            <span className="text-amber-700 font-semibold">
              Logged locally as potential false positive (no data sent externally)
            </span>
          ) : feedbackState === 'helpful' ? (
            <span className="text-emerald-700 font-semibold">Marked helpful</span>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setFeedbackState('helpful')}
                className="hover:text-slate-900 cursor-pointer inline-flex items-center gap-1"
                title="Accurate finding"
              >
                <ThumbsUp className="w-3 h-3" />
                <span>Accurate</span>
              </button>
              <span aria-hidden="true">·</span>
              <button
                type="button"
                onClick={() => setFeedbackState('false-positive')}
                className="hover:text-amber-700 cursor-pointer inline-flex items-center gap-1"
                title="Report false positive locally"
              >
                <ThumbsDown className="w-3 h-3" />
                <span>Report False Positive</span>
              </button>
            </>
          )}
        </div>
      </div>
    </article>
  );
};

export const OpenSourceRuleRegistryPanel: React.FC<{ lang: SupportedLanguage }> = ({ lang }) => {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  return (
    <section
      id="open-source-rules-section"
      data-testid="open-source-rules-section"
      className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8"
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#0F172A] text-emerald-400 flex items-center justify-center shrink-0">
            <Code2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#0b57d0] tracking-wide">
              05. Open-Source Transparency Engine &amp; Rule Registry (v1.2.0)
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-slate-900">
              {lang === 'hi'
                ? '14 ऑडिट योग्य नियम, फॉल्स-पॉजिटिव सुरक्षा और डेटासेट स्रोत'
                : 'Auditable Detection Rules, Negation Guards & Dataset Provenance'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-0.5 max-w-3xl">
              {lang === 'hi'
                ? 'प्रत्येक नियम का मिलान तर्क, अपवाद (Negation patterns), सकारात्मक/नकारात्मक परीक्षण उदाहरण और भारतीय कानूनी संदर्भ सार्वजनिक रूप से देखा जा सकता है।'
                : 'Inspect every rule ID, matching logic summary, false-positive negation guard, positive/negative test case, and open-source license attribution.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          data-testid="toggle-rule-registry-btn"
          onClick={() => setIsOpen((prev) => !prev)}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer inline-flex items-center gap-1.5 shrink-0 self-start sm:self-center"
        >
          {isOpen ? (
            <>
              <ChevronUp className="w-4 h-4" />
              <span>Hide Rule Registry ({CLAUSE_DETECTION_RULES.length} Rules)</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-4 h-4" />
              <span>Inspect All {CLAUSE_DETECTION_RULES.length} Detection Rules</span>
            </>
          )}
        </button>
      </div>

      {isOpen && (
        <div className="mt-6 pt-6 border-t border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
          {CLAUSE_DETECTION_RULES.map((rule) => (
            <div
              key={rule.ruleId}
              className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono font-bold text-[#0b57d0]">
                  {rule.ruleId} (v{rule.ruleVersion})
                </span>
                <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-800 font-bold text-[11px]">
                  {rule.riskLevel} · {rule.category}
                </span>
              </div>
              <div className="font-extrabold text-slate-900">
                {lang === 'hi' ? rule.titleHi : rule.title}
              </div>
              <p className="text-slate-700">{rule.matchingLogicSummary}</p>
              <div className="p-2.5 rounded-lg bg-white border border-slate-200 space-y-1 text-[11px]">
                <div>
                  <strong className="text-emerald-800">False-Positive Guard: </strong>
                  <span className="text-slate-600">{rule.falsePositiveConsiderations}</span>
                </div>
                <div>
                  <strong className="text-red-700">+ Positive Test: </strong>
                  <span className="font-mono text-slate-700">&ldquo;{rule.positiveTestExample}&rdquo;</span>
                </div>
                <div>
                  <strong className="text-emerald-700">- Negative Test: </strong>
                  <span className="font-mono text-slate-700">&ldquo;{rule.negativeTestExample}&rdquo;</span>
                </div>
              </div>
              <div className="text-[11px] text-slate-500">
                <strong>Sources:</strong> {rule.sourceReferences.join(' · ')} ({rule.licenseAttribution})
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};
