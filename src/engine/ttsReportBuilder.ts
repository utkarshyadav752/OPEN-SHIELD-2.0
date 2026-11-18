/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * OpenShield — Pure Text-to-Speech (TTS) Report Script Builder, Section Chunker & Provider Interface.
 * Generates structured, plain-language spoken scripts from an AnalysisReport without mutating the report.
 */

import type {
  AnalysisReport,
  EvidenceFinding,
  RiskLevel,
  SupportedLanguage,
} from './documentAndUrlAnalyzer.ts';

export type TtsReadingMode = 'summary' | 'full';

export type SpokenSectionKind = 'overview' | 'finding' | 'action-plan' | 'limitations';

export const SUPPORTED_PLAYBACK_SPEEDS = [0.75, 1, 1.25, 1.5, 2] as const;
export type PlaybackSpeed = (typeof SUPPORTED_PLAYBACK_SPEEDS)[number];

export interface SpokenSection {
  id: string;
  index: number;
  kind: SpokenSectionKind;
  label: string;
  badgeText: string;
  riskLevel?: RiskLevel;
  findingId?: string;
  fullSpokenText: string;
  utteranceChunks: string[];
}

export interface SpokenReportScript {
  reportTitle: string;
  mode: TtsReadingMode;
  lang: SupportedLanguage;
  sections: SpokenSection[];
  totalSections: number;
  totalEstimatedWords: number;
}

/**
 * Clean decorative characters, markdown artifacts, or excessive whitespace for natural speech synthesis.
 */
