"use client";

import React, { useState } from 'react';
import { FileText, Download, Send, X, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/modal';

interface KeywordCluster {
  parent_topic: string;
  keywords: string[];
  cluster_score: number;
  keyword_count: number;
  total_volume?: number;
  avg_difficulty?: string;
}

interface SERPInsight {
  serp_features?: {
    has_featured_snippet?: boolean;
    has_people_also_ask?: boolean;
    has_videos?: boolean;
    has_images?: boolean;
  };
  people_also_ask?: Array<{ question: string; answer?: string }>;
  featured_snippet?: { title: string; content: string; url: string };
  top_domains?: Array<{ domain: string; rank: number }>;
}

interface ContentBriefGeneratorProps {
  cluster: KeywordCluster;
  primaryKeyword: string;
  serpData?: SERPInsight;
  searchType?: string;
  onGenerateBlog?: (brief: ContentBrief) => void;
  onClose?: () => void;
}

export interface ContentBrief {
  title: string;
  primary_keyword: string;
  target_keywords: string[];
  search_type: string;
  outline: Array<{ heading: string; keywords: string[]; notes?: string }>;
  serp_insights: {
    featured_snippet?: { title: string; content: string };
    people_also_ask?: string[];
    top_competitors?: string[];
  };
  keyword_distribution: Array<{ keyword: string; placement: string; priority: 'high' | 'medium' | 'low' }>;
  content_goals: string[];
  seo_recommendations: string[];
}

export function ContentBriefGenerator({
  cluster,
  primaryKeyword,
  serpData,
  searchType = 'general',
  onGenerateBlog,
  onClose,
}: ContentBriefGeneratorProps) {
  const [brief, setBrief] = useState<ContentBrief | null>(null);
  const [generating, setGenerating] = useState(false);
  const [showModal, setShowModal] = useState(true);

  const generateBrief = async () => {
    setGenerating(true);
    
    try {
      // Generate outline based on cluster and SERP data
      const outline: Array<{ heading: string; keywords: string[]; notes?: string }> = [];
      
      // Introduction section
      outline.push({
        heading: 'Introduction',
        keywords: [primaryKeyword, ...cluster.keywords.slice(0, 2)],
        notes: `Introduce the topic of ${cluster.parent_topic} and why it matters.`,
      });

      // Main sections based on cluster keywords
      const mainKeywords = cluster.keywords.slice(0, 6);
      mainKeywords.forEach((keyword, idx) => {
        outline.push({
          heading: `Section ${idx + 1}: ${keyword}`,
          keywords: [keyword],
          notes: `Cover ${keyword} in detail. Include practical examples and actionable advice.`,
        });
      });

      // People Also Ask section
      if (serpData?.people_also_ask && serpData.people_also_ask.length > 0) {
        outline.push({
          heading: 'Frequently Asked Questions',
          keywords: serpData.people_also_ask.map(q => q.question),
          notes: 'Answer common questions from SERP data.',
        });
      }

      // Conclusion
      outline.push({
        heading: 'Conclusion',
        keywords: [primaryKeyword],
        notes: 'Summarize key points and provide next steps.',
      });

      // Keyword distribution
      const keywordDistribution: Array<{ keyword: string; placement: string; priority: 'high' | 'medium' | 'low' }> = [
        { keyword: primaryKeyword, placement: 'Title, H1, first paragraph', priority: 'high' },
        ...cluster.keywords.slice(0, 5).map(kw => ({
          keyword: kw,
          placement: 'H2 headings, body paragraphs',
          priority: 'medium' as const,
        })),
        ...cluster.keywords.slice(5, 10).map(kw => ({
          keyword: kw,
          placement: 'Body text, alt tags',
          priority: 'low' as const,
        })),
      ];

      // Content goals based on search type
      const contentGoals: string[] = [];
      if (searchType === 'how_to') {
        contentGoals.push('Provide step-by-step instructions');
        contentGoals.push('Include practical examples');
        contentGoals.push('Add troubleshooting tips');
      } else if (searchType === 'listicle') {
        contentGoals.push('Create numbered list format');
        contentGoals.push('Include detailed explanations for each item');
        contentGoals.push('Add visual elements where possible');
      } else if (searchType === 'product') {
        contentGoals.push('Compare multiple products/services');
        contentGoals.push('Include pros and cons');
        contentGoals.push('Add buying recommendations');
      }

      // SEO recommendations
      const seoRecommendations: string[] = [
        `Target primary keyword "${primaryKeyword}" in title and H1`,
        `Include ${cluster.keyword_count} related keywords naturally`,
        'Optimize for featured snippet (if available)',
        'Add internal links to related content',
        'Include schema markup for better visibility',
      ];

      if (serpData?.serp_features?.has_videos) {
        seoRecommendations.push('Consider adding video content');
      }
      if (serpData?.serp_features?.has_images) {
        seoRecommendations.push('Include relevant images with alt text');
      }

      const generatedBrief: ContentBrief = {
        title: `${cluster.parent_topic}: Complete Guide`,
        primary_keyword: primaryKeyword,
        target_keywords: cluster.keywords,
        search_type: searchType,
        outline,
        serp_insights: {
          featured_snippet: serpData?.featured_snippet,
          people_also_ask: serpData?.people_also_ask?.map(q => q.question),
          top_competitors: serpData?.top_domains?.map(d => d.domain),
        },
        keyword_distribution: keywordDistribution,
        content_goals: contentGoals,
        seo_recommendations: seoRecommendations,
      };

      setBrief(generatedBrief);
    } catch (error) {
      console.error('Error generating brief:', error);
    } finally {
      setGenerating(false);
    }
  };

  const handleExport = () => {
    if (!brief) return;
    
    const jsonContent = JSON.stringify(brief, null, 2);
    const blob = new Blob([jsonContent], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `content-brief-${cluster.parent_topic.replace(/\s+/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleGenerateBlog = () => {
    if (brief && onGenerateBlog) {
      onGenerateBlog(brief);
      setShowModal(false);
      onClose?.();
    }
  };

  React.useEffect(() => {
    if (showModal && !brief && !generating) {
      generateBrief();
    }
  }, [showModal]);

  return (
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          onClose?.();
        }}
        className="max-w-4xl max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 space-y-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Content Brief Generator</h2>
          {generating && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
            <span className="ml-3 text-gray-600 dark:text-gray-400">Generating content brief...</span>
          </div>
        )}

        {brief && !generating && (
          <>
            {/* Brief Header */}
            <div className="bg-gradient-to-r from-brand-50 to-brand-100 dark:from-brand-900/20 dark:to-brand-800/20 rounded-lg p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">{brief.title}</h2>
              <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
                <span>Primary Keyword: <strong>{brief.primary_keyword}</strong></span>
                <span>Type: <strong>{brief.search_type}</strong></span>
                <span>Target Keywords: <strong>{brief.target_keywords.length}</strong></span>
              </div>
            </div>

            {/* Outline */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Content Outline</h3>
              <div className="space-y-3">
                {brief.outline.map((section, idx) => (
                  <div key={idx} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                      {idx + 1}. {section.heading}
                    </h4>
                    {section.notes && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{section.notes}</p>
                    )}
                    <div className="flex flex-wrap gap-2">
                      {section.keywords.map((kw, i) => (
                        <span
                          key={i}
                          className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded"
                        >
                          {kw}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Keyword Distribution */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Keyword Distribution</h3>
              <div className="space-y-2">
                {brief.keyword_distribution.map((dist, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex-1">
                      <span className="font-medium text-gray-900 dark:text-white">{dist.keyword}</span>
                      <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">({dist.placement})</span>
                    </div>
                    <span className={`px-2 py-1 text-xs rounded ${
                      dist.priority === 'high'
                        ? 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300'
                        : dist.priority === 'medium'
                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300'
                        : 'bg-gray-100 text-gray-700 dark:bg-gray-600 dark:text-gray-300'
                    }`}>
                      {dist.priority}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* SEO Recommendations */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">SEO Recommendations</h3>
              <ul className="space-y-2">
                {brief.seo_recommendations.map((rec, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
                    <span className="text-brand-500 mt-1">•</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <Download className="h-4 w-4" />
                Export Brief
              </button>
              <button
                onClick={handleGenerateBlog}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-500 hover:bg-brand-600 rounded-lg"
              >
                <Send className="h-4 w-4" />
                Generate Blog from Brief
              </button>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
}

