import React, { useEffect, useId, useMemo, useRef, useState, useCallback } from 'react';
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Square,
  RotateCcw,
  SkipBack,
  SkipForward,
  SlidersHorizontal,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import type { AnalysisReport, SupportedLanguage } from '../engine/documentAndUrlAnalyzer';
import {
  buildSpokenReportScript,
  buildPlaybackControlAriaLabels,
  getPlaybackSpeedAriaLabel,
  getSectionPillAriaLabel,
  SUPPORTED_PLAYBACK_SPEEDS,
  type PlaybackSpeed,
  type SpokenSectionKind,
  type TtsReadingMode,
} from '../engine/ttsReportBuilder';

export type TtsPlaybackStatus = 'idle' | 'playing' | 'paused' | 'completed' | 'unsupported' | 'error';

export interface ActiveSpokenTarget {
  sectionId: string | null;
  findingId: string | null;
  kind: SpokenSectionKind | null;
}

interface ListenToResultsPanelProps {
  report: AnalysisReport | null | undefined;
  lang: SupportedLanguage;
  testIdPrefix?: string;
  onActiveTargetChange?: (target: ActiveSpokenTarget) => void;
}

const GLOBAL_TTS_EVENT = 'openshield:tts-session-started';

function checkBrowserSpeechSupport(): boolean {
  if (typeof window === 'undefined') return false;
  return (
    'speechSynthesis' in window &&
    Boolean(window.speechSynthesis) &&
    typeof window.SpeechSynthesisUtterance !== 'undefined'
  );
}

