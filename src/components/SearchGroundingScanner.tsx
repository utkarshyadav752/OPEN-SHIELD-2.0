import React, { useState } from 'react';
import { Search, Globe, ExternalLink, BookmarkCheck, Sparkles, Loader2 } from 'lucide-react';
import { saveUserAuditToFirestore, type User } from '../firebase';

interface GroundingSource {
  title: string;
  uri: string;
}

interface SearchGroundingProps {
  user: User | null;
  onRequireSignIn: () => void;
}

export const SearchGroundingScanner: React.FC<SearchGroundingProps> = ({
  user,
  onRequireSignIn
}) => {
  const [query, setQuery] = useState<string>('Adobe Creative Cloud cancellation & early termination fee');
  const [loading, setLoading] = useState<boolean>(false);
  const [analysis, setAnalysis] = useState<string | null>(
    `**OpenShield Grounded Policy Brief for "Adobe Creative Cloud":**\n\n- **Estimated Safety Grade:** Grade D\n- **Roach Motel / Cancellation Trap:** Annual plans paid monthly impose a **50% early termination fee** on remaining contract months if canceled after the initial 14-day window.\n- **Terms of Service Red Flags:** Automatic annual renewal unless canceled prior to billing date; multi-step online retention flow offering discounted months before confirming cancellation.\n- **Consumer Defense Tip:** Always check whether a "monthly" price is actually an annual commitment in disguise before entering payment details.`
  );
  const [sources, setSources] = useState<GroundingSource[]>([
    {
      title: 'Adobe Subscription Terms and Cancellation Policy',
      uri: 'https://www.adobe.com/legal/subscription-terms.html'
    },
    {
      title: 'JustDeleteMe — Direct Account Cancellation Directory',
      uri: 'https://justdelete.me/'
    }
  ]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  const runGroundedSearch = async (targetQuery?: string) => {
    const q = (targetQuery ?? query).trim();
    if (!q) {
      setErrorMsg('Please enter a service name, URL, or Terms of Service topic to audit.');
      return;
    }
    setErrorMsg(null);
    setSaveStatus(null);
    setLoading(true);

    try {
      const res = await fetch('/api/gemini/search-grounding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q })
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        setErrorMsg(data.error || 'Failed to complete grounded search.');
      } else {
        setAnalysis(data.analysis);
        setSources(Array.isArray(data.sources) ? data.sources : []);
      }
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Network error during search.');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAudit = async () => {
    if (!user) {
      onRequireSignIn();
      return;
    }
    if (!analysis) return;
    try {
      setSaveStatus('Saving...');
      const inferredGrade = analysis.includes('Grade A')
        ? 'A'
        : analysis.includes('Grade B')
        ? 'B'
        : analysis.includes('Grade C')
        ? 'C'
        : analysis.includes('Grade D')
        ? 'D'
        : 'F';
      await saveUserAuditToFirestore({
        domain: query.slice(0, 120),
        grade: inferredGrade,
        issuesFound: inferredGrade === 'A' ? 0 : inferredGrade === 'B' ? 2 : 5,
        summary: analysis.replace(/[#*]/g, '').slice(0, 480)
      });
      setSaveStatus('Saved to your OpenShield Cloud History!');
    } catch (err: unknown) {
      setSaveStatus(err instanceof Error ? err.message : 'Could not save audit.');
    }
  };

  const presets = [
    'Adobe Creative Cloud cancellation fee',
    'Amazon Prime Iliad cancellation flow',
    'Planet Fitness gym cancellation policy',
    'SiriusXM auto-renewal terms'
  ];

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/90 p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
        <div>
          <h3 className="text-lg font-bold text-slate-50 flex items-center gap-2">
            <Globe className="w-5 h-5 text-sky-400" />
            Live Web Policy &amp; Dark Pattern Search (Google Search Grounding)
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time Google Search Grounding to audit any company&apos;s live cancellation policies,
            early termination fees, and Terms of Service traps.
          </p>
        </div>
      </div>

      {/* Preset Quick Pills */}
      <div className="flex flex-wrap items-center gap-2 mb-4">
        <span className="text-xs text-slate-400 font-medium">Quick Audit:</span>
        {presets.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => {
              setQuery(preset);
              runGroundedSearch(preset);
            }}
            className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-200 cursor-pointer transition-colors whitespace-nowrap"
          >
            {preset}
          </button>
        ))}
      </div>

      {/* Search Form */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          runGroundedSearch();
        }}
        className="flex flex-col sm:flex-row gap-2.5 mb-5"
      >
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            aria-label="Search company or website policy"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter any website, airline, or subscription (e.g., Netflix cancellation policy)..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-slate-100 focus:outline-none focus:border-sky-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-slate-950 font-bold text-sm cursor-pointer transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Auditing Web...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Audit with Google Search
            </>
          )}
        </button>
      </form>

      {errorMsg && (
        <div className="p-3 rounded-lg bg-red-950/60 border border-red-800 text-xs text-red-200 mb-4">
          {errorMsg}
        </div>
      )}

      {analysis && (
        <div className="rounded-xl bg-slate-950 border border-slate-800 p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-3">
            <span className="text-xs font-bold text-sky-400 uppercase tracking-wider">
              Grounded Consumer Defense Report
            </span>
            <div className="flex items-center gap-2">
              {saveStatus && <span className="text-xs text-emerald-400 font-medium">{saveStatus}</span>}
              <button
                type="button"
                onClick={handleSaveAudit}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 cursor-pointer transition-colors"
              >
                <BookmarkCheck className="w-3.5 h-3.5 text-emerald-400" />
                Save Audit to Account
              </button>
            </div>
          </div>

          <div className="text-sm text-slate-200 space-y-2 leading-relaxed">
            {analysis
              .split('\n')
              .filter((line) => line.trim().length > 0)
              .map((line, i) => {
                const cleanLine = line.replace(/^[-*]\s+/, '');
                const segments = cleanLine.split(/(\*\*.*?\*\*)/g);
                return (
                  <p key={i} className={line.trim().startsWith('-') ? 'pl-3 border-l-2 border-sky-500/40' : 'font-semibold text-white'}>
                    {segments.map((seg, idx) =>
                      seg.startsWith('**') && seg.endsWith('**') ? (
                        <strong key={idx} className="font-bold text-white">
                          {seg.slice(2, -2)}
                        </strong>
                      ) : (
                        <span key={idx}>{seg}</span>
                      )
                    )}
                  </p>
                );
              })}
          </div>

          {sources.length > 0 && (
            <div className="pt-3 border-t border-slate-800/80">
              <div className="text-xs font-semibold text-slate-400 mb-2">
                Verified Google Search Grounding Sources:
              </div>
              <div className="flex flex-wrap gap-2">
                {sources.map((src, idx) => (
                  <a
                    key={`${src.uri}-${idx}`}
                    href={src.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-xs text-sky-400 font-medium transition-colors"
                  >
                    <span className="truncate max-w-[260px]">{src.title}</span>
                    <ExternalLink className="w-3 h-3 shrink-0" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
