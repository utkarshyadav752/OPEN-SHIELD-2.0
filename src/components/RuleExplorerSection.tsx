import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  FileText,
  ExternalLink,
  Check,
  AlertOctagon,
  BookOpen,
  Scale
} from 'lucide-react';
import {
  TAXONOMY_SIGNATURES,
  TOS_RED_FLAG_RULES,
  JUST_DELETE_ME_DATABASE,
  runOpenShieldAudit,
  type PatternTaxonomyId,
  type RoachDifficulty
} from '../engine/openshieldEngine';

type CategoryFilter = 'all' | PatternTaxonomyId | 'tos';

export const RuleExplorerSection: React.FC = () => {
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [jdmFilter, setJdmFilter] = useState<'all' | RoachDifficulty>('all');

  // Custom Live Clause Analyzer state
  const [customInputText, setCustomInputText] = useState<string>(
    'Hurry! Offer expires in 00:03:15 — 29 people are viewing this right now! Only 2 left in stock. By continuing, your membership will auto-renew automatically each month and is strictly non-refundable under any circumstances. You agree to binding arbitration and waive class action rights. No thanks, I prefer to pay full price.'
  );

  const customAuditReport = useMemo(() => {
    const lines = customInputText
      .split(/\n|(?<=[.!])\s+/)
      .map((s) => s.trim())
      .filter(Boolean);

    return runOpenShieldAudit({
      domain: 'custom-inspector.local',
      pageTitle: 'Live Clause Sandbox',
      textBlocks: lines,
      checkboxes: [],
      buttons: [],
      tosText: customInputText
    });
  }, [customInputText]);

  const filteredSignatures = useMemo(() => {
    return TAXONOMY_SIGNATURES.filter((sig) => {
      if (categoryFilter !== 'all' && categoryFilter !== sig.taxonomy) {
        return false;
      }
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        sig.name.toLowerCase().includes(q) ||
        sig.id.toLowerCase().includes(q) ||
        sig.description.toLowerCase().includes(q) ||
        sig.example.toLowerCase().includes(q) ||
        sig.academicSource.toLowerCase().includes(q)
      );
    });
  }, [categoryFilter, searchQuery]);

  const filteredTosRules = useMemo(() => {
    if (categoryFilter !== 'all' && categoryFilter !== 'tos') return [];
    return TOS_RED_FLAG_RULES.filter((rule) => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        rule.label.toLowerCase().includes(q) ||
        rule.id.toLowerCase().includes(q) ||
        rule.explanation.toLowerCase().includes(q)
      );
    });
  }, [categoryFilter, searchQuery]);

  const filteredJdmSites = useMemo(() => {
    return JUST_DELETE_ME_DATABASE.filter((site) => {
      if (jdmFilter !== 'all' && site.difficulty !== jdmFilter) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        site.name.toLowerCase().includes(q) ||
        site.domains.some((d) => d.toLowerCase().includes(q)) ||
        site.notes.toLowerCase().includes(q)
      );
    });
  }, [jdmFilter, searchQuery]);

  return (
    <div className="space-y-12">
      {/* 1. Interactive Custom ToS & Dark Pattern Clause Tester */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              01. Live Unrated ToS &amp; UI Copy Analyzer
            </h3>
            <p className="text-sm text-slate-400 mt-0.5">
              Overcomes ToS;DR manual curation limits by running client-side regex &amp; clause
              inspection on any pasted Terms of Service or checkout copy.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() =>
                setCustomInputText(
                  'Hurry! Offer expires in 00:03:15 — 29 people are viewing this right now! Only 2 left in stock. By continuing, your membership will auto-renew automatically each month and is strictly non-refundable under any circumstances. You agree to binding arbitration and waive class action rights. No thanks, I prefer to pay full price.'
                )
              }
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              Load Predatory Sample
            </button>
            <button
              type="button"
              onClick={() =>
                setCustomInputText(
                  'We may sell third-party marketing partners your location data and grant us an irrevocable, perpetual license to your uploaded videos. We may modify these terms at any time without notice.'
                )
              }
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              Load Data-Broker Sample
            </button>
            <button
              type="button"
              onClick={() =>
                setCustomInputText(
                  'All subscriptions can be canceled in one click from your account settings. Full refund within 30 days. We never sell your personal data or require arbitration.'
                )
              }
              className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-emerald-300 hover:bg-slate-700 transition-colors cursor-pointer whitespace-nowrap"
            >
              Load Clean Ethical Sample
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <div className="lg:col-span-7">
            <label
              htmlFor="custom-tos-input"
              className="block text-xs font-semibold text-slate-400 mb-2"
            >
              Paste Terms of Service Clause or Checkout Copy:
            </label>
            <textarea
              id="custom-tos-input"
              rows={5}
              value={customInputText}
              onChange={(e) => setCustomInputText(e.target.value)}
              placeholder="Paste any website Terms of Service or checkout text here..."
              className="w-full rounded-lg bg-slate-950 border border-slate-800 p-3.5 text-sm text-slate-100 font-mono focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="lg:col-span-5 rounded-lg bg-slate-950 border border-slate-800 p-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-3">
              <div>
                <span className="text-xs text-slate-400 block">Instant Clause Grade</span>
                <strong className="text-sm text-slate-200">
                  {customAuditReport.totalIssues} Red Flags Triggered
                </strong>
              </div>
              <span
                data-testid="custom-analyzer-grade"
                className={`font-mono text-lg font-black px-3 py-1 rounded ${
                  customAuditReport.grade === 'A'
                    ? 'bg-emerald-500 text-slate-950'
                    : customAuditReport.grade === 'B' || customAuditReport.grade === 'C'
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-red-500 text-white'
                }`}
              >
                Grade {customAuditReport.grade}
              </span>
            </div>

            <ul className="space-y-1.5 text-xs max-h-36 overflow-y-auto">
              {customAuditReport.findings.length === 0 ? (
                <li className="text-emerald-400 font-medium">
                  ✅ Zero predatory clauses or dark patterns matched in this text.
                </li>
              ) : (
                customAuditReport.findings.map((f) => (
                  <li
                    key={f.id}
                    className="p-2 rounded bg-slate-900 border border-slate-800 flex items-center justify-between gap-2"
                  >
                    <span className="text-slate-200">{f.title}</span>
                    <span className="font-mono text-[10px] text-sky-400 shrink-0">
                      {f.ruleId}
                    </span>
                  </li>
                ))
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* 2. Open-Source Rule Explorer (Princeton + DPBH EthiGuard + ToS;DR + Consent-O-Matic) */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              02. Open-Source Rule &amp; Signature Explorer (`rules/dark-patterns-dataset.json`)
            </h3>
            <p className="text-sm text-slate-400 mt-0.5">
              Inspect the 5 academic dark pattern taxonomies and 6 predatory ToS clause signatures
              bundled in OpenShield.
            </p>
          </div>

          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Filter rules and signatures"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search rule ID, regex, or source..."
              className="w-full pl-9 pr-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-sky-500"
            />
          </div>
        </div>

        {/* Category Filter Bar */}
        <div className="flex flex-wrap items-center gap-1.5 p-1.5 rounded-lg bg-slate-950 border border-slate-800 mb-6">
          {(
            [
              { id: 'all', label: 'All Signatures (16)' },
              { id: 'urgency', label: 'Urgency (2)' },
              { id: 'scarcity', label: 'Scarcity (2)' },
              { id: 'social_proof', label: 'Social Proof (2)' },
              { id: 'sneaking', label: 'Sneaking (2)' },
              { id: 'confirm_shaming', label: 'Confirm-Shaming & Style (2)' },
              { id: 'tos', label: 'ToS Red Flags (6)' }
            ] as Array<{ id: CategoryFilter; label: string }>
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setCategoryFilter(tab.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                categoryFilter === tab.id
                  ? 'bg-sky-500 text-slate-950'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Signatures Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredSignatures.map((sig) => (
            <div
              key={sig.id}
              className="p-4 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs text-slate-400 mb-1.5">
                  <span className="font-mono font-bold text-sky-400">{sig.id}</span>
                  <span>·</span>
                  <span className="capitalize">{sig.taxonomy.replace('_', ' ')}</span>
                  <span>·</span>
                  <span className="text-amber-400 font-semibold uppercase">{sig.severity}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-100 mb-1">{sig.name}</h4>
                <p className="text-xs text-slate-400 mb-3">{sig.description}</p>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-slate-900 text-xs">
                <div className="font-mono text-[11px] text-emerald-300 bg-slate-900 px-2.5 py-1.5 rounded truncate">
                  /{sig.regexSource}/i
                </div>
                <div className="text-[11px] text-slate-400">
                  <strong className="text-slate-300">Match Example:</strong> &ldquo;{sig.example}&rdquo;
                </div>
                <div className="text-[11px] text-slate-400">
                  <strong className="text-slate-300">Origin:</strong> {sig.academicSource}
                </div>
              </div>
            </div>
          ))}

          {filteredTosRules.map((rule) => (
            <div
              key={rule.id}
              className="p-4 rounded-lg bg-slate-950 border border-slate-800 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-2 text-xs text-slate-400 mb-1.5">
                  <span className="font-mono font-bold text-red-400">{rule.id}</span>
                  <span>·</span>
                  <span>ToS;DR Hybrid Corpus</span>
                  <span>·</span>
                  <span className="text-red-400 font-semibold uppercase">{rule.severity}</span>
                </div>
                <h4 className="text-sm font-bold text-slate-100 mb-1">{rule.label}</h4>
                <p className="text-xs text-slate-400 mb-3">{rule.explanation}</p>
              </div>
              <div className="space-y-1.5 pt-2 border-t border-slate-900 text-xs">
                <div className="font-mono text-[11px] text-red-300 bg-slate-900 px-2.5 py-1.5 rounded truncate">
                  /{rule.patternSource}/i
                </div>
                <div className="text-[11px] text-slate-400">
                  <strong className="text-slate-300">Scoring Weight:</strong> -{rule.points} safety
                  points
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 3. JustDeleteMe Roach Motel Directory (sites.json) */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-6">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5">
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              03. JustDeleteMe Roach Motel &amp; Cancellation Index (`extension/sites.json`)
            </h3>
            <p className="text-sm text-slate-400 mt-0.5">
              Instant cancellation difficulty ratings and 1-click direct unsubscribe links powered
              by the JustDeleteMe schema.
            </p>
          </div>
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-slate-950 border border-slate-800">
            {(['all', 'easy', 'medium', 'hard', 'impossible'] as const).map((diff) => (
              <button
                key={diff}
                type="button"
                onClick={() => setJdmFilter(diff)}
                className={`px-2.5 py-1 rounded text-xs font-semibold capitalize cursor-pointer whitespace-nowrap ${
                  jdmFilter === diff
                    ? 'bg-sky-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {diff}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-3 px-4 font-semibold">Service</th>
                <th className="py-3 px-4 font-semibold">Domains</th>
                <th className="py-3 px-4 font-semibold">Difficulty</th>
                <th className="py-3 px-4 font-semibold">Cancellation Notes</th>
                <th className="py-3 px-4 font-semibold text-right">Direct Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70">
              {filteredJdmSites.map((site) => (
                <tr key={site.name} className="hover:bg-slate-800/40">
                  <td className="py-3 px-4 font-bold text-slate-100 whitespace-nowrap">
                    {site.name}
                  </td>
                  <td className="py-3 px-4 font-mono text-slate-400">
                    {site.domains.slice(0, 2).join(', ')}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap">
                    <span
                      className={`font-mono font-bold uppercase text-[11px] ${
                        site.difficulty === 'easy'
                          ? 'text-emerald-400'
                          : site.difficulty === 'medium'
                          ? 'text-amber-400'
                          : 'text-red-400'
                      }`}
                    >
                      {site.difficulty}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-slate-300 max-w-md">{site.notes}</td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <a
                      href={site.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sky-400 hover:text-sky-300 font-semibold inline-flex items-center gap-1"
                    >
                      Unsubscribe Link
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Open-Source Ecosystem Competitor Matrix */}
      <section className="rounded-xl border border-slate-800 bg-slate-900/80 p-6">
        <h3 className="text-lg font-bold text-slate-100 mb-1">
          04. Open-Source Ecosystem Synthesis &amp; Capability Matrix
        </h3>
        <p className="text-sm text-slate-400 mb-5">
          How OpenShield combines 7 open-source projects into a unified real-time browser defense
          engine.
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400">
                <th className="py-3 px-4 font-semibold">Defense Capability</th>
                <th className="py-3 px-4 font-semibold">ToS;DR</th>
                <th className="py-3 px-4 font-semibold">Dapde Highlighter</th>
                <th className="py-3 px-4 font-semibold">Consent-O-Matic</th>
                <th className="py-3 px-4 font-semibold">JustDeleteMe</th>
                <th className="py-3 px-4 font-semibold text-sky-400">OpenShield Suite</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-slate-300">
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-100">
                  Hybrid Pre-Rated + Live Unrated ToS Scanner
                </td>
                <td className="py-3 px-4 text-slate-400">Manual Curation Only</td>
                <td className="py-3 px-4 text-slate-500">No</td>
                <td className="py-3 px-4 text-slate-500">No</td>
                <td className="py-3 px-4 text-slate-500">No</td>
                <td className="py-3 px-4 font-bold text-emerald-400">
                  Yes (Class A–E + Live NLP/Regex)
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-100">
                  Throttled MutationObserver DOM Tracking
                </td>
                <td className="py-3 px-4 text-slate-500">No</td>
                <td className="py-3 px-4 text-slate-300">Yes</td>
                <td className="py-3 px-4 text-slate-400">CMP Popups Only</td>
                <td className="py-3 px-4 text-slate-500">No</td>
                <td className="py-3 px-4 font-bold text-emerald-400">
                  Yes (Live Timers &amp; Stock Alerts)
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-100">
                  `getComputedStyle` Visual Interference Audit
                </td>
                <td className="py-3 px-4 text-slate-500">No</td>
                <td className="py-3 px-4 text-slate-500">No</td>
                <td className="py-3 px-4 text-slate-300">Cookie Banners Only</td>
                <td className="py-3 px-4 text-slate-500">No</td>
                <td className="py-3 px-4 font-bold text-emerald-400">
                  Yes (Full Checkout CTA Asymmetry)
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-100">
                  Roach Motel Cancellation Deep-Links
                </td>
                <td className="py-3 px-4 text-slate-500">No</td>
                <td className="py-3 px-4 text-slate-500">No</td>
                <td className="py-3 px-4 text-slate-500">No</td>
                <td className="py-3 px-4 text-slate-300">Web Directory</td>
                <td className="py-3 px-4 font-bold text-emerald-400">
                  Yes (Bundled `sites.json` in Popup)
                </td>
              </tr>
              <tr>
                <td className="py-3 px-4 font-semibold text-slate-100">
                  1-Click Active DOM Neutralizer
                </td>
                <td className="py-3 px-4 text-slate-500">No</td>
                <td className="py-3 px-4 text-slate-400">Highlight Only</td>
                <td className="py-3 px-4 text-slate-400">Cookies Only</td>
                <td className="py-3 px-4 text-slate-500">No</td>
                <td className="py-3 px-4 font-bold text-emerald-400">
                  Yes (Unchecks, Equalizes, Freezes)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