export const ListenToResultsPanel: React.FC<ListenToResultsPanelProps> = ({
  report,
  lang,
  testIdPrefix = 'tts-results',
  onActiveTargetChange,
}) => {
  const instanceId = useId();
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [mode, setMode] = useState<TtsReadingMode>('summary');
  const [status, setStatus] = useState<TtsPlaybackStatus>('idle');
  const [currentSectionIdx, setCurrentSectionIdx] = useState<number>(0);
  const [currentChunkIdx, setCurrentChunkIdx] = useState<number>(0);
  const [speed, setSpeed] = useState<PlaybackSpeed>(1);
  const [availableVoices, setAvailableVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [selectedVoiceURI, setSelectedVoiceURI] = useState<string>('');
  const [autoScrollEnabled, setAutoScrollEnabled] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showVoiceSettings, setShowVoiceSettings] = useState<boolean>(false);

  // Refs for asynchronous speech callbacks & timers so closures never read stale state
  const statusRef = useRef<TtsPlaybackStatus>('idle');
  const sectionIdxRef = useRef<number>(0);
  const chunkIdxRef = useRef<number>(0);
  const speedRef = useRef<PlaybackSpeed>(1);
  const selectedVoiceURIRef = useRef<string>('');
  const activeSessionTokenRef = useRef<number>(0);
  const fallbackTimerRef = useRef<number | null>(null);
  const onActiveTargetChangeRef = useRef(onActiveTargetChange);
  const lastEmittedTargetRef = useRef<string>('null|null|null');

  useEffect(() => {
    onActiveTargetChangeRef.current = onActiveTargetChange;
  }, [onActiveTargetChange]);

  const script = useMemo(() => {
    if (!report) return null;
    return buildSpokenReportScript(report, { mode, lang });
  }, [report, mode, lang]);

  const scriptRef = useRef(script);
  useEffect(() => {
    scriptRef.current = script;
  }, [script]);

  const clearFallbackTimer = useCallback(() => {
    if (fallbackTimerRef.current !== null) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
  }, []);

  const updateStatus = useCallback((next: TtsPlaybackStatus) => {
    statusRef.current = next;
    setStatus(next);
  }, []);

  // Notify parent component about which section / finding card is currently being read (deduplicated)
  useEffect(() => {
    let nextTarget: ActiveSpokenTarget = {
      sectionId: null,
      findingId: null,
      kind: null,
    };

    if ((status === 'playing' || status === 'paused') && script && script.sections[currentSectionIdx]) {
      const sec = script.sections[currentSectionIdx];
      nextTarget = {
        sectionId: sec.id,
        findingId: sec.findingId ?? null,
        kind: sec.kind,
      };
    }

    const signature = `${nextTarget.sectionId}|${nextTarget.findingId}|${nextTarget.kind}`;
    if (lastEmittedTargetRef.current !== signature) {
      lastEmittedTargetRef.current = signature;
      onActiveTargetChangeRef.current?.(nextTarget);

      if (autoScrollEnabled && nextTarget.findingId && typeof window !== 'undefined') {
        const prefersReducedMotion =
          typeof window.matchMedia === 'function' &&
          window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const cardEl = document.getElementById(`finding-card-${nextTarget.findingId}`);
        if (cardEl) {
          cardEl.scrollIntoView({
            behavior: prefersReducedMotion ? 'auto' : 'smooth',
            block: 'nearest',
          });
        }
      }
    }
  }, [status, currentSectionIdx, script, autoScrollEnabled]);

  // Load voices from Web Speech API
  useEffect(() => {
    if (!checkBrowserSpeechSupport()) return;

    const loadVoices = () => {
      try {
        const voices = window.speechSynthesis.getVoices() || [];
        setAvailableVoices(voices);
        if (voices.length > 0 && !selectedVoiceURIRef.current) {
          const targetLangPrefix = lang === 'hi' ? 'hi' : 'en';
          const preferred =
            voices.find((v) => v.lang.toLowerCase().startsWith(targetLangPrefix) && v.default) ||
            voices.find((v) => v.lang.toLowerCase().startsWith(targetLangPrefix)) ||
            voices.find((v) => v.default) ||
            voices[0];
          if (preferred) {
            selectedVoiceURIRef.current = preferred.voiceURI;
            setSelectedVoiceURI(preferred.voiceURI);
          }
        }
      } catch {
        // Ignore voice enumeration errors on restricted browsers
      }
    };

    loadVoices();
    if (typeof window.speechSynthesis.addEventListener === 'function') {
      window.speechSynthesis.addEventListener('voiceschanged', loadVoices);
      return () => {
        window.speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      };
    }
  }, [lang]);

  const cancelBrowserSpeech = useCallback(() => {
    activeSessionTokenRef.current += 1;
    clearFallbackTimer();
    if (checkBrowserSpeechSupport()) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // Ignore cancellation errors
      }
    }
  }, [clearFallbackTimer]);

  // Stop playback when another ListenToResultsPanel instance starts speaking
  useEffect(() => {
    const handleOtherSession = (e: Event) => {
      const customEvent = e as CustomEvent<{ instanceId: string }>;
      if (customEvent.detail?.instanceId !== instanceId) {
        if (statusRef.current === 'playing' || statusRef.current === 'paused') {
          cancelBrowserSpeech();
          updateStatus('idle');
          setCurrentSectionIdx(0);
          setCurrentChunkIdx(0);
          sectionIdxRef.current = 0;
          chunkIdxRef.current = 0;
        }
      }
    };

    window.addEventListener(GLOBAL_TTS_EVENT, handleOtherSession);
    return () => {
      window.removeEventListener(GLOBAL_TTS_EVENT, handleOtherSession);
    };
  }, [cancelBrowserSpeech, instanceId, updateStatus]);

  // Stop speech when component unmounts or page unloads
  useEffect(() => {
    const handleBeforeUnload = () => {
      cancelBrowserSpeech();
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      cancelBrowserSpeech();
    };
  }, [cancelBrowserSpeech]);

  // Reset playback state if the underlying report title/timestamp changes
  useEffect(() => {
    cancelBrowserSpeech();
    updateStatus('idle');
    setCurrentSectionIdx(0);
    setCurrentChunkIdx(0);
    sectionIdxRef.current = 0;
    chunkIdxRef.current = 0;
    setErrorMessage(null);
  }, [report?.title, report?.scannedAt, cancelBrowserSpeech, updateStatus]);

  const advanceToNextChunkOrSection = useCallback(
    (
      secIdx: number,
      chkIdx: number,
      sessionToken: number,
      speakFn: (sIdx: number, cIdx: number, token: number) => void
    ) => {
      if (activeSessionTokenRef.current !== sessionToken) return;
      if (statusRef.current !== 'playing') return;

      const currentScript = scriptRef.current;
      if (!currentScript) return;
      const section = currentScript.sections[secIdx];
      if (!section) return;

      const nextChunk = chkIdx + 1;
      if (nextChunk < section.utteranceChunks.length) {
        chunkIdxRef.current = nextChunk;
        setCurrentChunkIdx(nextChunk);
        speakFn(secIdx, nextChunk, sessionToken);
      } else {
        const nextSec = secIdx + 1;
        if (nextSec < currentScript.sections.length) {
          sectionIdxRef.current = nextSec;
          chunkIdxRef.current = 0;
          setCurrentSectionIdx(nextSec);
          setCurrentChunkIdx(0);
          speakFn(nextSec, 0, sessionToken);
        } else {
          updateStatus('completed');
          setCurrentSectionIdx(0);
          setCurrentChunkIdx(0);
          sectionIdxRef.current = 0;
          chunkIdxRef.current = 0;
        }
      }
    },
    [updateStatus]
  );

  const speakChunkAt = useCallback(
    (secIdx: number, chkIdx: number, sessionToken: number) => {
      const currentScript = scriptRef.current;
      if (!currentScript || currentScript.sections.length === 0) return;

      clearFallbackTimer();

      if (!checkBrowserSpeechSupport()) {
        updateStatus('unsupported');
        setErrorMessage(
          lang === 'hi'
            ? 'इस ब्राउज़र या डिवाइस में ऑडियो प्लेबैक (Web Speech API) समर्थित नहीं है। आप नीचे पूरी लिखित रिपोर्ट पढ़ सकते हैं।'
            : 'Audio playback (Web Speech API) is not supported on this browser or device. Your full written analysis report remains available below.'
        );
        return;
      }

      if (secIdx >= currentScript.sections.length) {
        updateStatus('completed');
        setCurrentSectionIdx(0);
        setCurrentChunkIdx(0);
        sectionIdxRef.current = 0;
        chunkIdxRef.current = 0;
        return;
      }

      const section = currentScript.sections[secIdx];
      const chunks = section.utteranceChunks;
      if (chkIdx >= chunks.length) {
        advanceToNextChunkOrSection(secIdx, chkIdx, sessionToken, speakChunkAt);
        return;
      }

      const textToSpeak = chunks[chkIdx];

      // Schedule a guided cadence timer in case the OS has no hardware voice synthesizer
      const scheduleCadenceTimer = () => {
        clearFallbackTimer();
        const words = textToSpeak.split(/\s+/).length;
        const durationMs = Math.max(1800, Math.round(((words / 2.8) * 1000) / speedRef.current));
        fallbackTimerRef.current = window.setTimeout(() => {
          advanceToNextChunkOrSection(secIdx, chkIdx, sessionToken, speakChunkAt);
        }, durationMs);
      };

      try {
        const utterance = new window.SpeechSynthesisUtterance(textToSpeak);
        utterance.rate = speedRef.current;
        utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-US';

        const voices = window.speechSynthesis.getVoices?.() || [];
        if (selectedVoiceURIRef.current && voices.length > 0) {
          const matchedVoice = voices.find((v) => v.voiceURI === selectedVoiceURIRef.current);
          if (matchedVoice) {
            utterance.voice = matchedVoice;
            utterance.lang = matchedVoice.lang;
          }
        }

        let handledByUtterance = false;

        utterance.onend = () => {
          if (activeSessionTokenRef.current !== sessionToken) return;
          if (handledByUtterance) return;
          handledByUtterance = true;
          clearFallbackTimer();
          advanceToNextChunkOrSection(secIdx, chkIdx, sessionToken, speakChunkAt);
        };

        utterance.onerror = (event) => {
          if (activeSessionTokenRef.current !== sessionToken) return;
          const errCode = (event as SpeechSynthesisErrorEvent)?.error;
          if (errCode === 'interrupted' || errCode === 'canceled') {
            return;
          }
          // If the OS lacks a hardware/system TTS daemon (e.g., synthesis-failed / synthesis-unavailable),
          // keep the guided reader active using the cadence timer so playback and card highlighting continue smoothly.
          if (
            errCode === 'synthesis-failed' ||
            errCode === 'synthesis-unavailable' ||
            errCode === 'audio-busy' ||
            errCode === 'not-allowed' ||
            voices.length === 0
          ) {
            if (!handledByUtterance) {
              handledByUtterance = true;
              scheduleCadenceTimer();
            }
            return;
          }

          clearFallbackTimer();
          updateStatus('error');
          setErrorMessage(
            lang === 'hi'
              ? 'ऑडियो पढ़ने के दौरान समस्या हुई। कृपया पुनः प्रयास करें या आवाज़ बदलें।'
              : 'Speech synthesis encountered a playback issue on this device. Please click Retry or select another voice.'
          );
        };

        window.speechSynthesis.speak(utterance);

        // If browser has 0 OS voices installed, also arm the cadence timer so playback progresses reliably
        if (voices.length === 0) {
          scheduleCadenceTimer();
        }
      } catch {
        updateStatus('error');
        setErrorMessage(
          lang === 'hi'
            ? 'ऑडियो इंजन प्रारंभ करने में असमर्थ। कृपया पुनः प्रयास करें।'
            : 'Unable to initialize browser speech engine. Please retry.'
        );
      }
    },
    [advanceToNextChunkOrSection, clearFallbackTimer, lang, updateStatus]
  );

  const startPlaybackFrom = useCallback(
    (targetSectionIdx: number, targetChunkIdx = 0) => {
      if (!scriptRef.current || scriptRef.current.sections.length === 0) return;

      setIsExpanded(true);
      setErrorMessage(null);

      if (!checkBrowserSpeechSupport()) {
        updateStatus('unsupported');
        setErrorMessage(
          lang === 'hi'
            ? 'इस ब्राउज़र या डिवाइस में ऑडियो प्लेबैक (Web Speech API) समर्थित नहीं है। आप नीचे पूरी लिखित रिपोर्ट पढ़ सकते हैं।'
            : 'Audio playback (Web Speech API) is not supported on this browser or device. Your full written analysis report remains available below.'
        );
        return;
      }

      // Notify any other ListenToResultsPanel on the page to stop
      window.dispatchEvent(
        new CustomEvent(GLOBAL_TTS_EVENT, { detail: { instanceId } })
      );

      cancelBrowserSpeech();
      const nextToken = activeSessionTokenRef.current;

      const boundedSection = Math.max(
        0,
        Math.min(targetSectionIdx, scriptRef.current.sections.length - 1)
      );
      sectionIdxRef.current = boundedSection;
      chunkIdxRef.current = targetChunkIdx;
      setCurrentSectionIdx(boundedSection);
      setCurrentChunkIdx(targetChunkIdx);
      updateStatus('playing');

      speakChunkAt(boundedSection, targetChunkIdx, nextToken);
    },
    [cancelBrowserSpeech, instanceId, lang, speakChunkAt, updateStatus]
  );

  const handlePrimaryListenButton = () => {
    if (!isExpanded) {
      setIsExpanded(true);
      if (status === 'idle' || status === 'completed') {
        startPlaybackFrom(0, 0);
      }
      return;
    }

    if (status === 'playing') {
      handlePause();
    } else if (status === 'paused') {
      handleResume();
    } else {
      startPlaybackFrom(currentSectionIdx, 0);
    }
  };

  const handlePause = () => {
    if (statusRef.current !== 'playing') return;
    clearFallbackTimer();
    if (checkBrowserSpeechSupport()) {
      try {
        window.speechSynthesis.pause();
      } catch {
        cancelBrowserSpeech();
      }
    }
    updateStatus('paused');
  };

  const handleResume = () => {
    if (statusRef.current !== 'paused') return;
    setErrorMessage(null);
    if (checkBrowserSpeechSupport()) {
      try {
        if (window.speechSynthesis.paused && window.speechSynthesis.speaking) {
          window.speechSynthesis.resume();
          updateStatus('playing');
          return;
        }
      } catch {
        // Fall through to re-speaking from current saved position
      }
    }
    startPlaybackFrom(sectionIdxRef.current, chunkIdxRef.current);
  };

  const handleStop = () => {
    cancelBrowserSpeech();
    updateStatus('idle');
    setCurrentSectionIdx(0);
    setCurrentChunkIdx(0);
    sectionIdxRef.current = 0;
    chunkIdxRef.current = 0;
    setErrorMessage(null);
  };

  const handleReplay = () => {
    startPlaybackFrom(0, 0);
  };

  const handleSkipPrev = () => {
    if (!script) return;
    const prevIdx = Math.max(0, currentSectionIdx - 1);
    if (status === 'playing' || status === 'paused') {
      startPlaybackFrom(prevIdx, 0);
    } else {
      sectionIdxRef.current = prevIdx;
      chunkIdxRef.current = 0;
      setCurrentSectionIdx(prevIdx);
      setCurrentChunkIdx(0);
    }
  };

  const handleSkipNext = () => {
    if (!script) return;
    const nextIdx = Math.min(script.sections.length - 1, currentSectionIdx + 1);
    if (status === 'playing' || status === 'paused') {
      startPlaybackFrom(nextIdx, 0);
    } else {
      sectionIdxRef.current = nextIdx;
      chunkIdxRef.current = 0;
      setCurrentSectionIdx(nextIdx);
      setCurrentChunkIdx(0);
    }
  };

  const handleSpeedChange = (newSpeed: PlaybackSpeed) => {
    speedRef.current = newSpeed;
    setSpeed(newSpeed);
    if (statusRef.current === 'playing') {
      startPlaybackFrom(sectionIdxRef.current, chunkIdxRef.current);
    }
  };

  const handleModeChange = (nextMode: TtsReadingMode) => {
    if (nextMode === mode) return;
    const wasPlaying = statusRef.current === 'playing';
    cancelBrowserSpeech();
    setMode(nextMode);
    sectionIdxRef.current = 0;
    chunkIdxRef.current = 0;
    setCurrentSectionIdx(0);
    setCurrentChunkIdx(0);
    if (wasPlaying) {
      setTimeout(() => {
        startPlaybackFrom(0, 0);
      }, 20);
    } else {
      updateStatus('idle');
    }
  };

  const handleVoiceChange = (voiceURI: string) => {
    selectedVoiceURIRef.current = voiceURI;
    setSelectedVoiceURI(voiceURI);
    if (statusRef.current === 'playing') {
      startPlaybackFrom(sectionIdxRef.current, chunkIdxRef.current);
    }
  };

  // Requirement A: Show the button only when valid analysis results are available
  if (!report || !script || script.sections.length === 0) {
    return null;
  }

  const activeSection = script.sections[currentSectionIdx] || script.sections[0];
  const selectedVoiceObj = availableVoices.find((v) => v.voiceURI === selectedVoiceURI);
  const controlAriaLabels = buildPlaybackControlAriaLabels({
    status,
    mode,
    speed,
    lang,
    currentSectionIdx,
    totalSections: script.sections.length,
    activeSectionLabel: activeSection.label,
    totalFindings: report.findings.length,
    isExpanded,
    showVoiceSettings,
    autoScrollEnabled,
    selectedVoiceName: selectedVoiceObj ? `${selectedVoiceObj.name} (${selectedVoiceObj.lang})` : undefined,
  });

  const progressPercent =
    status === 'completed'
      ? 100
      : status === 'idle' && currentSectionIdx === 0 && currentChunkIdx === 0
      ? 0
      : Math.min(
          100,
          Math.round(
            ((currentSectionIdx +
              (activeSection.utteranceChunks.length > 0
                ? (currentChunkIdx + 1) / activeSection.utteranceChunks.length
                : 1)) /
              script.sections.length) *
              100
          )
        );

  return (
    <div
      data-testid={`${testIdPrefix}-container`}
      className="rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#111C35] to-[#0B132B] text-white border border-slate-800 p-4 sm:p-5 shadow-md space-y-4"
    >
      {/* Screen-reader live region for accessible status announcements */}
      <div className="sr-only" aria-live="polite" role="status">
        {status === 'playing'
          ? `Playing OpenShield audio report: ${activeSection.label} at ${speed}x speed`
          : status === 'paused'
          ? `Audio report paused at ${activeSection.label}`
          : status === 'completed'
          ? 'Finished reading OpenShield analysis report.'
          : status === 'unsupported' || status === 'error'
          ? errorMessage || 'Audio playback unavailable.'
          : 'Audio report ready to play.'}
      </div>

      {/* Top Row: Prominent "🔊 Listen to Results" CTA + Mode Selector (Summary vs Full Report) */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 min-w-0">
          <button
            type="button"
            data-testid={`${testIdPrefix}-listen-btn`}
            aria-label={controlAriaLabels.primaryListenBtn}
            aria-pressed={status === 'playing'}
            aria-expanded={isExpanded}
            onClick={handlePrimaryListenButton}
            className={`w-full sm:w-auto min-h-[46px] px-5 py-2.5 rounded-xl font-extrabold text-xs sm:text-sm cursor-pointer transition-all inline-flex items-center justify-center gap-2.5 shrink-0 shadow-sm ${
              status === 'playing'
                ? 'bg-emerald-400 hover:bg-emerald-300 text-slate-950 ring-2 ring-emerald-300/60'
                : status === 'paused'
                ? 'bg-amber-400 hover:bg-amber-300 text-slate-950'
                : 'bg-cyan-400 hover:bg-cyan-300 text-slate-950'
            }`}
          >
            <Volume2
              className={`w-4 h-4 shrink-0 ${status === 'playing' ? 'animate-pulse' : ''}`}
              aria-hidden="true"
            />
            <span>
              {status === 'playing'
                ? lang === 'hi'
                  ? 'परिणाम पढ़े जा रहे हैं... (रोकें)'
                  : 'Listening to Results (Pause)'
                : status === 'paused'
                ? lang === 'hi'
                  ? 'परिणाम सुनना जारी रखें'
                  : 'Resume Listening'
                : lang === 'hi'
                ? 'परिणाम सुनें (Listen to Results)'
                : 'Listen to Results'}
            </span>
          </button>

          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold text-white">
                {lang === 'hi'
                  ? 'AI ऑडियो ब्रीफिंग (Text-to-Speech)'
                  : 'AI Audio Briefing & Clause Reader'}
              </span>
              <span
                data-testid={`${testIdPrefix}-status-badge`}
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider shrink-0 ${
                  status === 'playing'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-400/40'
                    : status === 'paused'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-400/40'
                    : status === 'completed'
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40'
                    : status === 'unsupported' || status === 'error'
                    ? 'bg-red-500/20 text-red-300 border border-red-400/40'
                    : 'bg-slate-800 text-slate-300 border border-slate-700'
                }`}
              >
                {status === 'playing'
                  ? lang === 'hi'
                    ? 'चल रहा है'
                    : 'Speaking Now'
                  : status === 'paused'
                  ? lang === 'hi'
                    ? 'रुका हुआ'
                    : 'Paused'
                  : status === 'completed'
                  ? lang === 'hi'
                    ? 'पूर्ण'
                    : 'Completed'
                  : status === 'unsupported'
                  ? 'Unavailable'
                  : status === 'error'
                  ? 'Error'
                  : lang === 'hi'
                  ? 'तैयार'
                  : 'Ready'}
              </span>
            </div>
            <p className="text-[11px] text-slate-300 mt-0.5 leading-snug">
              {lang === 'hi'
                ? 'समग्र जोखिम, प्रमुख खतरनाक शर्तें, सरल अर्थ और एक्शन प्लान सुनें।'
                : 'Reads overall risk summary, high-risk clauses first, plain-English meaning, and recommended next steps.'}
            </p>
          </div>
        </div>

        {/* Summary vs. Listen to Full Report Toggle + Expand/Collapse */}
        <div className="flex flex-wrap items-center justify-between sm:justify-start gap-2 shrink-0">
          <div
            role="group"
            aria-label={controlAriaLabels.modeGroup}
            className="inline-flex items-center rounded-xl bg-slate-900/90 p-1 border border-slate-700/90 text-xs flex-1 sm:flex-initial"
          >
            <button
              type="button"
              data-testid={`${testIdPrefix}-mode-summary`}
              aria-label={controlAriaLabels.modeSummaryBtn}
              aria-pressed={mode === 'summary'}
              onClick={() => handleModeChange('summary')}
              className={`flex-1 sm:flex-initial min-h-[34px] px-3 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                mode === 'summary'
                  ? 'bg-cyan-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {lang === 'hi' ? 'संक्षिप्त सारांश' : 'Spoken Summary'}
            </button>
            <button
              type="button"
              data-testid={`${testIdPrefix}-mode-full`}
              aria-label={controlAriaLabels.modeFullBtn}
              aria-pressed={mode === 'full'}
              onClick={() => handleModeChange('full')}
              className={`flex-1 sm:flex-initial min-h-[34px] px-3 py-1 rounded-lg font-bold cursor-pointer transition-colors ${
                mode === 'full'
                  ? 'bg-cyan-400 text-slate-950'
                  : 'text-slate-300 hover:text-white'
              }`}
            >
              {lang === 'hi'
                ? `पूरी रिपोर्ट सुनें (${report.findings.length})`
                : `Listen to Full Report (${report.findings.length})`}
            </button>
          </div>

          <button
            type="button"
            data-testid={`${testIdPrefix}-toggle-controls-btn`}
            aria-label={controlAriaLabels.toggleControlsBtn}
            aria-expanded={isExpanded}
            aria-controls={`${testIdPrefix}-control-deck`}
            onClick={() => setIsExpanded((prev) => !prev)}
            className="min-h-[38px] px-3 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 cursor-pointer inline-flex items-center gap-1"
          >
            {isExpanded ? (
              <>
                <ChevronUp className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden md:inline">
                  {lang === 'hi' ? 'कंट्रोल छिपाएँ' : 'Hide Player'}
                </span>
              </>
            ) : (
              <>
                <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" />
                <span className="hidden md:inline">
                  {lang === 'hi' ? 'कंट्रोल दिखाएँ' : 'Player Controls'}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Unsupported or Error Banner (Requirement H: Graceful Fallback) */}
      {(status === 'unsupported' || status === 'error') && errorMessage && (
        <div
          data-testid={`${testIdPrefix}-fallback-alert`}
          role="alert"
          className="p-3.5 rounded-xl bg-red-950/70 border border-red-500/40 text-xs text-red-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
        >
          <div className="flex items-start gap-2.5">
            <VolumeX className="w-4 h-4 text-red-400 shrink-0 mt-0.5" aria-hidden="true" />
            <div>
              <div className="font-bold text-white">
                {lang === 'hi'
                  ? 'ऑडियो प्लेबैक उपलब्ध नहीं है'
                  : 'Audio Playback Unavailable on This Browser'}
              </div>
              <p className="text-red-200 mt-0.5">{errorMessage}</p>
            </div>
          </div>
          <button
            type="button"
            data-testid={`${testIdPrefix}-retry-btn`}
            aria-label={controlAriaLabels.retryBtn}
            onClick={() => startPlaybackFrom(currentSectionIdx, 0)}
            className="min-h-[38px] px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-100 text-slate-950 font-extrabold text-xs cursor-pointer inline-flex items-center justify-center gap-1.5 shrink-0 self-start sm:self-center"
          >
            <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
            <span>{lang === 'hi' ? 'पुनः प्रयास करें' : 'Retry Audio'}</span>
          </button>
        </div>
      )}

      {/* Expandable Playback Control Deck */}
      {isExpanded && (
        <div
          data-testid={`${testIdPrefix}-control-deck`}
          className="pt-3 border-t border-slate-800/90 space-y-3.5"
        >
          {/* Progress Bar + Current Section Indicator */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2 min-w-0">
                <span className="px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-mono font-bold text-[11px] shrink-0 tabular-nums">
                  {lang === 'hi'
                    ? `भाग ${currentSectionIdx + 1} / ${script.sections.length}`
                    : `Section ${currentSectionIdx + 1} of ${script.sections.length}`}
                </span>
                <span
                  data-testid={`${testIdPrefix}-current-section-label`}
                  className="font-bold text-white truncate"
                >
                  {activeSection.label}
                </span>
              </div>
              <span className="text-[11px] font-mono text-slate-300 tabular-nums shrink-0">
                {progressPercent}%
              </span>
            </div>

            <div
              role="progressbar"
              aria-label="Audio report playback progress"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={progressPercent}
              className="w-full h-2 rounded-full bg-slate-800 overflow-hidden"
            >
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400 transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>

            {/* Live Transcript Excerpt of Current Section */}
            <div
              data-testid={`${testIdPrefix}-live-transcript`}
              className="p-3 rounded-xl bg-slate-950/90 border border-slate-800/90 text-xs text-slate-200 leading-relaxed"
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-400 inline-flex items-center gap-1">
                  <Sparkles className="w-3 h-3" aria-hidden="true" />
                  <span>
                    {status === 'playing'
                      ? lang === 'hi'
                        ? 'अभी पढ़ा जा रहा अंश'
                        : 'Currently Reading Aloud'
                      : lang === 'hi'
                      ? 'चयनित ऑडियो अनुभाग'
                      : 'Selected Spoken Section Preview'}
                  </span>
                </span>
                <span className="text-[10px] font-semibold text-slate-400">
                  {lang === 'hi'
                    ? 'AI मूल्यांकन · कानूनी सलाह नहीं'
                    : 'AI Assessment · Not Legal Advice'}
                </span>
              </div>
              <p className="text-slate-100 line-clamp-3">
                {activeSection.utteranceChunks[currentChunkIdx] || activeSection.fullSpokenText}
              </p>
            </div>
          </div>

          {/* Primary Transport Controls: Skip Back, Play/Pause/Resume, Stop, Skip Forward, Replay, Speed */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              {/* Skip Backward */}
              <button
                type="button"
                data-testid={`${testIdPrefix}-prev-btn`}
                disabled={currentSectionIdx <= 0}
                aria-label={controlAriaLabels.prevBtn}
                onClick={handleSkipPrev}
                className="min-h-[42px] min-w-[42px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-xs font-bold text-white cursor-pointer inline-flex items-center justify-center gap-1"
              >
                <SkipBack className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">{lang === 'hi' ? 'पिछला' : 'Prev'}</span>
              </button>

              {/* Play / Pause / Resume */}
              {status === 'playing' ? (
                <button
                  type="button"
                  data-testid={`${testIdPrefix}-pause-btn`}
                  aria-label={controlAriaLabels.pauseBtn}
                  onClick={handlePause}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 font-extrabold text-xs cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <Pause className="w-4 h-4" aria-hidden="true" />
                  <span>{lang === 'hi' ? 'रोकें (Pause)' : 'Pause'}</span>
                </button>
              ) : status === 'paused' ? (
                <button
                  type="button"
                  data-testid={`${testIdPrefix}-resume-btn`}
                  aria-label={controlAriaLabels.resumeBtn}
                  onClick={handleResume}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-extrabold text-xs cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <Play className="w-4 h-4" aria-hidden="true" />
                  <span>{lang === 'hi' ? 'जारी रखें (Resume)' : 'Resume'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  data-testid={`${testIdPrefix}-play-btn`}
                  aria-label={controlAriaLabels.playBtn}
                  onClick={() => startPlaybackFrom(currentSectionIdx, 0)}
                  className="min-h-[42px] px-4 py-2 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-extrabold text-xs cursor-pointer inline-flex items-center justify-center gap-1.5"
                >
                  <Play className="w-4 h-4" aria-hidden="true" />
                  <span>{lang === 'hi' ? 'चलाएँ (Play)' : 'Play'}</span>
                </button>
              )}

              {/* Stop */}
              <button
                type="button"
                data-testid={`${testIdPrefix}-stop-btn`}
                disabled={status === 'idle' && currentSectionIdx === 0}
                aria-label={controlAriaLabels.stopBtn}
                onClick={handleStop}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-xs font-bold text-white cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <Square className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{lang === 'hi' ? 'बंद करें (Stop)' : 'Stop'}</span>
              </button>

              {/* Skip Forward */}
              <button
                type="button"
                data-testid={`${testIdPrefix}-next-btn`}
                disabled={currentSectionIdx >= script.sections.length - 1}
                aria-label={controlAriaLabels.nextBtn}
                onClick={handleSkipNext}
                className="min-h-[42px] min-w-[42px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 disabled:opacity-40 border border-slate-700 text-xs font-bold text-white cursor-pointer inline-flex items-center justify-center gap-1"
              >
                <span className="hidden sm:inline">{lang === 'hi' ? 'अगला' : 'Next'}</span>
                <SkipForward className="w-4 h-4" aria-hidden="true" />
              </button>

              {/* Replay from Start */}
              <button
                type="button"
                data-testid={`${testIdPrefix}-replay-btn`}
                aria-label={controlAriaLabels.replayBtn}
                onClick={handleReplay}
                className="min-h-[42px] px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" aria-hidden="true" />
                <span>{lang === 'hi' ? 'फिर से सुनें' : 'Replay'}</span>
              </button>
            </div>

            {/* Playback Speed Selector (0.75x, 1x, 1.25x, 1.5x, 2x) + Voice Settings Toggle */}
            <div className="flex flex-wrap items-center gap-2">
              <div
                role="group"
                aria-label={controlAriaLabels.speedGroup}
                className="inline-flex items-center rounded-xl bg-slate-900 p-1 border border-slate-700/90 text-xs"
              >
                {SUPPORTED_PLAYBACK_SPEEDS.map((spd) => (
                  <button
                    key={spd}
                    type="button"
                    data-testid={`${testIdPrefix}-speed-${spd}x`}
                    aria-label={getPlaybackSpeedAriaLabel(spd, speed, lang)}
                    aria-pressed={speed === spd}
                    onClick={() => handleSpeedChange(spd)}
                    className={`min-h-[34px] px-2.5 py-1 rounded-lg font-mono font-bold cursor-pointer transition-colors ${
                      speed === spd
                        ? 'bg-cyan-400 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    {spd}×
                  </button>
                ))}
              </div>

              <button
                type="button"
                data-testid={`${testIdPrefix}-voice-settings-toggle`}
                aria-label={controlAriaLabels.voiceSettingsToggleBtn}
                aria-expanded={showVoiceSettings}
                aria-pressed={showVoiceSettings}
                onClick={() => setShowVoiceSettings((prev) => !prev)}
                className="min-h-[42px] px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-slate-200 cursor-pointer inline-flex items-center gap-1.5"
              >
                <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" aria-hidden="true" />
                <span>{lang === 'hi' ? 'आवाज़' : 'Voice'}</span>
              </button>
            </div>
          </div>

          {/* Optional Voice & Auto-Scroll Settings Drawer */}
          {showVoiceSettings && (
            <div
              data-testid={`${testIdPrefix}-voice-settings-panel`}
              className="p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
            >
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 flex-1 min-w-0">
                <label
                  htmlFor={`${testIdPrefix}-voice-select`}
                  className="font-bold text-slate-200 shrink-0"
                >
                  {lang === 'hi' ? 'आवाज़ और भाषा चुनें:' : 'Voice & Language:'}
                </label>
                {availableVoices.length > 0 ? (
                  <select
                    id={`${testIdPrefix}-voice-select`}
                    data-testid={`${testIdPrefix}-voice-select`}
                    aria-label={controlAriaLabels.voiceSelect}
                    value={selectedVoiceURI}
                    onChange={(e) => handleVoiceChange(e.target.value)}
                    className="min-h-[38px] px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-slate-100 text-xs font-medium max-w-full sm:max-w-xs focus:outline-none focus:border-cyan-400"
                  >
                    {availableVoices.map((v) => (
                      <option key={v.voiceURI} value={v.voiceURI}>
                        {v.name} ({v.lang})
                      </option>
                    ))}
                  </select>
                ) : (
                  <span className="text-slate-400">
                    {lang === 'hi'
                      ? 'डिफ़ॉल्ट सिस्टम आवाज़ सक्रिय है'
                      : 'Using default system browser voice'}
                  </span>
                )}
              </div>

              <label className="inline-flex items-center gap-2 cursor-pointer text-slate-200 select-none shrink-0">
                <input
                  type="checkbox"
                  data-testid={`${testIdPrefix}-autoscroll-checkbox`}
                  aria-label={controlAriaLabels.autoScrollCheckbox}
                  checked={autoScrollEnabled}
                  onChange={(e) => setAutoScrollEnabled(e.target.checked)}
                  className="rounded border-slate-600 text-cyan-400 focus:ring-cyan-400"
                />
                <span>
                  {lang === 'hi'
                    ? 'पढ़े जा रहे निष्कर्ष को हाइलाइट और स्क्रॉल करें'
                    : 'Highlight & scroll to active finding'}
                </span>
              </label>
            </div>
          )}

          {/* Section Jump Pills: Quick navigation to Overview, Findings, Action Plan, and Limitations */}
          <div
            role="group"
            aria-label={
              lang === 'hi'
                ? 'ऑडियो रिपोर्ट अनुभाग नेविगेशन'
                : 'Audio report section navigation'
            }
            className="flex items-center gap-1.5 overflow-x-auto pb-1"
          >
            {script.sections.map((sec, idx) => {
              const isCurrent = idx === currentSectionIdx;
              return (
                <button
                  key={sec.id}
                  type="button"
                  data-testid={`${testIdPrefix}-section-pill-${idx}`}
                  aria-label={getSectionPillAriaLabel({
                    sectionIndex: idx,
                    totalSections: script.sections.length,
                    sectionLabel: sec.label,
                    isCurrent,
                    status,
                    lang,
                  })}
                  aria-current={isCurrent ? 'step' : undefined}
                  aria-pressed={isCurrent}
                  onClick={() => {
                    if (status === 'playing' || status === 'paused') {
                      startPlaybackFrom(idx, 0);
                    } else {
                      sectionIdxRef.current = idx;
                      chunkIdxRef.current = 0;
                      setCurrentSectionIdx(idx);
                      setCurrentChunkIdx(0);
                    }
                  }}
                  className={`min-h-[32px] px-3 py-1 rounded-lg text-[11px] font-bold whitespace-nowrap shrink-0 cursor-pointer transition-colors inline-flex items-center gap-1.5 border ${
                    isCurrent
                      ? 'bg-cyan-400/20 text-cyan-300 border-cyan-400/60'
                      : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-slate-200'
                  }`}
                >
                  <span className="font-mono">{idx + 1}.</span>
                  <span className="max-w-[180px] truncate">
                    {sec.kind === 'overview'
                      ? lang === 'hi'
                        ? 'सारांश'
                        : 'Risk Summary'
                      : sec.kind === 'finding'
                      ? `${sec.badgeText}`
                      : sec.kind === 'action-plan'
                      ? lang === 'hi'
                        ? 'एक्शन प्लान'
                        : 'Action Plan'
                      : lang === 'hi'
                      ? 'सीमाएँ'
                      : 'Disclaimer'}
                  </span>
                  {isCurrent && status === 'playing' && (
                    <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" aria-hidden="true" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
