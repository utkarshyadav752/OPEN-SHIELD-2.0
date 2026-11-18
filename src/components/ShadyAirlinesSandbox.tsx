import React, { useState, useEffect, useMemo } from 'react';
import {
  Shield,
  ShieldAlert,
  ShieldCheck,
  Zap,
  RotateCcw,
  ExternalLink,
  Plane,
  AlertTriangle,
  Eye,
  Lock,
  CheckCircle2,
  Sliders,
  Sparkles
} from 'lucide-react';
import {
  runOpenShieldAudit,
  type ScanInputSnapshot,
  type SafetyGrade
} from '../engine/openshieldEngine';

export type SandboxScenarioId = 'shadyairlines' | 'streamtrap' | 'cleanbooks';

interface SandboxProps {
  onSelectRuleTab?: () => void;
}

export const ShadyAirlinesSandbox: React.FC<SandboxProps> = ({ onSelectRuleTab }) => {
  const [scenario, setScenario] = useState<SandboxScenarioId>('shadyairlines');
  const [inspectorEnabled, setInspectorEnabled] = useState<boolean>(true);
  const [isNeutralized, setIsNeutralized] = useState<boolean>(false);
  const [fixedCount, setFixedCount] = useState<number>(0);

  // ShadyAirlines Interactive State
  const [baggageChecked, setBaggageChecked] = useState<boolean>(true);
  const [clubChecked, setClubChecked] = useState<boolean>(true);
  const [secondsRemaining, setSecondsRemaining] = useState<number>(299); // 00:04:59
  const [liveViewers, setLiveViewers] = useState<number>(38);
  const [injectedPopupActive, setInjectedPopupActive] = useState<boolean>(false);
  const [checkoutNotice, setCheckoutNotice] = useState<string | null>(null);

  // Tick the fake countdown timer unless neutralized
  useEffect(() => {
    if (isNeutralized || scenario === 'cleanbooks') return;
    const timer = window.setInterval(() => {
      setSecondsRemaining((prev) => (prev <= 12 ? 299 : prev - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isNeutralized, scenario]);

  const formattedTimer = useMemo(() => {
    const mins = Math.floor(secondsRemaining / 60);
    const secs = secondsRemaining % 60;
    return `00:0${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }, [secondsRemaining]);

  const handleSelectScenario = (nextScenario: SandboxScenarioId) => {
    setScenario(nextScenario);
    setIsNeutralized(false);
    setFixedCount(0);
    setCheckoutNotice(null);
    setInjectedPopupActive(false);
    if (nextScenario === 'shadyairlines') {
      setBaggageChecked(true);
      setClubChecked(true);
      setSecondsRemaining(299);
      setLiveViewers(38);
    } else if (nextScenario === 'streamtrap') {
      setBaggageChecked(true);
      setClubChecked(false);
      setSecondsRemaining(179);
    } else {
      setBaggageChecked(false);
      setClubChecked(false);
    }
  };

  // Build live DOM snapshot for the OpenShield audit engine
  const currentSnapshot: ScanInputSnapshot = useMemo(() => {
    if (scenario === 'cleanbooks') {
      return {
        domain: 'cleanbooks.example',
        pageTitle: 'CleanBooks Coop — Transparent Checkout',
        textBlocks: [
          'Standard price guaranteed for 24 hours. No hidden booking or service fees.',
          'Continue with standard checkout'
        ],
        checkboxes: [
          {
            id: 'cb-gift',
            label: 'Add optional ₹150 gift wrap (Unchecked by default)',
            checked: baggageChecked,
            costInr: 150
          }
        ],
        buttons: [
          {
            id: 'btn-primary',
            text: 'Complete Order (₹1,299)',
            role: 'primary',
            fontSizePx: 15,
            widthPx: 260,
            heightPx: 44,
            contrastRatio: 7.5
          },
          {
            id: 'btn-secondary',
            text: 'Cancel & Return to Cart',
            role: 'opt_out',
            fontSizePx: 15,
            widthPx: 260,
            heightPx: 44,
            contrastRatio: 6.8
          }
        ],
        tosText:
          'You may cancel or request a full refund within 30 days. We never sell your personal data to third parties or require forced arbitration.'
      };
    }

    if (scenario === 'streamtrap') {
      return {
        domain: 'streamtrap.example',
        pageTitle: 'StreamTrap Plus — 7-Day Trial Activation',
        textBlocks: isNeutralized
          ? ['Standard monthly plan selection']
          : [
              `🔥 Hurry! Offer expires in ${formattedTimer} — 24 people are viewing this plan!`,
              'No thanks, I hate saving money and prefer SD quality'
            ],
        checkboxes: [
          {
            id: 'cb-ultra-addon',
            label: 'Auto-enroll me in Sports 4K Pack for ₹799/month after 7 days',
            checked: baggageChecked,
            costInr: 799
          }
        ],
        buttons: [
          {
            id: 'btn-stream-accept',
            text: 'START VIP TRIAL & AUTO-RENEW',
            role: 'primary',
            fontSizePx: 18,
            widthPx: 580,
            heightPx: 52,
            contrastRatio: 7.4
          },
          {
            id: 'btn-stream-decline',
            text: 'No thanks, I hate saving money',
            role: 'opt_out',
            fontSizePx: isNeutralized ? 15 : 10,
            widthPx: isNeutralized ? 580 : 220,
            heightPx: isNeutralized ? 44 : 14,
            contrastRatio: isNeutralized ? 7.0 : 1.7
          }
        ],
        tosText:
          'Your subscription will auto-renew automatically at ₹1,499/month. All charges are non-refundable under any circumstances. We may modify these terms at any time without notice.'
      };
    }

    // Default: ShadyAirlines — Final Checkout (exact prompt specification)
    const textBlocks: string[] = [];
    if (!isNeutralized) {
      textBlocks.push(
        `🔥 Hurry! Offer expires in ${formattedTimer} — ${liveViewers} people are viewing this flight right now!`,
        'Only 1 left in stock at this price (₹42,999)!',
        'No thanks, I prefer to pay full price and risk losing my luggage'
      );
      if (injectedPopupActive) {
        textBlocks.push('Last chance to book! 14 people bought this in the last hour!');
      }
    }

    return {
      domain: 'shadyairlines.example',
      pageTitle: 'ShadyAirlines — Final Checkout',
      textBlocks,
      checkboxes: [
        {
          id: 'cb-baggage',
          label: 'Add ₹2,499 VIP Baggage Protection (Recommended)',
          checked: baggageChecked,
          costInr: 2499
        },
        {
          id: 'cb-club',
          label: 'Auto-enroll me in ShadyClub Gold for ₹999/month after 7 days',
          checked: clubChecked,
          costInr: 999
        }
      ],
      buttons: [
        {
          id: 'btn-accept',
          text: 'YES! Protect My Trip & Pay Now',
          role: 'primary',
          fontSizePx: 18,
          widthPx: 620,
          heightPx: 54,
          contrastRatio: 7.4
        },
        {
          id: 'btn-decline',
          text: 'No thanks, I prefer to pay full price and risk losing my luggage',
          role: 'opt_out',
          fontSizePx: isNeutralized ? 15 : 10,
          widthPx: isNeutralized ? 620 : 320,
          heightPx: isNeutralized ? 44 : 14,
          contrastRatio: isNeutralized ? 7.2 : 1.6
        }
      ],
      tosText:
        'By clicking pay, your membership will auto-renew automatically each month. All bookings are strictly non-refundable under any circumstances. You agree to binding arbitration and waive class action rights. We may sell third-party marketing partners your location and browsing history, and grant us an irrevocable, perpetual license to your travel photos.'
    };
  }, [
    scenario,
    isNeutralized,
    baggageChecked,
    clubChecked,
    formattedTimer,
    liveViewers,
    injectedPopupActive
  ]);

  const report = useMemo(() => runOpenShieldAudit(currentSnapshot), [currentSnapshot]);

  // Execute Module 4: Active Neutralizer ("Fix This Page")
  const handleNeutralizeAll = () => {
    let count = 0;
    if (baggageChecked) count++;
    if (clubChecked) count++;
    if (!isNeutralized && scenario !== 'cleanbooks') {
      count += scenario === 'shadyairlines' ? 3 : 2; // Urgency banners + Confirm-shaming link
      if (injectedPopupActive) count++;
    }
    setBaggageChecked(false);
    setClubChecked(false);
    setInjectedPopupActive(false);
    setIsNeutralized(true);
    setFixedCount(count || 5);
    setCheckoutNotice(
      'OpenShield neutralized all deceptive UI traps: 2 pre-ticked add-ons unchecked (₹3,498 saved), confirm-shaming link equalized into a high-contrast button, and fake countdown timers frozen.'
    );
  };

  const handleResetSandbox = () => {
    handleSelectScenario(scenario);
  };

  const handleInjectDynamicMutation = () => {
    setIsNeutralized(false);
    setInjectedPopupActive(true);
    setLiveViewers((v) => v + 9);
  };

  const baseFare = scenario === 'shadyairlines' ? 42999 : scenario === 'streamtrap' ? 0 : 1299;
  const baggageCost = baggageChecked ? (scenario === 'shadyairlines' ? 2499 : scenario === 'streamtrap' ? 799 : 150) : 0;
  const clubCost = clubChecked && scenario === 'shadyairlines' ? 999 : 0;
  const totalCheckoutInr = baseFare + baggageCost + clubCost;

  const gradeBadgeStyle = (grade: SafetyGrade) => {
    switch (grade) {
      case 'A':
        return 'bg-emerald-500 text-slate-950';
      case 'B':
        return 'bg-sky-500 text-slate-950';
      case 'C':
        return 'bg-amber-500 text-slate-950';
      case 'D':
        return 'bg-orange-500 text-white';
      default:
        return 'bg-red-500 text-white';
    }
  };

  return (
    <section aria-label="Interactive Judge Sandbox" className="w-full">
      {/* Sandbox Scenario & Mutation Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-5 p-3.5 rounded-xl bg-slate-900/90 border border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold text-slate-400 mr-1 whitespace-nowrap">
            Target Webpage:
          </span>
          <button
            type="button"
            onClick={() => handleSelectScenario('shadyairlines')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              scenario === 'shadyairlines'
                ? 'bg-sky-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            ✈️ ShadyAirlines Checkout (Grade F)
          </button>
          <button
            type="button"
            onClick={() => handleSelectScenario('streamtrap')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              scenario === 'streamtrap'
                ? 'bg-sky-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            🎬 StreamTrap Trial (Grade D)
          </button>
          <button
            type="button"
            onClick={() => handleSelectScenario('cleanbooks')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
              scenario === 'cleanbooks'
                ? 'bg-emerald-500 text-slate-950'
                : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            📘 CleanBooks Ethical Store (Grade A)
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {scenario === 'shadyairlines' && (
            <button
              type="button"
              onClick={handleInjectDynamicMutation}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30 hover:bg-amber-500/25 transition-colors whitespace-nowrap shrink-0"
            >
              + Simulate Dynamic DOM Injection (MutationObserver)
            </button>
          )}
          <button
            type="button"
            onClick={() => setInspectorEnabled((v) => !v)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors whitespace-nowrap shrink-0 ${
              inspectorEnabled
                ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40'
                : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {inspectorEnabled ? '🛡️ OpenShield Overlays: ON' : '🛡️ OpenShield Overlays: OFF'}
          </button>
          <button
            type="button"
            onClick={handleResetSandbox}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition-colors whitespace-nowrap shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Page
          </button>
        </div>
      </div>

      {/* Main 2-Column Split: Left = Simulated Webpage with content.js + styles.css | Right = Extension Popup (popup.html) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN (7 cols): Live Webpage Viewport */}
        <div className="lg:col-span-7 rounded-xl border border-slate-800 bg-slate-900 overflow-hidden">
          {/* Simulated Browser Chrome Bar */}
          <div className="flex items-center justify-between gap-3 px-4 py-2.5 bg-slate-950 border-b border-slate-800 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <span className="font-mono text-slate-300 truncate">
                https://{currentSnapshot.domain}/final-checkout
              </span>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <span className="text-slate-400 hidden sm:inline">
                MutationObserver: Active
              </span>
              <span className="font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-sky-400">
                Grade {report.grade}
              </span>
            </div>
          </div>

          {/* Webpage Body Surface (Light surface matching ShadyAirlines checkout) */}
          <div className="p-5 sm:p-7 bg-[#f8fafc] text-[#1e293b] relative">
            <div className="bg-white p-5 sm:p-6 rounded-xl border border-slate-200 shadow-sm relative">
              {scenario === 'shadyairlines' && (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                    <h2 className="text-xl font-extrabold text-slate-900 flex items-center gap-2">
                      <Plane className="w-5 h-5 text-sky-600 shrink-0" />
                      <span>ShadyAirlines Checkout: New Delhi → London</span>
                    </h2>
                    <span className="text-sm font-extrabold text-slate-800 tabular-nums bg-slate-100 px-3 py-1 rounded-md border border-slate-200">
                      Total: ₹{totalCheckoutInr.toLocaleString('en-IN')}
                    </span>
                  </div>

                  {/* Fake Urgency & Viewer Banner */}
                  <div
                    className={`p-3 rounded-lg bg-red-50 text-red-700 font-bold text-sm mb-3 ${
                      inspectorEnabled && !isNeutralized ? 'openshield-flagged-urgency' : ''
                    }`}
                    style={
                      isNeutralized
                        ? { textDecoration: 'line-through', opacity: 0.55 }
                        : undefined
                    }
                  >
                    <span>
                      🔥 Hurry! Offer expires in{' '}
                      <span className="font-mono tabular-nums">{formattedTimer}</span> —{' '}
                      <span className="tabular-nums">{liveViewers}</span> people are viewing
                      this flight right now!
                    </span>
                    {inspectorEnabled && !isNeutralized && (
                      <span className="inline-block bg-slate-900 text-slate-50 text-[11px] font-bold px-2 py-0.5 rounded ml-2 border-l-4 border-orange-500">
                        ⏳ High-Pressure Scarcity / Timer
                      </span>
                    )}
                    {isNeutralized && (
                      <span className="inline-block bg-blue-600 text-white text-[11px] font-bold px-2 py-0.5 rounded ml-2">
                        ❄️ Timer Frozen by OpenShield
                      </span>
                    )}
                  </div>

                  {/* Fake Scarcity Stock Line */}
                  <div
                    className={`p-2 rounded-lg text-sm mb-4 ${
                      inspectorEnabled && !isNeutralized ? 'openshield-flagged-urgency' : ''
                    }`}
                    style={
                      isNeutralized
                        ? { textDecoration: 'line-through', opacity: 0.55 }
                        : undefined
                    }
                  >
                    <strong>Only 1 left in stock at this price (₹42,999)!</strong>
                    {inspectorEnabled && !isNeutralized && (
                      <span className="inline-block bg-slate-900 text-slate-50 text-[11px] font-bold px-2 py-0.5 rounded ml-2 border-l-4 border-amber-500">
                        ⏳ High-Pressure Scarcity / Timer
                      </span>
                    )}
                  </div>

                  {/* Dynamically Injected MutationObserver Popup */}
                  {injectedPopupActive && !isNeutralized && (
                    <div
                      className={`p-3 rounded-lg bg-amber-50 text-amber-900 font-semibold text-xs mb-4 ${
                        inspectorEnabled ? 'openshield-flagged-urgency' : ''
                      }`}
                    >
                      ⚡ <strong>LIVE DOM INJECTION:</strong> Last chance to book! 14 people
                      bought this in the last hour!
                      {inspectorEnabled && (
                        <span className="inline-block bg-slate-900 text-slate-50 text-[11px] font-bold px-2 py-0.5 rounded ml-2 border-l-4 border-orange-500">
                          🔍 Caught by MutationObserver
                        </span>
                      )}
                    </div>
                  )}

                  <hr className="my-4 border-slate-200" />

                  {/* Pre-Checked Sneaky Checkboxes */}
                  <div className="space-y-3">
                    <div
                      className={`rounded-lg transition-all ${
                        inspectorEnabled && baggageChecked ? 'openshield-flagged-sneaky' : 'p-1.5'
                      }`}
                    >
                      <label className="flex items-center gap-2.5 text-sm font-medium text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={baggageChecked}
                          onChange={(e) => setBaggageChecked(e.target.checked)}
                          className="w-4 h-4 rounded accent-red-600"
                        />
                        <span>Add ₹2,499 VIP Baggage Protection (Recommended)</span>
                        {inspectorEnabled && baggageChecked && (
                          <span className="inline-block bg-slate-900 text-slate-50 text-[11px] font-bold px-2 py-0.5 rounded border-l-4 border-red-500">
                            ⚠️ Sneaky Pre-Checked Box
                          </span>
                        )}
                      </label>
                    </div>

                    <div
                      className={`rounded-lg transition-all ${
                        inspectorEnabled && clubChecked ? 'openshield-flagged-sneaky' : 'p-1.5'
                      }`}
                    >
                      <label className="flex items-center gap-2.5 text-sm font-medium text-slate-800 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={clubChecked}
                          onChange={(e) => setClubChecked(e.target.checked)}
                          className="w-4 h-4 rounded accent-red-600"
                        />
                        <span>
                          Auto-enroll me in ShadyClub Gold for ₹999/month after 7 days
                        </span>
                        {inspectorEnabled && clubChecked && (
                          <span className="inline-block bg-slate-900 text-slate-50 text-[11px] font-bold px-2 py-0.5 rounded border-l-4 border-red-500">
                            ⚠️ Sneaky Pre-Checked Box
                          </span>
                        )}
                      </label>
                    </div>
                  </div>

                  {/* Primary CTA vs Confirm-Shaming / Low-Contrast Opt-Out */}
                  <div className="mt-6">
                    <button
                      type="button"
                      onClick={() =>
                        setCheckoutNotice(
                          baggageChecked || clubChecked
                            ? `⚠️ Warning: This button would have charged you ₹${totalCheckoutInr.toLocaleString('en-IN')} including ₹${(baggageCost + clubCost).toLocaleString('en-IN')} in sneaky pre-checked add-ons! Click "Neutralize All Dark Patterns" first.`
                            : `✅ Clean Fare Paid: ₹${totalCheckoutInr.toLocaleString('en-IN')} with zero sneaky add-ons.`
                        )
                      }
                      className="w-full py-4 px-6 bg-green-600 hover:bg-green-700 text-white font-extrabold text-base sm:text-lg rounded-lg cursor-pointer transition-colors"
                    >
                      YES! Protect My Trip &amp; Pay Now (₹{totalCheckoutInr.toLocaleString('en-IN')})
                    </button>

                    <div className="mt-2.5 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          setCheckoutNotice(
                            '✅ You selected the standard fare (₹42,999) without extra upsells.'
                          )
                        }
                        className={
                          isNeutralized
                            ? 'openshield-equalized-btn'
                            : `inline-block text-center text-[11px] text-slate-400 hover:text-slate-600 cursor-pointer ${
                                inspectorEnabled ? 'openshield-flagged-shaming' : ''
                              }`
                        }
                      >
                        <span>
                          No thanks, I prefer to pay full price and risk losing my luggage
                        </span>
                        {inspectorEnabled && !isNeutralized && (
                          <span className="inline-block bg-slate-900 text-slate-50 text-[11px] font-bold px-2 py-0.5 rounded ml-2 border-l-4 border-purple-500">
                            🎭 Confirm-Shaming + 7.5x Visual Asymmetry
                          </span>
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Predatory Terms of Service Summary Box */}
                  <div className="mt-5 p-3.5 rounded-lg bg-slate-100 border border-slate-200 text-xs text-slate-600 leading-relaxed">
                    <strong className="text-slate-800">Terms of Service Summary:</strong> By
                    clicking pay, your membership will{' '}
                    <span className={inspectorEnabled ? 'openshield-flagged-tos' : ''}>
                      auto-renew automatically
                    </span>{' '}
                    each month. All bookings are{' '}
                    <span className={inspectorEnabled ? 'openshield-flagged-tos' : ''}>
                      strictly non-refundable under any circumstances
                    </span>
                    . You agree to{' '}
                    <span className={inspectorEnabled ? 'openshield-flagged-tos' : ''}>
                      binding arbitration and waive class action
                    </span>{' '}
                    rights. We may{' '}
                    <span className={inspectorEnabled ? 'openshield-flagged-tos' : ''}>
                      sell third-party marketing partners
                    </span>{' '}
                    your location and browsing history, and grant us an{' '}
                    <span className={inspectorEnabled ? 'openshield-flagged-tos' : ''}>
                      irrevocable, perpetual license
                    </span>{' '}
                    to your travel photos.
                    {inspectorEnabled && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {report.tosRisks.map((risk) => (
                          <span
                            key={risk}
                            className="inline-block bg-slate-900 text-slate-50 text-[10px] font-bold px-2 py-0.5 rounded border-l-4 border-red-600"
                          >
                            📜 ToS Trap: {risk}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}

              {scenario === 'streamtrap' && (
                <>
                  <h2 className="text-xl font-extrabold text-slate-900 mb-3">
                    🎬 StreamTrap Plus — Start 7-Day Trial
                  </h2>
                  <div
                    className={`p-3 rounded-lg bg-red-50 text-red-700 font-bold text-sm mb-4 ${
                      inspectorEnabled && !isNeutralized ? 'openshield-flagged-urgency' : ''
                    }`}
                  >
                    🔥 Hurry! Offer expires in {formattedTimer} — 24 people are viewing this plan!
                  </div>
                  <div
                    className={`rounded-lg mb-4 ${
                      inspectorEnabled && baggageChecked ? 'openshield-flagged-sneaky' : 'p-1.5'
                    }`}
                  >
                    <label className="flex items-center gap-2.5 text-sm font-medium text-slate-800 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={baggageChecked}
                        onChange={(e) => setBaggageChecked(e.target.checked)}
                        className="w-4 h-4 rounded accent-red-600"
                      />
                      <span>Auto-enroll me in Sports 4K Pack for ₹799/month after 7 days</span>
                    </label>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setCheckoutNotice('StreamTrap trial inspected by OpenShield.')
                    }
                    className="w-full py-3.5 px-6 bg-green-600 text-white font-extrabold rounded-lg cursor-pointer"
                  >
                    START VIP TRIAL &amp; AUTO-RENEW
                  </button>
                  <div className="mt-2 text-center">
                    <button
                      type="button"
                      className={
                        isNeutralized
                          ? 'openshield-equalized-btn'
                          : `text-[11px] text-slate-400 ${
                              inspectorEnabled ? 'openshield-flagged-shaming' : ''
                            }`
                      }
                    >
                      No thanks, I hate saving money and prefer SD quality
                    </button>
                  </div>
                  <div className="mt-4 p-3 rounded-lg bg-slate-100 text-xs text-slate-600">
                    <strong>Terms:</strong> Your subscription will{' '}
                    <span className={inspectorEnabled ? 'openshield-flagged-tos' : ''}>
                      auto-renew automatically
                    </span>{' '}
                    at ₹1,499/month. All charges are{' '}
                    <span className={inspectorEnabled ? 'openshield-flagged-tos' : ''}>
                      non-refundable under any circumstances
                    </span>
                    . We may{' '}
                    <span className={inspectorEnabled ? 'openshield-flagged-tos' : ''}>
                      modify these terms at any time without notice
                    </span>
                    .
                  </div>
                </>
              )}

              {scenario === 'cleanbooks' && (
                <>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-xl font-extrabold text-slate-900">
                      📘 CleanBooks Coop — Ethical Checkout
                    </h2>
                    <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded">
                      ToS;DR Class A Verified
                    </span>
                  </div>
                  <p className="text-sm text-slate-600 mb-4">
                    Standard price (₹1,299) guaranteed for 24 hours. Zero drip-pricing fees or
                    artificial countdown timers.
                  </p>
                  <div className="p-2.5 rounded-lg border border-slate-200 mb-4">
                    <label className="flex items-center gap-2.5 text-sm text-slate-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={baggageChecked}
                        onChange={(e) => setBaggageChecked(e.target.checked)}
                        className="w-4 h-4 rounded"
                      />
                      <span>Add optional ₹150 gift wrap (Unchecked by default)</span>
                    </label>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        setCheckoutNotice('✅ Clean order completed for ₹1,299.')
                      }
                      className="py-3 px-4 bg-slate-900 text-white font-semibold text-sm rounded-lg cursor-pointer"
                    >
                      Complete Order (₹{totalCheckoutInr.toLocaleString('en-IN')})
                    </button>
                    <button
                      type="button"
                      onClick={() => setCheckoutNotice('Returned to cart with 1 click.')}
                      className="py-3 px-4 bg-slate-100 text-slate-800 border border-slate-300 font-semibold text-sm rounded-lg cursor-pointer"
                    >
                      Cancel &amp; Return to Cart
                    </button>
                  </div>
                  <div className="mt-4 p-3 rounded-lg bg-emerald-50/70 border border-emerald-200 text-xs text-slate-700">
                    <strong>Plain-Language Terms:</strong> Full refund within 30 days. Zero
                    third-party data sharing. Cancel anytime in 1 click.
                  </div>
                </>
              )}

              {/* Checkout Action Feedback Banner */}
              {checkoutNotice && (
                <div className="mt-4 p-3 rounded-lg bg-slate-900 text-slate-100 text-xs font-medium flex items-center justify-between gap-3">
                  <span>{checkoutNotice}</span>
                  <button
                    type="button"
                    onClick={() => setCheckoutNotice(null)}
                    className="text-slate-400 hover:text-white font-bold shrink-0"
                  >
                    Dismiss
                  </button>
                </div>
              )}
            </div>

            {/* Injected Bottom-Right Floating HUD (#openshield-floating-hud mirror) */}
            {inspectorEnabled && (report.totalIssues > 0 || isNeutralized) && (
              <div
                data-testid="floating-hud"
                className="mt-4 sm:mt-5 flex flex-wrap items-center justify-between gap-3 px-4 py-3 rounded-xl bg-slate-950 text-slate-100 border border-slate-700 shadow-lg"
              >
                <div className="text-xs">
                  <strong className={isNeutralized ? 'text-emerald-400' : 'text-red-400'}>
                    🛡️ OpenShield HUD — Grade: {report.grade}
                  </strong>
                  <span className="block text-slate-300 mt-0.5">
                    {isNeutralized
                      ? `✅ Neutralized (${fixedCount} deceptive UI elements fixed, ₹3,498 saved)`
                      : `${report.totalIssues} deceptive patterns & ToS traps detected on this page`}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleNeutralizeAll}
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                    isNeutralized
                      ? 'bg-blue-600 text-white'
                      : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                  }`}
                >
                  {isNeutralized
                    ? `✅ Neutralized (${fixedCount} Fixed)`
                    : '⚡ Neutralize All'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* RIGHT COLUMN (5 cols): Simulated Extension Popup (popup.html + popup.js) */}
        <aside
          aria-label="OpenShield Browser Extension Popup"
          className="lg:col-span-5 rounded-xl border border-slate-800 bg-[#0f172a] p-5 shadow-xl"
        >
          {/* Popup Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3.5 mb-4">
            <div>
              <div className="text-base font-extrabold text-sky-400 flex items-center gap-2">
                <Shield className="w-4 h-4 text-sky-400" />
                OpenShield Extension Popup
              </div>
              <div className="text-xs text-slate-400 mt-0.5">
                100% Local DOM &amp; ToS Auditor • Zero Cloud Tracking
              </div>
            </div>
            <div
              data-testid="popup-grade-badge"
              className={`text-xl font-black px-3.5 py-1.5 rounded-lg font-mono ${gradeBadgeStyle(
                report.grade
              )}`}
            >
              {report.grade}
            </div>
          </div>

          {/* 4-Card Counter Grid (Mirrors popup.html) */}
          <div className="grid grid-cols-2 gap-2.5 mb-4">
            <div className="bg-slate-800/90 border border-slate-700/70 p-3 rounded-lg">
              <strong
                data-testid="urgency-count"
                className="block text-xl font-bold font-mono tabular-nums text-red-400"
              >
                {report.urgencyCount}
              </strong>
              <span className="text-xs text-slate-300">⏳ Fake Urgency &amp; Scarcity</span>
            </div>
            <div className="bg-slate-800/90 border border-slate-700/70 p-3 rounded-lg">
              <strong
                data-testid="sneaky-count"
                className="block text-xl font-bold font-mono tabular-nums text-red-400"
              >
                {report.sneakyCount}
              </strong>
              <span className="text-xs text-slate-300">☑️ Sneaky Boxes</span>
            </div>
            <div className="bg-slate-800/90 border border-slate-700/70 p-3 rounded-lg">
              <strong
                data-testid="shaming-count"
                className="block text-xl font-bold font-mono tabular-nums text-red-400"
              >
                {report.shamingCount}
              </strong>
              <span className="text-xs text-slate-300">🎭 Guilt-Trip UI</span>
            </div>
            <div className="bg-slate-800/90 border border-slate-700/70 p-3 rounded-lg">
              <strong
                data-testid="tos-count"
                className="block text-xl font-bold font-mono tabular-nums text-red-400"
              >
                {report.tosRisks.length}
              </strong>
              <span className="text-xs text-slate-300">📜 ToS Red Flags</span>
            </div>
          </div>

          {/* JustDeleteMe Roach Motel / Account Cancellation Card */}
          {report.roachMotel && (
            <div className="mb-4 p-3.5 rounded-lg bg-slate-900 border border-slate-800 text-xs">
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <span className="font-bold text-slate-200">
                  🪳 Roach Motel / Cancellation Difficulty
                </span>
                <span
                  className={`font-mono font-bold uppercase px-2 py-0.5 rounded text-[10px] ${
                    report.roachMotel.difficulty === 'easy'
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      : report.roachMotel.difficulty === 'medium'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-red-950 text-red-300 border border-red-800'
                  }`}
                >
                  {report.roachMotel.difficulty}
                </span>
              </div>
              <p className="text-slate-400 leading-relaxed mb-2">
                {report.roachMotel.notes}
              </p>
              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800/80">
                <span className="text-slate-400">Source: JustDeleteMe (sites.json)</span>
                <a
                  href="#rules"
                  onClick={(e) => {
                    if (onSelectRuleTab) {
                      e.preventDefault();
                      onSelectRuleTab();
                    }
                  }}
                  className="text-sky-400 hover:text-sky-300 font-semibold inline-flex items-center gap-1"
                >
                  Direct Unsubscribe Link
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* Consent-O-Matic ComputedStyle Asymmetry Meter */}
          <div className="mb-4 p-3 rounded-lg bg-slate-900/70 border border-slate-800 text-xs">
            <div className="flex items-center justify-between text-slate-300 font-semibold mb-1">
              <span>Consent-O-Matic ComputedStyle Audit</span>
              <span className="font-mono text-sky-400">
                {report.visualInterferenceCount > 0 ? 'MISDIRECTION FLAGGED' : 'BALANCED UI'}
              </span>
            </div>
            <div className="text-slate-400 text-[11px]">
              {report.visualInterferenceCount > 0
                ? 'Primary CTA button is 7.4x larger than the 10px low-contrast (#cbd5e1) opt-out link.'
                : 'Primary and secondary actions have equalized contrast and accessible touch targets.'}
            </div>
          </div>

          {/* Predatory ToS & Dark Pattern Logs */}
          <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
            Predatory ToS &amp; Dark Pattern Logs ({report.findings.length})
          </div>
          <ul
            data-testid="findings-list"
            className="space-y-1.5 max-h-44 overflow-y-auto pr-1 text-xs text-slate-200 mb-4"
          >
            {report.findings.length === 0 ? (
              <li className="p-2.5 rounded bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 font-medium">
                ✅ Clean page! Zero dark patterns or predatory ToS clauses detected.
              </li>
            ) : (
              report.findings.map((item) => (
                <li
                  key={item.id}
                  className="p-2 rounded bg-slate-900 border border-slate-800 flex items-start justify-between gap-2"
                >
                  <span className="leading-snug">{item.title}</span>
                  <span className="font-mono text-[10px] text-slate-400 shrink-0">
                    {item.ruleId}
                  </span>
                </li>
              ))
            )}
          </ul>

          {/* 1-Click Active Neutralizer CTA */}
          <button
            type="button"
            data-testid="neutralize-btn"
            onClick={handleNeutralizeAll}
            className={`w-full py-3 px-4 rounded-lg font-bold text-sm cursor-pointer transition-colors ${
              isNeutralized
                ? 'bg-blue-600 hover:bg-blue-500 text-white'
                : 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
            }`}
          >
            {isNeutralized
              ? `✅ Fixed ${fixedCount} Deceptive Elements (₹3,498 Saved!)`
              : '⚡ Neutralize All Dark Patterns'}
          </button>

          <div className="mt-3 text-center text-[11px] text-slate-400">
            Open-Source Consumer Defense • Manifest V3 Ready
          </div>
        </aside>
      </div>
    </section>
  );
};
