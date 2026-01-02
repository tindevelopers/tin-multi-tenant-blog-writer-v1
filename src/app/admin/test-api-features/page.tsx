/**
 * API Features Test Page
 * 
 * Test page for all new API endpoints and components
 */

"use client";

import React, { useState } from 'react';
import { ContentAnalysisPanel } from '@/components/content/ContentAnalysisPanel';
import { ContentOptimizationPanel } from '@/components/content/ContentOptimizationPanel';
import { TableOfContents } from '@/components/content/TableOfContents';
import { ImageGallery } from '@/components/content/ImageGallery';
import { LinkValidationPanel } from '@/components/content/LinkValidationPanel';
import { SEOMetadataEditor } from '@/components/content/SEOMetadataEditor';
import { QualityDimensionsDisplay } from '@/components/content/QualityDimensionsDisplay';
import { useTopicRecommendations } from '@/hooks/useTopicRecommendations';
import { 
  BeakerIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';

export default function TestAPIFeaturesPage() {
  const [activeTab, setActiveTab] = useState<'analyze' | 'optimize' | 'topics' | 'metadata'>('analyze');
  const [testContent, setTestContent] = useState(`# Introduction

This is a test blog post about artificial intelligence and machine learning. AI has revolutionized many industries.

## What is AI?

Artificial intelligence refers to the simulation of human intelligence in machines.

## Machine Learning

Machine learning is a subset of AI that enables systems to learn from data.

### Deep Learning

Deep learning uses neural networks with multiple layers.

## Conclusion

AI and ML will continue to shape our future.`);

  const [testTopic, setTestTopic] = useState('artificial intelligence');
  const [testKeywords, setTestKeywords] = useState('AI, machine learning, deep learning');
  const [topicKeywords, setTopicKeywords] = useState<string[]>(['artificial intelligence', 'machine learning']);
  const [topicResult, setTopicResult] = useState<any>(null);

  const { recommend, loading: topicsLoading, error: topicsError, result: topicsResult } = useTopicRecommendations();

  // Mock content metadata for testing components
  const mockContentMetadata = {
    headings: [
      { level: 1, text: 'Introduction', id: 'introduction' },
      { level: 2, text: 'What is AI?', id: 'what-is-ai' },
      { level: 2, text: 'Machine Learning', id: 'machine-learning' },
      { level: 3, text: 'Deep Learning', id: 'deep-learning' },
      { level: 2, text: 'Conclusion', id: 'conclusion' }
    ],
    images: [
      { url: 'https://placehold.co/800x400/6366f1/ffffff?text=Featured+Image', alt: 'AI Featured Image', type: 'featured' as const },
      { url: 'https://placehold.co/400x300/8b5cf6/ffffff?text=Section+1', alt: 'Section Image 1', type: 'section' as const },
      { url: 'https://placehold.co/400x300/ec4899/ffffff?text=Section+2', alt: 'Section Image 2', type: 'section' as const }
    ],
    links: [
      { url: 'https://example.com/ai-guide', text: 'AI Guide', type: 'external' as const },
      { url: '/blog/machine-learning', text: 'Machine Learning Post', type: 'internal' as const },
      { url: 'invalid-url', text: 'Invalid Link', type: 'external' as const }
    ],
    code_blocks: [
      { language: 'python', code: 'def hello():\n    print("Hello, AI!")' }
    ],
    word_count: 150,
    reading_time_minutes: 1
  };

  const mockQualityDimensions = {
    readability: 85,
    seo: 78,
    structure: 90,
    factual: 82,
    uniqueness: 75,
    engagement: 80
  };

  const mockSEOMetadata = {
    og_title: 'Test Blog Post',
    og_description: 'A test blog post about AI and machine learning',
    og_image: 'https://example.com/image.jpg',
    twitter_card: 'summary_large_image',
    canonical_url: 'https://example.com/blog/test'
  };

  const handleTestTopics = async () => {
    try {
      await recommend({
        keywords: topicKeywords,
        count: 5
      });
    } catch (err) {
      console.error('Topic recommendation failed:', err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
            <BeakerIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              API Features Test Page
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Test all new API endpoints and components
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {(['analyze', 'optimize', 'topics', 'metadata'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Test Content Input */}
      <div className="mb-6 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Test Content
        </h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Content
            </label>
            <textarea
              value={testContent}
              onChange={(e) => setTestContent(e.target.value)}
              rows={10}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter test content here..."
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Topic
              </label>
              <input
                type="text"
                value={testTopic}
                onChange={(e) => setTestTopic(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                placeholder="Enter topic..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Keywords (comma-separated)
              </label>
              <input
                type="text"
                value={testKeywords}
                onChange={(e) => setTestKeywords(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                placeholder="keyword1, keyword2..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
        {/* Analyze Tab */}
        {activeTab === 'analyze' && (
          <div className="space-y-6">
            <ContentAnalysisPanel
              content={testContent}
              topic={testTopic}
              keywords={testKeywords.split(',').map(k => k.trim()).filter(k => k)}
              targetAudience="General audience"
            />
            
            {/* Content Metadata Components */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <TableOfContents contentMetadata={mockContentMetadata} />
              <ImageGallery contentMetadata={mockContentMetadata} />
            </div>
            
            <LinkValidationPanel contentMetadata={mockContentMetadata} />
            
            <QualityDimensionsDisplay 
              dimensions={mockQualityDimensions}
              overallScore={82}
            />
          </div>
        )}

        {/* Optimize Tab */}
        {activeTab === 'optimize' && (
          <ContentOptimizationPanel
            content={testContent}
            topic={testTopic}
            keywords={testKeywords.split(',').map(k => k.trim()).filter(k => k)}
            onOptimized={(optimizedContent) => {
              setTestContent(optimizedContent);
              alert('Content optimized! Check the test content area above.');
            }}
          />
        )}

        {/* Topics Tab */}
        {activeTab === 'topics' && (
          <div className="space-y-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Topic Recommendations
              </h2>
              
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Keywords (one per line)
                </label>
                <textarea
                  value={topicKeywords.join('\n')}
                  onChange={(e) => setTopicKeywords(e.target.value.split('\n').filter(k => k.trim()))}
                  rows={5}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  placeholder="Enter keywords, one per line..."
                />
              </div>

              <button
                onClick={handleTestTopics}
                disabled={topicsLoading || topicKeywords.length === 0}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                {topicsLoading ? (
                  <>
                    <ArrowPathIcon className="w-4 h-4 animate-spin" />
                    Getting Recommendations...
                  </>
                ) : (
                  'Get Topic Recommendations'
                )}
              </button>

              {topicsError && (
                <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                  <div className="flex items-center gap-2">
                    <XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
                    <p className="text-sm text-red-700 dark:text-red-300">{topicsError}</p>
                  </div>
                </div>
              )}

              {topicsResult && topicsResult.topics && (
                <div className="mt-6 space-y-4">
                  <h3 className="text-md font-semibold text-gray-900 dark:text-white">
                    Recommended Topics ({topicsResult.topics.length})
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {topicsResult.topics.map((topic: any, index: number) => (
                      <div
                        key={index}
                        className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 border border-gray-200 dark:border-gray-600"
                      >
                        <h4 className="font-semibold text-gray-900 dark:text-white mb-2">
                          {topic.title}
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                          {topic.description}
                        </p>
                        <div className="flex items-center gap-4 mt-3 text-xs text-gray-500 dark:text-gray-400">
                          <span>Volume: {topic.search_volume?.toLocaleString() || 'N/A'}</span>
                          <span>Difficulty: {topic.difficulty || 'N/A'}</span>
                          <span>Traffic: {topic.estimated_traffic?.toLocaleString() || 'N/A'}</span>
                        </div>
                        {topic.keywords && topic.keywords.length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {topic.keywords.slice(0, 3).map((kw: string, i: number) => (
                              <span
                                key={i}
                                className="px-2 py-0.5 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded text-xs"
                              >
                                {kw}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Metadata Tab */}
        {activeTab === 'metadata' && (
          <div className="space-y-6">
            <SEOMetadataEditor
              initialMetadata={mockSEOMetadata}
              initialStructuredData={{
                '@context': 'https://schema.org',
                '@type': 'Article',
                headline: 'Test Blog Post',
                author: {
                  '@type': 'Person',
                  name: 'Test Author'
                }
              }}
              content={testContent}
              title="Test Blog Post"
              keywords={topicKeywords}
              onSave={(metadata, structuredData) => {
                console.log('Saved metadata:', metadata);
                console.log('Saved structured data:', structuredData);
                alert('SEO metadata saved! Check console for details.');
              }}
            />
          </div>
        )}
      </div>

      {/* Status Footer */}
      <div className="mt-8 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
          <CheckCircleIcon className="w-5 h-5 text-green-600 dark:text-green-400" />
          <span>All components loaded successfully. Test each feature above.</span>
        </div>
      </div>
    </div>
  );
}

