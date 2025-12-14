"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { useBlogPost, useBlogPostMutations } from "@/hooks/useBlogPosts";
import { 
  ArrowLeftIcon,
  DocumentTextIcon,
  PencilIcon,
  ShareIcon,
  TrashIcon,
  EyeIcon,
  CodeBracketIcon,
  XMarkIcon,
  ChevronRightIcon
} from "@heroicons/react/24/outline";
import { useState, useMemo } from "react";
import { Modal } from "@/components/ui/modal/index";
import { ContentAnalysisPanel } from "@/components/content/ContentAnalysisPanel";
import { ContentOptimizationPanel } from "@/components/content/ContentOptimizationPanel";
import { ImageGallery } from "@/components/content/ImageGallery";
import { LinkValidationPanel } from "@/components/content/LinkValidationPanel";
import { SEOMetadataEditor } from "@/components/content/SEOMetadataEditor";
import { QualityDimensionsDisplay } from "@/components/content/QualityDimensionsDisplay";
import { ContentInsightsSidebar } from "@/components/content/ContentInsightsSidebar";
import { extractContentMetadata } from "@/lib/content-metadata-utils";
import type { ContentMetadata } from "@/lib/content-metadata-utils";
import { logger } from "@/utils/logger";
import "./rich-preview.css";

