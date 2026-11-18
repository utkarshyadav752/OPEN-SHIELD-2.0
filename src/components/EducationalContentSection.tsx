import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  BookOpen,
  ExternalLink,
  Globe,
  Loader2,
  RefreshCw,
  Search,
  AlertTriangle,
} from 'lucide-react';
import type { SupportedLanguage } from '../engine/documentAndUrlAnalyzer';

export type EducationalTopicFilter =
  | 'all'
  | 'dark-patterns'
  | 'consumer-rights'
  | 'regulations';

export interface EducationalArticle {
  id: string;
  title: string;
  source: string;
  publishedDate: string;
  topic: 'Dark Patterns' | 'Consumer Rights';
  summary: string;
  keyTakeaway: string;
  url: string;
}

export interface GroundingCitation {
  title: string;
  uri: string;
}

interface EducationalContentSectionProps {
  lang: SupportedLanguage;
}

const TOPIC_TABS: Array<{
  id: EducationalTopicFilter;
  labelEn: string;
  labelHi: string;
}> = [
  { id: 'all', labelEn: 'All Topics', labelHi: 'सभी विषय' },
  { id: 'dark-patterns', labelEn: 'Dark Patterns', labelHi: 'डार्क पैटर्न' },
  { id: 'consumer-rights', labelEn: 'Consumer Rights', labelHi: 'उपभोक्ता अधिकार' },
  { id: 'regulations', labelEn: 'Recent Rules', labelHi: 'नए नियम व कानून' },
];