export function sanitizeForSpeech(raw: string): string {
  if (!raw) return '';
  return raw
    .replace(/[\u201C\u201D"]/g, '"')
    .replace(/[\u2018\u2019']/g, "'")
    .replace(/•|·|→|←|—/g, ', ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Splits a paragraph into sentence-aligned utterance chunks under `maxChunkLength` characters
 * so browser `speechSynthesis` engines never cut off mid-section on desktop or mobile.
 */
export function splitTextIntoUtteranceChunks(text: string, maxChunkLength = 220): string[] {
  const cleaned = sanitizeForSpeech(text);
  if (!cleaned) return [];
  if (cleaned.length <= maxChunkLength) return [cleaned];

  // Split on sentence boundaries while keeping punctuation attached
  const sentences = cleaned.match(/[^.!?।]+[.!?।]+|\s*[^.!?।]+$/g) || [cleaned];
  const chunks: string[] = [];
  let current = '';

  for (const rawSentence of sentences) {
    const sentence = rawSentence.trim();
    if (!sentence) continue;

    if (sentence.length > maxChunkLength) {
      if (current) {
        chunks.push(current.trim());
        current = '';
      }
      // Split very long sentence by clauses/commas or word boundaries
      const words = sentence.split(' ');
      let subChunk = '';
      for (const word of words) {
        if ((subChunk + ' ' + word).trim().length > maxChunkLength) {
          if (subChunk) chunks.push(subChunk.trim());
          subChunk = word;
        } else {
          subChunk = subChunk ? `${subChunk} ${word}` : word;
        }
      }
      if (subChunk) {
        current = subChunk.trim();
      }
      continue;
    }

    const candidate = current ? `${current} ${sentence}` : sentence;
    if (candidate.length <= maxChunkLength) {
      current = candidate;
    } else {
      if (current) chunks.push(current.trim());
      current = sentence;
    }
  }

  if (current.trim()) {
    chunks.push(current.trim());
  }

  return chunks;
}

const RISK_PRIORITY_ORDER: Record<RiskLevel, number> = {
  Critical: 0,
  High: 1,
  Medium: 2,
  Low: 3,
};

/**
 * Returns a new array of findings ordered with Critical and High-risk findings first,
 * preserving relative order within each severity tier. Never mutates the input array.
 */
export function sortFindingsByRiskPriority(findings: readonly EvidenceFinding[]): EvidenceFinding[] {
  return [...findings].sort((a, b) => {
    const diff = RISK_PRIORITY_ORDER[a.riskLevel] - RISK_PRIORITY_ORDER[b.riskLevel];
    return diff;
  });
}

/**
 * Selects which findings should be read aloud based on the chosen mode:
 * - 'summary': Reads Critical and High-risk findings first (up to 4), or top 2 findings if no Critical/High exist.
 * - 'full': Reads every finding in priority order.
 */
export function selectFindingsForMode(
  findings: readonly EvidenceFinding[],
  mode: TtsReadingMode
): EvidenceFinding[] {
  const sorted = sortFindingsByRiskPriority(findings);
  if (mode === 'full') {
    return sorted;
  }

  const highPriority = sorted.filter(
    (f) => f.riskLevel === 'Critical' || f.riskLevel === 'High'
  );
  if (highPriority.length > 0) {
    return highPriority.slice(0, 4);
  }
  return sorted.slice(0, 2);
}

/**
 * Builds the complete, structured spoken report script from an `AnalysisReport` without mutating it.
 */
export function buildSpokenReportScript(
  report: Readonly<AnalysisReport>,
  options: {
    mode?: TtsReadingMode;
    lang?: SupportedLanguage;
  } = {}
): SpokenReportScript {
  const mode: TtsReadingMode = options.mode ?? 'summary';
  const lang: SupportedLanguage = options.lang ?? 'en';
  const sections: SpokenSection[] = [];

  // 1. OVERALL RISK SUMMARY SECTION
  const summaryBody = lang === 'hi' ? report.overallSummaryHi : report.overallSummary;
  const costEstimate = report.hiddenCostEstimate;
  let costSentence = '';
  if (costEstimate && costEstimate.calculable) {
    const totalBase =
      costEstimate.estimatedTotalForPeriod !== null
        ? `${costEstimate.currencySymbol}${costEstimate.estimatedTotalForPeriod.toLocaleString('en-IN')}`
        : null;
    const totalInflated =
      costEstimate.estimatedTotalWithAddonsForPeriod !== null &&
      costEstimate.statedAddons.length > 0
        ? `${costEstimate.currencySymbol}${costEstimate.estimatedTotalWithAddonsForPeriod.toLocaleString('en-IN')}`
        : null;

    if (lang === 'hi') {
      costSentence = totalBase
        ? ` वित्तीय प्रभाव अनुमान: ${costEstimate.periodMonths} महीनों की मूल अनुमानित लागत ${totalBase} है${
            totalInflated ? `, और प्री-सेलेक्टेड ऐड-ऑन सहित कुल लागत ${totalInflated} तक पहुँच सकती है।` : '।'
          }`
        : '';
    } else {
      costSentence = totalBase
        ? ` Financial impact estimate: The estimated base cost over ${costEstimate.periodMonths} months is ${totalBase}${
            totalInflated
              ? `, rising to ${totalInflated} when pre-selected add-ons are included.`
              : '.'
          }`
        : '';
    }
  }

  const overviewText =
    lang === 'hi'
      ? `OpenShield विश्लेषण रिपोर्ट: ${report.title}। समग्र जोखिम स्तर: ${report.overallRisk}। कुल ${report.findings.length} जोखिम बिंदु पहचाने गए हैं। ${summaryBody}${costSentence}`
      : `OpenShield Analysis Report for ${report.title}. Overall risk assessment: ${report.overallRisk}. ${
          report.findings.length === 0
            ? 'Zero risky clauses were detected.'
            : `${report.findings.length} total findings detected, including ${report.countsByRisk.Critical} critical and ${report.countsByRisk.High} high risk clauses.`
        } ${summaryBody}${costSentence}`;

  sections.push({
    id: 'section-overview',
    index: sections.length,
    kind: 'overview',
    label: lang === 'hi' ? '1. समग्र जोखिम सारांश' : '1. Overall Risk Summary',
    badgeText: report.overallRisk,
    fullSpokenText: sanitizeForSpeech(overviewText),
    utteranceChunks: splitTextIntoUtteranceChunks(overviewText),
  });

  // 2. IMPORTANT FINDINGS (HIGH-RISK FIRST IN SUMMARY, ALL IN FULL REPORT)
  const selectedFindings = selectFindingsForMode(report.findings, mode);

  selectedFindings.forEach((finding, idx) => {
    const findingNumber = idx + 1;
    const title = lang === 'hi' ? finding.titleHi : finding.title;
    const explanation = lang === 'hi' ? finding.explanationHi : finding.explanation;
    const whyItMatters = lang === 'hi' ? finding.whyItMattersHi : finding.whyItMatters;
    const whatToCheck = lang === 'hi' ? finding.whatToCheckHi : finding.whatToCheck;

    const shortExcerpt =
      finding.quote.length > 200 ? `${finding.quote.slice(0, 197).trim()}...` : finding.quote;

    const findingSpeech =
      lang === 'hi'
        ? `निष्कर्ष ${findingNumber} (${finding.riskLevel} जोखिम स्तर): ${title}। यह क्यों चिंताजनक है: ${explanation} संबंधित अनुबंध उद्धरण: "${shortExcerpt}"। उपभोक्ता पर प्रभाव: ${whyItMatters} सुझाया गया कदम: ${whatToCheck}`
        : `Finding ${findingNumber} of ${selectedFindings.length}. Risk level: ${finding.riskLevel} Risk. Category: ${finding.category}. ${title}. Plain-English explanation: ${explanation} Supporting clause excerpt from ${finding.location}: "${shortExcerpt}". Why this matters: ${whyItMatters} Recommended action: ${whatToCheck}`;

    sections.push({
      id: `section-finding-${finding.id}`,
      index: sections.length,
      kind: 'finding',
      label:
        lang === 'hi'
          ? `निष्कर्ष ${findingNumber}: ${title}`
          : `Finding ${findingNumber} (${finding.riskLevel} Risk): ${title}`,
      badgeText: `${finding.riskLevel} Risk`,
      riskLevel: finding.riskLevel,
      findingId: finding.id,
      fullSpokenText: sanitizeForSpeech(findingSpeech),
      utteranceChunks: splitTextIntoUtteranceChunks(findingSpeech),
    });
  });

  // 3. RECOMMENDED ACTIONS & QUESTIONS TO CONSIDER
  if (report.actionPlan && report.actionPlan.length > 0) {
    const actionsToRead =
      mode === 'full' ? report.actionPlan : report.actionPlan.slice(0, 3);

    const actionItemsSpeech = actionsToRead
      .map((item, i) => {
        const title = lang === 'hi' ? item.titleHi : item.title;
        const detail = lang === 'hi' ? item.detailHi : item.detail;
        return lang === 'hi'
          ? `कदम ${i + 1} (${item.priority}): ${title}। ${detail}`
          : `Step ${i + 1}, priority ${item.priority}: ${title}. ${detail}`;
      })
      .join(' ');

    const actionHeader =
      lang === 'hi'
        ? `सुझाई गई कार्य योजना और विचारणीय प्रश्न। ${actionItemsSpeech}`
        : `Recommended actions and questions to consider before agreeing. ${actionItemsSpeech}`;

    sections.push({
      id: 'section-action-plan',
      index: sections.length,
      kind: 'action-plan',
      label:
        lang === 'hi'
          ? 'सुझाए गए कदम (Action Plan)'
          : 'Recommended Actions & Checklist',
      badgeText: `${actionsToRead.length} Steps`,
      fullSpokenText: sanitizeForSpeech(actionHeader),
      utteranceChunks: splitTextIntoUtteranceChunks(actionHeader),
    });
  }

  // 4. LIMITATIONS & NON-LEGAL-ADVICE DISCLAIMER
  const limitationsBody = lang === 'hi' ? report.limitationsHi : report.limitations;
  const disclaimerSpeech =
    lang === 'hi'
      ? `सीमाएँ और अस्वीकरण: ${limitationsBody} कृपया ध्यान दें कि ये निष्कर्ष AI और नियम-आधारित उपभोक्ता सुरक्षा मूल्यांकन हैं, अंतिम कानूनी सलाह नहीं।`
      : `Important limitations and uncertainty: ${limitationsBody} Please note that these findings are AI-assisted consumer protection assessments based on the text provided, and do not constitute definitive legal advice.`;

  sections.push({
    id: 'section-limitations',
    index: sections.length,
    kind: 'limitations',
    label:
      lang === 'hi'
        ? 'सीमाएँ और कानूनी अस्वीकरण'
        : 'Limitations & AI Assessment Disclaimer',
    badgeText: 'Disclaimer',
    fullSpokenText: sanitizeForSpeech(disclaimerSpeech),
    utteranceChunks: splitTextIntoUtteranceChunks(disclaimerSpeech),
  });

  const totalEstimatedWords = sections.reduce(
    (sum, sec) => sum + sec.fullSpokenText.split(/\s+/).filter(Boolean).length,
    0
  );

  return {
    reportTitle: report.title,
    mode,
    lang,
    sections,
    totalSections: sections.length,
    totalEstimatedWords,
  };
}

export type TtsControlStatus =
  | 'idle'
  | 'playing'
  | 'paused'
  | 'completed'
  | 'unsupported'
  | 'error';

/**
 * Generates a descriptive screen-reader aria-label for a playback speed option button,
 * explicitly announcing whether that speed is currently selected.
 */
export function getPlaybackSpeedAriaLabel(
  optionSpeed: PlaybackSpeed,
  activeSpeed: PlaybackSpeed,
  lang: SupportedLanguage = 'en'
): string {
  const isSelected = optionSpeed === activeSpeed;
  if (lang === 'hi') {
    return isSelected
      ? `प्लेबैक गति ${optionSpeed}x, चयनित (Playback speed ${optionSpeed}x, selected)`
      : `प्लेबैक गति ${optionSpeed}x चुनें — वर्तमान गति ${activeSpeed}x (Set playback speed to ${optionSpeed}x)`;
  }
  return isSelected
    ? `Playback speed ${optionSpeed}x, selected`
    : `Set playback speed to ${optionSpeed}x (current speed ${activeSpeed}x)`;
}

export interface PlaybackControlAriaConfig {
  status: TtsControlStatus;
  mode: TtsReadingMode;
  speed: PlaybackSpeed;
  lang: SupportedLanguage;
  currentSectionIdx: number;
  totalSections: number;
  activeSectionLabel: string;
  totalFindings: number;
  isExpanded: boolean;
  showVoiceSettings: boolean;
  autoScrollEnabled: boolean;
  selectedVoiceName?: string;
}

export interface PlaybackControlAriaLabels {
  primaryListenBtn: string;
  modeGroup: string;
  modeSummaryBtn: string;
  modeFullBtn: string;
  toggleControlsBtn: string;
  retryBtn: string;
  prevBtn: string;
  playBtn: string;
  pauseBtn: string;
  resumeBtn: string;
  stopBtn: string;
  nextBtn: string;
  replayBtn: string;
  speedGroup: string;
  voiceSettingsToggleBtn: string;
  voiceSelect: string;
  autoScrollCheckbox: string;
}

/**
 * Builds comprehensive, state-aware ARIA labels for every control in ListenToResultsPanel
 * so screen readers clearly announce play, pause, resume, stop, mode, and speed selection states.
 */
export function buildPlaybackControlAriaLabels(
  config: PlaybackControlAriaConfig
): PlaybackControlAriaLabels {
  const {
    status,
    mode,
    speed,
    lang,
    currentSectionIdx,
    totalSections,
    activeSectionLabel,
    totalFindings,
    isExpanded,
    showVoiceSettings,
    autoScrollEnabled,
    selectedVoiceName,
  } = config;

  const sectionPositionEn = `Section ${currentSectionIdx + 1} of ${totalSections}`;
  const sectionPositionHi = `भाग ${currentSectionIdx + 1} / ${totalSections}`;
  const canGoPrev = currentSectionIdx > 0;
  const canGoNext = currentSectionIdx < totalSections - 1;
  const isStopDisabled = status === 'idle' && currentSectionIdx === 0;

  if (lang === 'hi') {
    return {
      primaryListenBtn:
        status === 'playing'
          ? `ऑडियो रिपोर्ट रोकें (Pause) — अभी ${sectionPositionHi} (${activeSectionLabel}) ${speed}x गति पर चल रहा है`
          : status === 'paused'
          ? `ऑडियो रिपोर्ट जारी रखें (Resume) — ${sectionPositionHi} (${activeSectionLabel}) पर रुका हुआ, गति ${speed}x`
          : `परिणाम सुनें (Play Listen to Results) — ${
              mode === 'full' ? 'पूरी रिपोर्ट' : 'संक्षिप्त सारांश'
            } ${speed}x गति पर चलाएँ`,
      modeGroup: `ऑडियो रिपोर्ट पढ़ने का मोड, वर्तमान चयन: ${
        mode === 'full' ? 'पूरी रिपोर्ट' : 'संक्षिप्त सारांश'
      }`,
      modeSummaryBtn:
        mode === 'summary'
          ? 'संक्षिप्त सारांश मोड, चयनित (Spoken Summary mode, selected)'
          : 'संक्षिप्त सारांश मोड चुनें (Switch to Spoken Summary mode)',
      modeFullBtn:
        mode === 'full'
          ? `पूरी रिपोर्ट सुनें मोड (${totalFindings} निष्कर्ष), चयनित (Full Report mode, selected)`
          : `पूरी रिपोर्ट सुनें मोड चुनें (${totalFindings} निष्कर्ष) (Switch to Full Report mode)`,
      toggleControlsBtn: isExpanded
        ? 'ऑडियो प्लेयर कंट्रोल पैनल छिपाएँ (विस्तारित)'
        : 'ऑडियो प्लेयर कंट्रोल पैनल दिखाएँ (संक्षिप्त)',
      retryBtn: `वर्तमान अनुभाग (${sectionPositionHi}) से ऑडियो प्लेबैक पुनः प्रयास करें`,
      prevBtn: canGoPrev
        ? `पिछले अनुभाग पर जाएँ (भाग ${currentSectionIdx} / ${totalSections})`
        : 'पिछला अनुभाग (उपलब्ध नहीं, पहले अनुभाग पर हैं)',
      playBtn: `ऑडियो चलाएँ (Play) — ${sectionPositionHi} (${activeSectionLabel}) ${speed}x गति पर शुरू करें`,
      pauseBtn: `ऑडियो रोकें (Pause) — अभी ${sectionPositionHi} (${activeSectionLabel}) ${speed}x गति पर चल रहा है`,
      resumeBtn: `ऑडियो जारी रखें (Resume) — ${sectionPositionHi} (${activeSectionLabel}) से ${speed}x गति पर जारी रखें`,
      stopBtn: isStopDisabled
        ? 'ऑडियो बंद करें और रीसेट करें (पहले से ही प्रारंभिक स्थिति में है)'
        : `ऑडियो प्लेबैक बंद करें और भाग 1 पर रीसेट करें`,
      nextBtn: canGoNext
        ? `अगले अनुभाग पर जाएँ (भाग ${currentSectionIdx + 2} / ${totalSections})`
        : 'अगला अनुभाग (उपलब्ध नहीं, अंतिम अनुभाग पर हैं)',
      replayBtn: `भाग 1 से पूरी ऑडियो रिपोर्ट ${speed}x गति पर फिर से सुनें (Replay)`,
      speedGroup: `प्लेबैक गति चयन (Playback speed), वर्तमान गति ${speed}x सक्रिय`,
      voiceSettingsToggleBtn: showVoiceSettings
        ? 'आवाज़ और हाइलाइट सेटिंग्स छिपाएँ (चयनित)'
        : 'आवाज़ और हाइलाइट सेटिंग्स दिखाएँ',
      voiceSelect: selectedVoiceName
        ? `आवाज़ और भाषा चुनें, वर्तमान आवाज़: ${selectedVoiceName}`
        : 'ऑडियो रिपोर्ट के लिए आवाज़ और भाषा चुनें',
      autoScrollCheckbox: autoScrollEnabled
        ? 'पढ़े जा रहे निष्कर्ष को हाइलाइट और ऑटो-स्क्रॉल करें, सक्रिय'
        : 'पढ़े जा रहे निष्कर्ष को हाइलाइट और ऑटो-स्क्रॉल करें, निष्क्रिय',
    };
  }

  return {
    primaryListenBtn:
      status === 'playing'
        ? `Pause reading analysis results — currently playing ${sectionPositionEn} (${activeSectionLabel}) at ${speed}x speed`
        : status === 'paused'
        ? `Resume reading analysis results — paused at ${sectionPositionEn} (${activeSectionLabel}) at ${speed}x speed`
        : `Listen to Results — play ${
            mode === 'full' ? 'Full Report' : 'Spoken Summary'
          } aloud at ${speed}x speed`,
    modeGroup: `Spoken report reading mode, ${
      mode === 'full' ? 'Listen to Full Report' : 'Spoken Summary'
    } selected`,
    modeSummaryBtn:
      mode === 'summary'
        ? 'Spoken Summary mode, selected'
        : 'Switch to Spoken Summary mode',
    modeFullBtn:
      mode === 'full'
        ? `Listen to Full Report mode (${totalFindings} findings), selected`
        : `Switch to Listen to Full Report mode (${totalFindings} findings)`,
    toggleControlsBtn: isExpanded
      ? 'Hide audio player controls (expanded)'
      : 'Show audio player controls (collapsed)',
    retryBtn: `Retry audio playback for ${sectionPositionEn} (${activeSectionLabel})`,
    prevBtn: canGoPrev
      ? `Previous section or finding (jump to Section ${currentSectionIdx} of ${totalSections})`
      : 'Previous section or finding (unavailable, at first section)',
    playBtn: `Play analysis aloud — start ${sectionPositionEn} (${activeSectionLabel}) at ${speed}x speed`,
    pauseBtn: `Pause playback — currently playing ${sectionPositionEn} (${activeSectionLabel}) at ${speed}x speed`,
    resumeBtn: `Resume playback — paused at ${sectionPositionEn} (${activeSectionLabel}) at ${speed}x speed`,
    stopBtn: isStopDisabled
      ? 'Stop and reset playback (already reset at beginning)'
      : 'Stop audio playback and reset to Section 1',
    nextBtn: canGoNext
      ? `Next section or finding (jump to Section ${currentSectionIdx + 2} of ${totalSections})`
      : 'Next section or finding (unavailable, at last section)',
    replayBtn: `Replay report from beginning (Section 1) at ${speed}x speed`,
    speedGroup: `Playback speed selection, current speed ${speed}x selected`,
    voiceSettingsToggleBtn: showVoiceSettings
      ? 'Hide voice and highlight settings (expanded)'
      : 'Show voice and highlight settings (collapsed)',
    voiceSelect: selectedVoiceName
      ? `Select speech synthesis voice and language, current voice ${selectedVoiceName}`
      : 'Select speech synthesis voice and language',
    autoScrollCheckbox: autoScrollEnabled
      ? 'Highlight and scroll to active finding during playback, enabled'
      : 'Highlight and scroll to active finding during playback, disabled',
  };
}

/**
 * Generates a descriptive aria-label for each section jump pill in ListenToResultsPanel.
 */
export function getSectionPillAriaLabel(params: {
  sectionIndex: number;
  totalSections: number;
  sectionLabel: string;
  isCurrent: boolean;
  status: TtsControlStatus;
  lang?: SupportedLanguage;
}): string {
  const { sectionIndex, totalSections, sectionLabel, isCurrent, status, lang = 'en' } = params;
  const num = sectionIndex + 1;
  if (lang === 'hi') {
    const stateSuffix = isCurrent
      ? status === 'playing'
        ? ', अभी चल रहा है'
        : status === 'paused'
        ? ', अभी रुका हुआ है'
        : ', वर्तमान में चयनित'
      : '';
    return `भाग ${num} / ${totalSections} पर जाएँ: ${sectionLabel}${stateSuffix}`;
  }
  const stateSuffix = isCurrent
    ? status === 'playing'
      ? ', currently playing'
      : status === 'paused'
      ? ', currently paused'
      : ', currently selected'
    : '';
  return `Jump to Section ${num} of ${totalSections}: ${sectionLabel}${stateSuffix}`;
}

