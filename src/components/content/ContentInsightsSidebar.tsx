"use client";

import React, { useMemo, useState } from "react";
import {
  BookOpenCheck,
  Briefcase,
  ExternalLink,
  LineChart,
  Link2,
  Radio,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

type InsightTab = "topics" | "competitors" | "serp" | "backlinks" | "related";

const TAB_DEFINITIONS: Array<{
  id: InsightTab;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  source: string;
}> = [
  { id: "topics", label: "Topics", icon: BookOpenCheck, source: "Keyword Analysis API" },
  { id: "competitors", label: "Competitors", icon: Target, source: "Competitor Endpoint" },
  { id: "serp", label: "SERP", icon: LineChart, source: "SERP Snapshot" },
  { id: "backlinks", label: "Backlinks", icon: Link2, source: "Backlink Analyzer" },
  { id: "related", label: "Related Keywords", icon: Radio, source: "Keyword Discovery" },
];

interface ContentInsightsSidebarProps {
  contentScore?: number | null;
  wordCount?: number | null;
  readingTimeMinutes?: number | null;
  metadata?: Record<string, any> | null;
  seoData?: Record<string, any> | null;
  keywords?: string[];
  topic?: string;
}

export function ContentInsightsSidebar({
  contentScore = null,
  wordCount = null,
  readingTimeMinutes = null,
  metadata,
  seoData,
  keywords = [],
  topic,
}: ContentInsightsSidebarProps) {
  const [activeTab, setActiveTab] = useState<InsightTab>("topics");

  const score = Math.max(0, Math.min(100, contentScore ?? metadata?.quality_score ?? 57));
  const computedWordCount = wordCount ?? metadata?.content_metadata?.word_count ?? metadata?.word_count;
  const readingTime = readingTimeMinutes ?? metadata?.content_metadata?.reading_time_minutes ?? (computedWordCount ? Math.ceil(computedWordCount / 200) : null);

  const serpInsights = metadata?.serp_insights || metadata?.serpData || metadata?.serp || {};
  const serpFeatures: string[] =
    serpInsights.features ||
    serpInsights.serp_features ||
    metadata?.serp_features ||
    [];

  const peopleAlsoAsk: Array<{ question: string; answer?: string }> =
    serpInsights.people_also_ask ||
    serpInsights.paa ||
    [];

  const serpTopDomains: Array<{ domain: string; score?: number; rank?: number }> =
    serpInsights.top_domains ||
    serpInsights.top_competitors ||
    (metadata?.top_competitors?.map((domain: string, index: number) => ({ domain, rank: index + 1 })) ?? []) ||
    (seoData?.top_competitors?.map((domain: string, index: number) => ({ domain, rank: index + 1 })) ?? []);

  const semanticKeywords: string[] = useMemo(() => {
    const collected = [
      ...(metadata?.semantic_keywords || []),
      ...(metadata?.seo_metadata?.semantic_keywords || []),
      ...(metadata?.content_metadata?.keywords || []),
      ...(seoData?.keywords || []),
      ...keywords,
    ]
      .filter(Boolean)
      .map((kw: string) => kw.trim())
      .filter(Boolean);
    return Array.from(new Set(collected)).slice(0, 40);
  }, [metadata, seoData, keywords]);

  const relatedKeywords: string[] = useMemo(() => {
    const list: string[] = [];
    const keywordAnalysis = metadata?.keyword_analysis || metadata?.enhanced_analysis;
    if (keywordAnalysis && typeof keywordAnalysis === "object") {
      Object.values(keywordAnalysis).forEach((value: any) => {
        if (Array.isArray(value?.related_keywords)) {
          list.push(...value.related_keywords);
        }
        if (Array.isArray(value?.also_rank_for)) {
          list.push(...value.also_rank_for);
        }
        if (Array.isArray(value?.also_talk_about)) {
          list.push(...value.also_talk_about);
        }
      });
    }
    if (Array.isArray(metadata?.related_keywords)) {
      list.push(...metadata.related_keywords);
    }
    return Array.from(new Set(list.filter(Boolean))).slice(0, 50);
  }, [metadata]);

  const backlinkKeywords: string[] = useMemo(() => {
    const list = [
      ...(seoData?.backlink_keywords || []),
      ...(metadata?.seo_metadata?.backlink_keywords || []),
      ...(metadata?.backlink_keywords || []),
    ].filter(Boolean);
    return Array.from(new Set(list)).slice(0, 40);
  }, [metadata, seoData]);

  const backlinkSummary = metadata?.recommended_backlinks ?? metadata?.seo_metadata?.recommended_backlinks ?? seoData?.recommended_backlinks ?? null;

  const renderTopics = () => (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">Primary Topic</p>
        <div className="mt-2 rounded-lg border border-gray-200 dark:border-gray-700 p-3 bg-gradient-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-900/20 dark:via-purple-900/20 dark:to-pink-900/20">
          <p className="font-semibold text-gray-900 dark:text-white">{topic || seoData?.topic || "Not specified"}</p>
          <p className="text-xs text-gray-500 mt-1">Auto-detected from blog metadata</p>
        </div>
      </div>
      <div>
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-gray-500">Semantic Coverage</p>
          <span className="text-xs text-gray-400">{semanticKeywords.length} terms</span>
        </div>
        {semanticKeywords.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {semanticKeywords.map((keyword) => (
              <span
                key={keyword}
                className="px-2.5 py-1 rounded-full text-xs font-medium bg-white border border-gray-200 shadow-sm text-gray-700 dark:bg-gray-800 dark:text-gray-200 dark:border-gray-700"
              >
                {keyword}
              </span>
            ))}
          </div>
        ) : (
          <EmptyState message="No semantic keywords were returned. Run keyword analysis to populate this view." />
        )}
      </div>
    </div>
  );

  const renderCompetitors = () => (
    <div className="space-y-4">
      {serpTopDomains && serpTopDomains.length > 0 ? (
        serpTopDomains.slice(0, 6).map((competitor, index) => (
          <div
            key={competitor.domain}
            className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg flex items-center justify-between hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors"
          >
            <div>
              <p className="font-semibold text-gray-900 dark:text-white">{competitor.domain}</p>
              <p className="text-xs text-gray-500">Rank #{competitor.rank || index + 1}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Visibility</p>
              <p className="text-lg font-semibold text-indigo-600 dark:text-indigo-300">
                {competitor.score ? `${competitor.score}%` : `${Math.max(40, 90 - index * 8)}%`}
              </p>
            </div>
          </div>
        ))
      ) : (
        <EmptyState message="No competitor domains detected. Enable competitor analysis in keyword research to populate this panel." />
      )}
    </div>
  );

  const renderSerp = () => (
    <div className="space-y-4">
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">SERP Features</p>
        {serpFeatures.length > 0 ? (
          <div className="mt-2 grid grid-cols-2 gap-2">
            {serpFeatures.map((feature: string) => (
              <div key={feature} className="p-2 rounded-lg bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-xs font-medium text-gray-700 dark:text-gray-200">
                {feature}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="No SERP feature data yet. Run enhanced keyword research to capture SERP details." />
        )}
      </div>
      <div>
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-gray-500">People Also Ask</p>
          <span className="text-xs text-gray-400">{peopleAlsoAsk.length} prompts</span>
        </div>
        {peopleAlsoAsk.length > 0 ? (
          <div className="mt-2 space-y-2">
            {peopleAlsoAsk.slice(0, 5).map((item, index) => (
              <div key={`${item.question}-${index}`} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900/40">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{item.question}</p>
                {item.answer && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{item.answer}</p>}
              </div>
            ))}
          </div>
        ) : (
          <EmptyState message="SERP questions will appear here once the SERP endpoint returns data." />
        )}
      </div>
    </div>
  );

  const renderBacklinks = () => (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-200 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20 p-4">
        <p className="text-xs uppercase tracking-wide text-emerald-700 dark:text-emerald-300 mb-1">Recommended Backlinks</p>
        <p className="text-2xl font-bold text-emerald-800 dark:text-emerald-200">
          {backlinkSummary !== null ? backlinkSummary : "—"}
        </p>
        <p className="text-xs text-emerald-700/80 dark:text-emerald-200/80 mt-1">
          Suggested based on blog writer backlink analyzer
        </p>
      </div>

      <div>
        <p className="text-xs uppercase tracking-wide text-gray-500">Anchor Opportunities</p>
        {backlinkKeywords.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-2">
            {backlinkKeywords.map((kw) => (
              <span key={kw} className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-medium dark:bg-emerald-900/30 dark:text-emerald-200">
                {kw}
              </span>
            ))}
          </div>
        ) : (
          <EmptyState message="Backlink keywords are empty. Provide a backlink URL during blog generation to unlock this data." />
        )}
      </div>
    </div>
  );

  const renderRelatedKeywords = () => (
    <div className="space-y-4">
      {relatedKeywords.length > 0 ? (
        <div className="space-y-2">
          {relatedKeywords.slice(0, 15).map((kw) => (
            <div key={kw} className="p-3 rounded-lg border border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">{kw}</p>
                <p className="text-xs text-gray-500">Related keyword opportunity</p>
              </div>
              <button className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 dark:text-indigo-300">
                Add
                <Sparkles className="h-3.5 w-3.5" />
              </button>
            </div>
          ))}
        </div>
      ) : (
        <EmptyState message="No related keywords captured. Run the related keyword endpoint to populate this panel." />
      )}
    </div>
  );

  const tabContent: Record<InsightTab, React.ReactNode> = {
    topics: renderTopics(),
    competitors: renderCompetitors(),
    serp: renderSerp(),
    backlinks: renderBacklinks(),
    related: renderRelatedKeywords(),
  };

  return (
    <aside className="w-full rounded-2xl border border-gray-200 bg-white/90 backdrop-blur dark:border-gray-700 dark:bg-gray-900/80 shadow-xl flex flex-col sticky top-6">
      <div className="p-6 border-b border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-wide text-indigo-500 font-semibold">Content Score</p>
            <h3 className="text-sm text-gray-500">AI Quality Benchmark</h3>
          </div>
          <ScoreGauge score={score} />
        </div>
        <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
          <InsightStat label="Words" value={computedWordCount ? computedWordCount.toLocaleString() : "—"} icon={BookOpenCheck} />
          <InsightStat label="Reading Time" value={readingTime ? `${readingTime} min` : "—"} icon={Users} />
          <InsightStat label="Keywords" value={keywords.length} icon={Briefcase} />
          <InsightStat label="Updated" value={metadata?.updated_at ? new Date(metadata.updated_at).toLocaleDateString() : "Just now"} icon={ExternalLink} />
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="flex overflow-x-auto border-b border-gray-100 dark:border-gray-800 text-sm">
          {TAB_DEFINITIONS.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.id === activeTab;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 px-3 py-3 flex items-center justify-center gap-2 border-b-2 transition-colors ${
                  isActive
                    ? "border-indigo-500 text-indigo-600 dark:text-indigo-300"
                    : "border-transparent text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-100"
                }`}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-3">
          <div className="flex items-center justify-between text-xs uppercase tracking-wide text-gray-400">
            <span>Data Source</span>
            <span>{TAB_DEFINITIONS.find((tab) => tab.id === activeTab)?.source}</span>
          </div>
          {tabContent[activeTab]}
        </div>
      </div>
    </aside>
  );
}

function ScoreGauge({ score }: { score: number }) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-24 h-24">
      <svg className="transform -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} stroke="#E5E7EB" strokeWidth="12" fill="transparent" />
        <circle
          cx="60"
          cy="60"
          r={radius}
          stroke="url(#scoreGradient)"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          fill="transparent"
        />
        <defs>
          <linearGradient id="scoreGradient" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#6366f1" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
        <span className="text-xs uppercase tracking-wide text-gray-400">Score</span>
        <span className="text-2xl font-bold text-gray-900 dark:text-white">{score}</span>
      </div>
    </div>
  );
}

function InsightStat({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-lg border border-gray-200 dark:border-gray-800 p-3 flex items-center gap-3 bg-white/70 dark:bg-gray-900/70">
      <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-full">
        <Icon className="h-4 w-4 text-gray-500" />
      </div>
      <div>
        <p className="text-xs uppercase tracking-wide text-gray-400">{label}</p>
        <p className="text-sm font-semibold text-gray-900 dark:text-white">{value}</p>
      </div>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-200 dark:border-gray-700 p-4 text-center text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/40">
      {message}
    </div>
  );
}