export const EducationalContentSection: React.FC<EducationalContentSectionProps> = ({
  lang,
}) => {
  const [topic, setTopic] = useState<EducationalTopicFilter>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [articles, setArticles] = useState<EducationalArticle[]>([]);
  const [briefing, setBriefing] = useState<string>('');
  const [groundingSources, setGroundingSources] = useState<GroundingCitation[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const fetchArticles = useCallback(
    async (
      nextTopic: EducationalTopicFilter,
      customQuery: string,
      forceRefresh = false
    ) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setIsLoading(true);
      setErrorMsg(null);

      try {
        const res = await fetch('/api/educational-articles', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: controller.signal,
          body: JSON.stringify({
            topic: nextTopic,
            query: customQuery.trim(),
            lang,
            forceRefresh,
          }),
        });

        const data = await res.json();
        if (!res.ok || data.error) {
          setErrorMsg(
            data.error || 'Could not retrieve recent articles from Google Search grounding.'
          );
          setArticles([]);
          setGroundingSources([]);
        } else {
          setArticles(Array.isArray(data.articles) ? data.articles : []);
          setBriefing(typeof data.briefing === 'string' ? data.briefing : '');
          setGroundingSources(
            Array.isArray(data.groundingSources) ? data.groundingSources : []
          );
          setFetchedAt(data.fetchedAt || new Date().toISOString());
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === 'AbortError') return;
        setErrorMsg(
          err instanceof Error
            ? err.message
            : 'Network error while fetching educational articles.'
        );
        setArticles([]);
        setGroundingSources([]);
      } finally {
        if (abortRef.current === controller) {
          setIsLoading(false);
        }
      }
    },
    [lang]
  );

  useEffect(() => {
    fetchArticles(topic, searchQuery);
    return () => {
      abortRef.current?.abort();
    };
  }, [topic, lang, fetchArticles]);

  const handleTopicSelect = (nextTopic: EducationalTopicFilter) => {
    setTopic(nextTopic);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchArticles(topic, searchQuery);
  };

  return (
    <section
      id="educational-content-section"
      data-testid="educational-content-section"
      className="rounded-2xl bg-white border border-slate-200 p-6 sm:p-8 space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-slate-200">
        <div className="flex items-start gap-3.5">
          <div className="w-11 h-11 rounded-2xl bg-[#0F172A] text-cyan-400 flex items-center justify-center shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xs font-bold text-[#0b57d0] tracking-wide mb-1">
              04. Educational Content · Live Search Grounding
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 text-balance">
              {lang === 'hi'
                ? 'डार्क पैटर्न और उपभोक्ता अधिकार: नवीनतम लेख व दिशानिर्देश'
                : 'Recent Articles on Dark Patterns & Consumer Rights'}
            </h2>
            <p className="text-sm text-slate-600 mt-1 max-w-3xl">
              {lang === 'hi'
                ? 'Google Search Grounding के माध्यम से ताज़ा नियामक कार्रवाइयों, सब्सक्रिप्शन नियमों और उपभोक्ता सुरक्षा लेखों से अपडेट रहें।'
                : 'Dynamically sourced through Google Search Grounding to keep you current on deceptive UI enforcement, cancellation rules, and digital consumer protections.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          data-testid="refresh-educational-articles-btn"
          disabled={isLoading}
          onClick={() => fetchArticles(topic, searchQuery, true)}
          className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-colors inline-flex items-center gap-2 whitespace-nowrap shrink-0 self-start lg:self-center"
        >
          {isLoading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <RefreshCw className="w-3.5 h-3.5" />
          )}
          <span>{lang === 'hi' ? 'ताज़ा लेख लाएँ' : 'Refresh Articles'}</span>
        </button>
      </div>

      {/* Controls: Topic Tabs + Keyword Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div
          role="tablist"
          aria-label="Educational topic filter"
          className="inline-flex flex-wrap items-center gap-1 p-1 rounded-xl bg-slate-100 border border-slate-200 self-start"
        >
          {TOPIC_TABS.map((tab) => {
            const active = topic === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                data-testid={`edu-topic-${tab.id}`}
                onClick={() => handleTopicSelect(tab.id)}
                className={`px-3.5 py-2 rounded-lg text-xs font-bold cursor-pointer transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {lang === 'hi' ? tab.labelHi : tab.labelEn}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 w-full md:w-auto">
          <div className="relative flex-1 md:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              aria-label="Search recent dark pattern or consumer rights articles"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                lang === 'hi'
                  ? 'विषय खोजें (जैसे CCPA, auto-renewal)...'
                  : 'Filter by topic (e.g., drip pricing, FTC)...'
              }
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 border border-slate-300 text-xs text-slate-900 focus:outline-none focus:border-[#0b57d0] focus:bg-white"
            />
          </div>
          <button
            type="submit"
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-[#0b57d0] hover:bg-[#0842a0] disabled:opacity-50 text-white text-xs font-bold cursor-pointer transition-colors whitespace-nowrap shrink-0"
          >
            {lang === 'hi' ? 'खोजें' : 'Search'}
          </button>
        </form>
      </div>

      {/* Briefing Summary Strip */}
      {!isLoading && !errorMsg && briefing && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
          <div className="text-slate-700 leading-relaxed">
            <span className="font-extrabold text-slate-900">
              {lang === 'hi' ? 'मुख्य सारांश: ' : 'Current Trend Briefing: '}
            </span>
            {briefing}
          </div>
          {fetchedAt && (
            <div className="text-[11px] font-mono text-slate-500 tabular-nums whitespace-nowrap shrink-0">
              Updated {new Date(fetchedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      )}

      {/* Loading Skeleton State */}
      {isLoading && (
        <div
          data-testid="educational-loading-skeleton"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {[0, 1, 2].map((idx) => (
            <div
              key={idx}
              className="p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3 animate-pulse"
            >
              <div className="h-3 w-40 bg-slate-200 rounded" />
              <div className="h-5 w-full bg-slate-200 rounded" />
              <div className="h-4 w-3/4 bg-slate-200 rounded" />
              <div className="h-14 w-full bg-slate-200 rounded" />
              <div className="h-3 w-28 bg-slate-200 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!isLoading && errorMsg && (
        <div
          data-testid="educational-error-state"
          className="p-5 rounded-xl bg-red-50 border border-red-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs text-red-900"
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
            <div>
              <div className="font-extrabold text-sm">
                {lang === 'hi'
                  ? 'शैक्षिक लेख लोड नहीं हो सके'
                  : 'Unable to Load Current Articles'}
              </div>
              <p className="mt-1 text-red-800 leading-relaxed">{errorMsg}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => fetchArticles(topic, searchQuery, true)}
            className="px-4 py-2 rounded-xl bg-red-700 hover:bg-red-800 text-white font-bold text-xs cursor-pointer whitespace-nowrap shrink-0 self-start sm:self-center"
          >
            {lang === 'hi' ? 'पुनः प्रयास करें' : 'Try Again'}
          </button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !errorMsg && articles.length === 0 && (
        <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-3">
          <p className="text-sm font-bold text-slate-900">
            {lang === 'hi'
              ? 'इस खोज के लिए कोई हालिया लेख नहीं मिला।'
              : 'No recent articles matched this filter.'}
          </p>
          <button
            type="button"
            onClick={() => {
              setSearchQuery('');
              setTopic('all');
              fetchArticles('all', '');
            }}
            className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer"
          >
            {lang === 'hi' ? 'सभी विषय दिखाएँ' : 'Reset Filters'}
          </button>
        </div>
      )}

      {/* Populated Articles Grid */}
      {!isLoading && !errorMsg && articles.length > 0 && (
        <div
          data-testid="educational-articles-grid"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {articles.map((article) => (
            <article
              key={article.id}
              data-testid="educational-article-card"
              className="p-5 rounded-xl bg-white border border-slate-200 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors"
            >
              <div className="space-y-3">
                {/* Clean Unboxed Metadata (Zero-Pill Rule) */}
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span className="font-bold text-[#0b57d0]">{article.topic}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-medium text-slate-700 truncate max-w-[140px]">
                    {article.source}
                  </span>
                  <span aria-hidden="true">·</span>
                  <span className="tabular-nums">{article.publishedDate}</span>
                </div>

                <h3 className="text-base font-extrabold text-slate-900 leading-snug">
                  {article.title}
                </h3>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {article.summary}
                </p>

                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-700 leading-relaxed">
                  <span className="font-bold text-slate-900">
                    {lang === 'hi' ? 'उपभोक्ता सुझाव: ' : 'Consumer Takeaway: '}
                  </span>
                  {article.keyTakeaway}
                </div>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-bold text-[#0b57d0] hover:underline inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  <span>{lang === 'hi' ? 'मूल लेख पढ़ें' : 'Read Source Article'}</span>
                  <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                </a>
              </div>
            </article>
          ))}
        </div>
      )}

      {/* Grounding Citations Footer */}
      {!isLoading && groundingSources.length > 0 && (
        <div
          data-testid="educational-grounding-sources"
          className="pt-4 border-t border-slate-200 space-y-2.5"
        >
          <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
            <Globe className="w-4 h-4 text-[#0b57d0] shrink-0" />
            <span>
              {lang === 'hi'
                ? 'सत्यापित Google Search Grounding स्रोत:'
                : 'Verified Google Search Grounding Sources'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
            {groundingSources.map((src, idx) => (
              <a
                key={`${src.uri}-${idx}`}
                href={src.uri}
                target="_blank"
                rel="noopener noreferrer"
                className="text-slate-600 hover:text-[#0b57d0] hover:underline inline-flex items-center gap-1 max-w-[280px]"
              >
                <span className="truncate">{src.title}</span>
                <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