export default function ViewDraftPage() {
  const router = useRouter();
  const params = useParams();
  const draftId = params.id as string;
  const [activeTab, setActiveTab] = useState<'content' | 'preview' | 'analysis' | 'seo' | 'metadata'>('content');
  const [showRawHTML, setShowRawHTML] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copyButtonText, setCopyButtonText] = useState('Copy HTML');
  const [suppliers, setSuppliers] = useState<Array<{ name: string; product: string; url: string }>>([
    { name: '', product: '', url: '' },
  ]);
  
  const { post: draft, loading, error, refetch } = useBlogPost(draftId);
  const { deletePost } = useBlogPostMutations();

  // Extract and compute metadata
  const metadata = draft?.metadata as any;
  const seoData = draft?.seo_data as any;
  
  // Extract content metadata from stored metadata or compute from content
  const contentMetadata = useMemo(() => {
    if (metadata?.content_metadata) {
      return metadata.content_metadata as ContentMetadata;
    }
    if (draft?.content && typeof window !== 'undefined') {
      try {
        return extractContentMetadata(draft.content);
      } catch (error) {
        logger.error('Failed to extract content metadata', { error });
        return null;
      }
    }
    return null;
  }, [metadata, draft?.content]);

  // Merge SEO metadata from multiple sources
  const seoMetadata = {
    ...(seoData?.seo_metadata || {}),
    ...(metadata?.seo_metadata || {}),
    ...(seoData && typeof seoData === 'object' ? {
      meta_title: seoData.meta_title,
      meta_description: seoData.meta_description,
      twitter_card: seoData.twitter_card,
      twitter_title: seoData.twitter_title,
      twitter_description: seoData.twitter_description,
      twitter_image: seoData.twitter_image,
      og_title: seoData.og_title,
      og_description: seoData.og_description,
      og_image: seoData.og_image,
      og_type: seoData.og_type,
    } : {}),
  };
  const structuredData = metadata?.structured_data || seoData?.structured_data;
  const qualityDimensions = metadata?.quality_dimensions;
  const qualityScore = metadata?.quality_score || 57;

  // Extract keywords and topic
  const keywords = Array.isArray(seoData?.keywords) ? seoData.keywords : 
                   (seoData?.keywords ? [seoData.keywords] : []);
  const topic = seoData?.topic || draft?.title || '';

  const derivedWordCount = useMemo(() => {
    if (contentMetadata?.word_count) return contentMetadata.word_count;
    if (!draft?.content) return null;
    try {
      const stripped = draft.content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
      if (!stripped) return null;
      return stripped.split(" ").length;
    } catch {
      return null;
    }
  }, [contentMetadata?.word_count, draft?.content]);

  const readingTime = useMemo(() => {
    if (contentMetadata?.reading_time_minutes) return contentMetadata.reading_time_minutes;
    if (derivedWordCount) return Math.ceil(derivedWordCount / 200);
    return null;
  }, [contentMetadata?.reading_time_minutes, derivedWordCount]);

  const handleEdit = () => {
    router.push(`/contentmanagement/drafts/edit/${draftId}`);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: draft?.title || '',
        text: draft?.excerpt || '',
        url: window.location.href,
      }).catch((err) => {
        logger.error('Share failed', { error: err });
      });
    } else {
      navigator.clipboard.writeText(window.location.href).then(() => {
        alert('Link copied to clipboard!');
      }).catch(() => {
        alert('Share functionality not available');
      });
    }
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
      try {
        const success = await deletePost(draftId);
        if (success) {
          alert('Draft deleted successfully!');
          router.push('/contentmanagement/drafts');
        } else {
          alert('Failed to delete draft. Please try again.');
        }
      } catch (err) {
        logger.error('Error deleting draft', { error: err });
        alert('Error deleting draft. Please try again.');
      }
    }
  };

  // Get featured image URL
  const featuredImageUrl = useMemo(() => {
    const metadataFeaturedImage = metadata && typeof metadata === 'object' 
      ? (metadata.featured_image_url || 
         (metadata.featured_image && typeof metadata.featured_image === 'object' 
           ? metadata.featured_image.image_url || metadata.featured_image.url
           : typeof metadata.featured_image === 'string' 
             ? metadata.featured_image 
             : null))
      : null;
    
    const seoImageUrl = seoData && typeof seoData === 'object'
      ? (seoData.twitter_image || seoData.og_image || seoData.featured_image_url)
      : null;
    
    const contentImageMatch = draft?.content?.match(/<figure class="(blog-featured-image|featured-image)">[\s\S]*?<img[^>]+src="([^"]+)"[^>]*>/i);
    const embeddedImageUrl = contentImageMatch ? contentImageMatch[2] : null;
    
    return metadataFeaturedImage || seoImageUrl || embeddedImageUrl;
  }, [metadata, seoData, draft?.content]);

  if (loading) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading draft...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">Error</h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">{error}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="p-6">
        <div className="text-center py-12">
          <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Draft Not Found</h2>
          <p className="text-gray-600 dark:text-gray-400">The draft you&apos;re looking for doesn&apos;t exist or has been deleted.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Drafts
        </button>
        
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
              {draft.title}
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg">
              {draft.excerpt || 'No excerpt available'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {/* Toggle Sidebar Button */}
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              title={sidebarOpen ? "Hide Content Score" : "Show Content Score"}
            >
              {sidebarOpen ? (
                <>
                  <XMarkIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Hide Score</span>
                </>
              ) : (
                <>
                  <ChevronRightIcon className="w-4 h-4" />
                  <span className="hidden sm:inline">Show Score</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowRawHTML(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            <CodeBracketIcon className="w-4 h-4" />
            View HTML
          </button>
          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PencilIcon className="w-4 h-4" />
            Edit
          </button>
          <button
            onClick={handleShare}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            <ShareIcon className="w-4 h-4" />
            Share
          </button>
          <button
            onClick={handleDelete}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            <TrashIcon className="w-4 h-4" />
            Delete
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-6 border-b border-gray-200 dark:border-gray-700">
        <nav className="flex space-x-8">
          {(['content', 'preview', 'analysis', 'seo', 'metadata'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`py-4 px-1 border-b-2 font-medium text-sm capitalize transition-colors ${
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

      {/* Two Column Layout: Content + Sidebar */}
      <div className={`grid gap-6 transition-all duration-300 ${sidebarOpen ? 'lg:grid-cols-[1fr_400px]' : 'lg:grid-cols-1'}`}>
        {/* Main Content Area */}
        <div className={`transition-all duration-300 ${sidebarOpen ? 'max-w-none' : 'max-w-7xl mx-auto'}`}>
          {/* Content Tab - Full Visibility */}
          {activeTab === 'content' && (
            <div className="space-y-6">
              {/* Featured Image Placeholder */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
                {featuredImageUrl ? (
                  <div className="w-full h-64 md:h-96 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-900 overflow-hidden relative">
                    <img 
                      src={featuredImageUrl} 
                      alt={draft.title}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        logger.warn('Image failed to load', { imageUrl: featuredImageUrl });
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent"></div>
                  </div>
                ) : (
                  <div className="w-full h-48 bg-gradient-to-br from-purple-100 via-blue-100 to-indigo-100 dark:from-purple-900 dark:via-blue-900 dark:to-indigo-900 flex items-center justify-center">
                    <div className="text-center">
                      <DocumentTextIcon className="w-16 h-16 text-gray-400 dark:text-gray-600 mx-auto mb-2" />
                      <p className="text-gray-500 dark:text-gray-400 text-sm">No featured image</p>
                    </div>
                  </div>
                )}
                
                {/* Full Content Display */}
                <article className="blog-content p-6 lg:p-12">
                  <div 
                    dangerouslySetInnerHTML={{ 
                      __html: draft.content || '<p class="text-gray-500 italic">No content available</p>'
                    }}
                    className="prose prose-lg max-w-none dark:prose-invert prose-a:text-blue-600 prose-a:underline dark:prose-a:text-blue-400 hover:prose-a:text-blue-800 dark:hover:prose-a:text-blue-300"
                  />
                </article>
              </div>
            </div>
          )}

          {/* Preview Tab - Webflow-like Rendering */}
          {activeTab === 'preview' && (
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                {/* Webflow-style Preview */}
                <div className="bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    </div>
                    <span className="text-sm text-gray-600 dark:text-gray-400 font-medium">Webflow Preview</span>
                  </div>
                  <button
                    onClick={() => {
                      const htmlContent = generateWebflowHTML();
                      navigator.clipboard.writeText(htmlContent).then(() => {
                        setCopyButtonText('Copied!');
                        setTimeout(() => setCopyButtonText('Copy HTML'), 2000);
                      }).catch((err) => {
                        logger.error('Failed to copy HTML:', err);
                        setCopyButtonText('Copy Failed');
                        setTimeout(() => setCopyButtonText('Copy HTML'), 2000);
                      });
                    }}
                    className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium ${
                      copyButtonText === 'Copied!' 
                        ? 'bg-green-600 hover:bg-green-700 text-white' 
                        : copyButtonText === 'Copy Failed'
                        ? 'bg-red-600 hover:bg-red-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                    }`}
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                    {copyButtonText}
                  </button>
                </div>

                {/* Webflow-style Content Preview */}
                <div className="bg-white dark:bg-gray-800">
                  {featuredImageUrl && (
                    <div className="w-full h-64 md:h-96 bg-gray-100 dark:bg-gray-900 overflow-hidden">
                      <img 
                        src={featuredImageUrl} 
                        alt={draft.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  <div className="max-w-4xl mx-auto px-6 py-12">
                    <h1 className="text-4xl md:text-5xl font-bold text-gray-900 dark:text-white mb-6">
                      {draft.title}
                    </h1>
                    
                    {draft.excerpt && (
                      <p className="text-xl text-gray-600 dark:text-gray-400 mb-8 leading-relaxed">
                        {draft.excerpt}
                      </p>
                    )}

                    <div 
                      className="w-richtext prose prose-lg max-w-none dark:prose-invert prose-headings:font-bold prose-p:leading-relaxed prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-img:rounded-lg prose-img:shadow-xl"
                      dangerouslySetInnerHTML={{ __html: generateWebflowHTML() }}
                    />
                  </div>
                </div>
              </div>

              {/* Supplier References Editor */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Supplier References (optional)</h3>
                  <button
                    type="button"
                    onClick={() => setSuppliers((prev) => [...prev, { name: '', product: '', url: '' }])}
                    className="px-3 py-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
                  >
                    Add supplier
                  </button>
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Add suppliers that provide products for the techniques. They will be appended to the Webflow HTML as a “Recommended Suppliers” section.
                </p>
                <div className="space-y-3">
                  {suppliers.map((supplier, idx) => (
                    <div
                      key={idx}
                      className="grid grid-cols-1 md:grid-cols-12 gap-3 items-start bg-gray-50 dark:bg-gray-900/40 border border-gray-200 dark:border-gray-700 rounded-lg p-3"
                    >
                      <div className="md:col-span-4">
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Name</label>
                        <input
                          type="text"
                          value={supplier.name}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSuppliers((prev) => prev.map((s, i) => (i === idx ? { ...s, name: val } : s)));
                          }}
                          className="mt-1 w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                          placeholder="e.g., Acme Supplies"
                        />
                      </div>
                      <div className="md:col-span-4">
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Product / category</label>
                        <input
                          type="text"
                          value={supplier.product}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSuppliers((prev) => prev.map((s, i) => (i === idx ? { ...s, product: val } : s)));
                          }}
                          className="mt-1 w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                          placeholder="e.g., Concrete repair kits"
                        />
                      </div>
                      <div className="md:col-span-3">
                        <label className="text-xs font-medium text-gray-600 dark:text-gray-300">Link (optional)</label>
                        <input
                          type="url"
                          value={supplier.url}
                          onChange={(e) => {
                            const val = e.target.value;
                            setSuppliers((prev) => prev.map((s, i) => (i === idx ? { ...s, url: val } : s)));
                          }}
                          className="mt-1 w-full px-3 py-2 rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white text-sm"
                          placeholder="https://supplier.com/product"
                        />
                      </div>
                      <div className="md:col-span-1 flex justify-end md:items-center">
                        <button
                          type="button"
                          onClick={() =>
                            setSuppliers((prev) => prev.filter((_, i) => i !== idx))
                          }
                          className="mt-2 md:mt-6 text-sm text-red-600 dark:text-red-400 hover:underline disabled:text-gray-400 disabled:cursor-not-allowed"
                          disabled={suppliers.length === 1}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Analysis Tab */}
          {activeTab === 'analysis' && (
            <div className="space-y-6">
              <ContentAnalysisPanel
                title={draft?.title}
                metaDescription={metadata?.meta_description as string | undefined}
                targetKeyword={seoData?.keywords?.[0] as string | undefined}
                featuredImage={metadata?.featured_image as string | undefined}
                useLocalAnalysis={true}
                content={draft?.content || ''}
                topic={topic}
                keywords={keywords}
                targetAudience={seoData?.target_audience}
              />
              
              <ContentOptimizationPanel
                content={draft.content || ''}
                topic={topic}
                keywords={keywords}
                onOptimized={(optimizedContent) => {
                  logger.debug('Content optimized', { contentLength: optimizedContent?.length });
                }}
              />

              {qualityDimensions && (
                <QualityDimensionsDisplay
                  dimensions={qualityDimensions}
                  overallScore={qualityScore}
                />
              )}
            </div>
          )}

          {/* SEO Tab */}
          {activeTab === 'seo' && (
            <div className="space-y-6">
              <SEOMetadataEditor
                initialMetadata={seoMetadata}
                initialStructuredData={structuredData}
                onSave={(metadata, structuredData) => {
                  logger.debug('SEO metadata saved', { 
                    hasMetadata: !!metadata, 
                    hasStructuredData: !!structuredData 
                  });
                }}
              />
            </div>
          )}

          {/* Metadata Tab */}
          {activeTab === 'metadata' && (
            <div className="space-y-6">
              {contentMetadata && (
                <ImageGallery contentMetadata={contentMetadata} />
              )}
              
              <LinkValidationPanel
                contentMetadata={contentMetadata}
                onRefresh={refetch}
                lastUpdated={draft.updated_at || draft.created_at}
              />
              
              <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Draft Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Status:</span>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
                      draft.status === 'draft' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                      draft.status === 'published' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                      draft.status === 'scheduled' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
                      'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
                    }`}>
                      {draft.status?.charAt(0).toUpperCase() + draft.status?.slice(1)}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Author:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {draft.created_by || 'Unknown'}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Created:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {new Date(draft.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="font-medium text-gray-700 dark:text-gray-300">Last Modified:</span>
                    <span className="ml-2 text-gray-900 dark:text-white">
                      {new Date(draft.updated_at || draft.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {derivedWordCount && (
                    <>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Word Count:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">
                          {derivedWordCount.toLocaleString()}
                        </span>
                      </div>
                      <div>
                        <span className="font-medium text-gray-700 dark:text-gray-300">Read Time:</span>
                        <span className="ml-2 text-gray-900 dark:text-white">
                          {readingTime || Math.ceil(derivedWordCount / 200)} min
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Content Score Sidebar */}
        {sidebarOpen && (
          <div className="lg:sticky lg:top-6 lg:self-start space-y-6">
            <ContentInsightsSidebar
              contentScore={qualityScore}
              wordCount={derivedWordCount}
              readingTimeMinutes={readingTime}
              metadata={metadata}
              seoData={seoData}
              keywords={keywords}
              topic={topic}
            />
          </div>
        )}

        {/* Toggle Sidebar Button (when hidden) */}
        {!sidebarOpen && (
          <div className="fixed right-6 top-1/2 -translate-y-1/2 z-50">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-3 bg-blue-600 text-white rounded-lg shadow-lg hover:bg-blue-700 transition-colors"
              title="Show Content Score"
            >
              <ChevronRightIcon className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      {/* Raw HTML Modal */}
      <Modal
        isOpen={showRawHTML}
        onClose={() => setShowRawHTML(false)}
        className="max-w-4xl"
      >
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <CodeBracketIcon className="w-6 h-6" />
              Raw HTML Code
            </h2>
            <button
              onClick={() => {
                const htmlContent = draft?.content || '';
                navigator.clipboard.writeText(htmlContent).then(() => {
                  setCopyButtonText('Copied!');
                  setTimeout(() => setCopyButtonText('Copy HTML'), 2000);
                }).catch((err) => {
                  logger.error('Failed to copy HTML:', err);
                  setCopyButtonText('Copy Failed');
                  setTimeout(() => setCopyButtonText('Copy HTML'), 2000);
                });
              }}
              className={`px-4 py-2 rounded-lg transition-all flex items-center gap-2 text-sm font-medium ${
                copyButtonText === 'Copied!' 
                  ? 'bg-green-600 hover:bg-green-700 text-white' 
                  : copyButtonText === 'Copy Failed'
                  ? 'bg-red-600 hover:bg-red-700 text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              {copyButtonText}
            </button>
          </div>
          <div className="bg-gray-900 rounded-lg p-4 overflow-auto max-h-[60vh]">
            <pre className="text-green-400 text-sm font-mono whitespace-pre-wrap break-words">
              {draft?.content || 'No content available'}
            </pre>
          </div>
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            This is the raw HTML content stored in the database. Copy it to use in Webflow, WordPress, or other CMS platforms.
          </p>
        </div>
      </Modal>
    </div>
  );

  function generateWebflowHTML(): string {
    if (!draft?.content) return '';
    
    let html = String(draft.content);
    
    // Add featured image if not already in content
    if (featuredImageUrl && !html.includes(featuredImageUrl)) {
      const imageHtml = `<figure class="featured-image"><img src="${featuredImageUrl}" alt="${draft.title}" /></figure>`;
      if (html.includes('</p>')) {
        html = html.replace('</p>', `</p>${imageHtml}`);
      } else {
        html = imageHtml + html;
      }
    }
    
    // Clean up for Webflow
    html = html.replace(/style="[^"]*"/gi, '');
    html = html.replace(/<figure class="featured-image">/g, '<figure>');

    // Remove instruction/prompt preamble if present (common LLM artifact)
    // We strip leading blocks that contain these phrases
    if (typeof window !== 'undefined') {
      const parser = new DOMParser();
      const doc = parser.parseFromString(`<div>${html}</div>`, 'text/html');
      const container = doc.body.firstElementChild;
      if (container) {
        const instructionPatterns = [
          /i'll provide a comprehensive enhancement/i,
          /i will provide a comprehensive enhancement/i,
          /key enhancements/i,
          /enhanced draft/i,
        ];
        let firstChild = container.firstElementChild;
        while (firstChild) {
          const textContent = (firstChild.textContent ?? '').trim();
          const hasInstruction = instructionPatterns.some((p) =>
            p.test(textContent)
          );
          if (!hasInstruction) break;
          container.removeChild(firstChild);
          firstChild = container.firstElementChild;
        }
        html = container.innerHTML;
      }
    }

    // Append supplier section if provided
    const supplierList = suppliers
      .map((s) => ({
        name: s.name?.trim(),
        product: s.product?.trim(),
        url: s.url?.trim(),
      }))
      .filter((s) => s.name || s.product || s.url);

    if (supplierList.length > 0) {
      const supplierHtml = `
        <section class="supplier-references">
          <h2>Recommended Suppliers</h2>
          <ul>
            ${supplierList
              .map((s) => {
                const name = s.name || 'Supplier';
                const product = s.product ? ` – ${s.product}` : '';
                const link = s.url ? ` <a href="${s.url}" target="_blank" rel="noopener">${s.url}</a>` : '';
                return `<li><strong>${name}</strong>${product}${link}</li>`;
              })
              .join('')}
          </ul>
        </section>
      `;
      html = `${html}${supplierHtml}`;
    }

    return formatHtmlForWebflow(html);
  }

  function formatHtmlForWebflow(rawHtml: string): string {
    if (typeof window === 'undefined') return rawHtml;

    const parser = new DOMParser();
    const documentWrapper = parser.parseFromString(`<div>${rawHtml}</div>`, 'text/html');
    const body = documentWrapper.body;

    body.querySelectorAll('*').forEach((el) => {
      el.removeAttribute('style');
      el.removeAttribute('class');

      if (el.tagName === 'FIGURE') {
        const img = el.querySelector('img');
        if (img) {
          const container = documentWrapper.createElement('div');
          container.appendChild(img.cloneNode(true));
          el.replaceWith(container);
        }
      }

      if (el.tagName === 'LI') {
        const firstChild = el.firstElementChild;
        if (firstChild && firstChild.tagName === 'P') {
          while (firstChild.firstChild) {
            el.insertBefore(firstChild.firstChild, firstChild);
          }
          firstChild.remove();
        }
      }
    });

    body.innerHTML = body.innerHTML
      .replace(/(&nbsp;|\s)+/g, (match) => (match.includes('&nbsp;') ? '&nbsp;' : ' '))
      .replace(/<p>\s*<\/p>/g, '');

    const wrapper = documentWrapper.createElement('article');
    wrapper.className = 'w-richtext';
    wrapper.innerHTML = body.innerHTML.trim();

    return wrapper.outerHTML;
  }
}
