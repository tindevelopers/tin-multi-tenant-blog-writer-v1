"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ArrowLeftIcon,
  DocumentTextIcon,
  SparklesIcon,
  MagnifyingGlassIcon
} from "@heroicons/react/24/outline";
import { useBlogPostMutations } from "@/hooks/useBlogPosts";
import { blogWriterAPI } from "@/lib/blog-writer-api";
import BlogResearchPanel from "@/components/blog-writer/BlogResearchPanel";
import ContentSuggestionsPanel from "@/components/blog-writer/ContentSuggestionsPanel";
import EnhancedContentClustersPanel from "@/components/content-clusters/EnhancedContentClustersPanel";
import { createClient } from "@/lib/supabase/client";
import type { BlogResearchResults, TitleSuggestion } from "@/lib/keyword-research";

function NewDraftContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { createDraft, loading: creatingPost } = useBlogPostMutations();
  const [userId, setUserId] = useState<string | undefined>(undefined);
  
  // Get current user ID
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
      }
    });
  }, []);

  // Handle URL parameters from content clusters page
  useEffect(() => {
    if (searchParams) {
      const title = searchParams.get('title');
      const topic = searchParams.get('topic');
      const keywords = searchParams.get('keywords');
      const target_audience = searchParams.get('target_audience');
      const word_count = searchParams.get('word_count');

      if (title || topic || keywords || target_audience || word_count) {
        console.log('🔍 URL parameters detected, populating form:', {
          title, topic, keywords, target_audience, word_count
        });

        setFormData(prev => ({
          ...prev,
          title: title || prev.title,
          topic: topic || prev.topic,
          keywords: keywords || prev.keywords,
          target_audience: target_audience || prev.target_audience,
          word_count: word_count ? parseInt(word_count) : prev.word_count
        }));

        // Skip research panel since we already have the data
        setShowResearchPanel(false);
        setShowContentClusters(false);
        setShowContentSuggestions(true);
      }
    }
  }, [searchParams]);
  
  const [formData, setFormData] = useState({
    title: "",
    topic: "",
    keywords: "",
    target_audience: "",
    tone: "professional",
    word_count: 800,
    preset: "seo_focused",
    quality_level: "high",
    content: "",
    excerpt: ""
  });

  const [generatedContent, setGeneratedContent] = useState<Record<string, unknown> | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Research workflow state
  const [researchResults, setResearchResults] = useState<BlogResearchResults | null>(null);
  const [showResearchPanel, setShowResearchPanel] = useState(true);
  const [showContentSuggestions, setShowContentSuggestions] = useState(false);
  const [showContentClusters, setShowContentClusters] = useState(false);

  const presets = [
    { value: "seo_focused", label: "SEO Focused", description: "Optimized for search engines" },
    { value: "engagement_focused", label: "Engagement Focused", description: "High engagement and shares" },
    { value: "conversion_focused", label: "Conversion Focused", description: "Drives action and sales" },
    { value: "technical_writer", label: "Technical Writer", description: "Technical and detailed content" },
    { value: "creative_writer", label: "Creative Writer", description: "Creative and storytelling" },
    { value: "enterprise_writer", label: "Enterprise Writer", description: "Professional business content" },
    { value: "startup_writer", label: "Startup Writer", description: "Dynamic and innovative" },
    { value: "minimal_writer", label: "Minimal Writer", description: "Clean and concise" }
  ];

  const tones = [
    { value: "professional", label: "Professional" },
    { value: "casual", label: "Casual" },
    { value: "friendly", label: "Friendly" },
    { value: "authoritative", label: "Authoritative" },
    { value: "conversational", label: "Conversational" },
    { value: "humorous", label: "Humorous" }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'word_count' ? parseInt(value) || 800 : value
    }));
  };

  // Research workflow handlers
  const handleResearchComplete = (results: BlogResearchResults) => {
    console.log('🎯 Research completed, setting results:', results);
    console.log('🔍 Research results structure:', {
      keyword_analysis: results.keyword_analysis,
      title_suggestions: results.title_suggestions,
      content_strategy: results.content_strategy,
      seo_insights: results.seo_insights
    });
    setResearchResults(results);
    setShowResearchPanel(false);
    setShowContentClusters(true);
    
    // Auto-populate form with research insights
    if (results.seo_insights.primary_keyword) {
      setFormData(prev => ({
        ...prev,
        keywords: results.seo_insights.secondary_keywords.join(', '),
        word_count: results.seo_insights.content_length_recommendation
      }));
    }
  };

  const handleTitleSelect = (title: TitleSuggestion) => {
    setFormData(prev => ({ ...prev, title: title.title }));
  };

  // Content suggestions handlers
  const handleSuggestionSelect = (suggestion: any) => {
    console.log('🔍 handleSuggestionSelect called with suggestion:', {
      suggestion,
      suggestionKeys: suggestion ? Object.keys(suggestion) : 'No suggestion object',
      secondary_keywords: suggestion?.secondary_keywords,
      secondary_keywordsType: typeof suggestion?.secondary_keywords,
      target_keyword: suggestion?.target_keyword,
      primary_keyword: suggestion?.primary_keyword
    });

    // Safely handle secondary_keywords - it might not exist or might not be an array
    const keywords = suggestion.secondary_keywords 
      ? Array.isArray(suggestion.secondary_keywords) 
        ? suggestion.secondary_keywords.join(', ')
        : String(suggestion.secondary_keywords)
      : suggestion.target_keyword || suggestion.primary_keyword || '';

    console.log('🔍 Processed keywords:', keywords);

    setFormData(prev => ({
      ...prev,
      title: suggestion.title || '',
      topic: suggestion.primary_keyword || suggestion.target_keyword || '',
      keywords: keywords,
      target_audience: suggestion.target_audience || 'general',
      word_count: suggestion.word_count_target || suggestion.estimated_word_count || 1500,
      content: suggestion.content || '',
      excerpt: suggestion.excerpt || ''
    }));
    setShowContentSuggestions(false);
  };

  const handleBlogGenerated = (blogContent: any) => {
    console.log('📝 handleBlogGenerated called with:', blogContent);
    setGeneratedContent(blogContent);
    
    // Update form data with generated content
    if (blogContent) {
      setFormData(prev => ({
        ...prev,
        title: blogContent.title || prev.title,
        content: blogContent.content || prev.content,
        excerpt: blogContent.excerpt || prev.excerpt
      }));
    }
    
    setShowContentSuggestions(false);
  };

  const handleDraftSaved = (draftId: string) => {
    console.log('📝 Draft saved with ID:', draftId);
    // Optionally redirect to drafts page or show success message
    // router.push('/admin/drafts');
  };

  const handleGenerateContent = async () => {
    if (!formData.topic) {
      alert("Please enter a topic for your blog post");
      return;
    }

    setIsGenerating(true);
    try {
      // Use research results if available, otherwise use form data
      let keywords: string[] = [];
      let targetAudience = formData.target_audience;
      let wordCount = formData.word_count;

      if (researchResults) {
        // Use research insights
        keywords = researchResults.seo_insights.secondary_keywords;
        targetAudience = researchResults.content_strategy.target_audience;
        wordCount = researchResults.seo_insights.content_length_recommendation;
        
        // Add primary keyword
        keywords.unshift(researchResults.seo_insights.primary_keyword);
      } else {
        // Fallback to form data
        keywords = formData.keywords.split(',').map(k => k.trim()).filter(k => k);
      }
      
      console.log('🚀 Generating content with research insights:', {
        topic: formData.topic,
        keywords,
        targetAudience,
        tone: formData.tone,
        wordCount
      });
      
      const result = await blogWriterAPI.generateBlog({
        topic: formData.topic,
        keywords: keywords.length > 0 ? keywords : undefined,
        target_audience: targetAudience || undefined,
        tone: formData.tone,
        word_count: wordCount
      });

      console.log('🔍 Generated result:', result);

      if (result && result.content && typeof result.content === 'string' && result.content.trim().length > 0) {
        setGeneratedContent(result);
        
        // Update form data with generated content
        setFormData(prev => ({
          ...prev,
          content: String(result.content || ""),
          excerpt: String(result.excerpt || ""),
          title: String(result.title || prev.title)
        }));
        
        console.log('✅ Content updated in form data:', {
          contentLength: String(result.content || "").length,
          excerpt: String(result.excerpt || ""),
          title: result.title || 'No title from result',
          fullContent: String(result.content || "").substring(0, 500) + '...'
        });
      } else {
        console.error('❌ Generated result is empty or invalid:', {
          hasResult: !!result,
          hasContent: !!(result?.content),
          contentLength: (result?.content && typeof result.content === 'string') ? result.content.length : 0,
          resultKeys: result ? Object.keys(result) : 'No result'
        });
        alert("Failed to generate content. The API returned empty content. Please try again.");
      }
    } catch (error) {
      console.error("Error generating content:", error);
      alert("Error generating content. Please check your connection and try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!formData.title) {
      alert("Please enter a title for your draft");
      return;
    }

    try {
      const contentToSave = String(formData.content || generatedContent?.content || "");
      const excerptToSave = String(formData.excerpt || generatedContent?.excerpt || "");
      
      // Validate that we have actual content to save
      if (!contentToSave || contentToSave.trim().length === 0) {
        alert("Cannot save draft: No content available. Please generate content first or add some content manually.");
        return;
      }
      
      console.log('💾 Saving draft with data:', {
        title: formData.title,
        contentLength: contentToSave.length,
        excerptLength: excerptToSave.length,
        hasGeneratedContent: !!generatedContent,
        formDataContent: formData.content,
        generatedContent: generatedContent?.content,
        contentPreview: contentToSave.substring(0, 200) + '...'
      });

      const draftData = {
        title: formData.title,
        content: contentToSave,
        excerpt: excerptToSave,
        seo_data: {
          topic: formData.topic,
          keywords: formData.keywords.split(',').map(k => k.trim()).filter(k => k),
          target_audience: formData.target_audience || "general",
          tone: formData.tone || "professional"
        },
        metadata: {
          generated_from_research: true,
          research_results: researchResults,
          generation_timestamp: new Date().toISOString(),
          ai_generated: true
        }
      };

      console.log('🚀 Calling createDraft with data:', draftData);
      const result = await createDraft(draftData);
      console.log('📝 createDraft result:', result);
      
      if (result) {
        console.log('✅ Draft saved successfully:', result);
        alert("Draft saved successfully!");
        router.push("/admin/drafts");
      } else {
        console.log('❌ createDraft returned null/undefined');
        alert("Failed to save draft. Please try again.");
      }
    } catch (error) {
      console.error("Error saving draft:", error);
      alert("Error saving draft. Please try again.");
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Drafts
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Create New Draft
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Use AI to generate content or start from scratch
            </p>
          </div>
          <div className="flex items-center space-x-2">
            {researchResults && (
              <button
                onClick={() => setShowContentSuggestions(!showContentSuggestions)}
                className="flex items-center px-3 py-2 text-sm font-medium text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 transition-colors"
              >
                <SparklesIcon className="w-4 h-4 mr-2" />
                {showContentSuggestions ? 'Hide Suggestions' : 'Show Suggestions'}
              </button>
            )}
            <button
              onClick={() => setShowResearchPanel(!showResearchPanel)}
              className="flex items-center px-3 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 transition-colors"
            >
              <MagnifyingGlassIcon className="w-4 h-4 mr-2" />
              {showResearchPanel ? 'Hide Research' : 'Show Research'}
            </button>
          </div>
        </div>
      </div>

          {/* Research Panel */}
          {showResearchPanel && (
            <div className="mb-8">
              <BlogResearchPanel
                onResearchComplete={handleResearchComplete}
                onTitleSelect={handleTitleSelect}
                userId={userId}
              />
            </div>
          )}

          {/* Content Clusters Panel */}
          {showContentClusters && researchResults && (
            <div className="mb-8">
              <EnhancedContentClustersPanel
                researchResults={researchResults}
                onSuggestionSelect={handleSuggestionSelect}
                onGenerateBlog={handleBlogGenerated}
                onDraftSaved={handleDraftSaved}
              />
            </div>
          )}

          {/* Content Suggestions Panel */}
          {showContentSuggestions && researchResults && (
            <div className="mb-8">
              <ContentSuggestionsPanel
                researchResults={researchResults}
                targetAudience={formData.target_audience || "general"}
                onSuggestionSelect={handleSuggestionSelect}
                onBlogGenerated={handleBlogGenerated}
                onDraftSaved={handleDraftSaved}
              />
            </div>
          )}

      {/* Research Results Summary */}
      {researchResults && !showResearchPanel && (
        <div className="mb-8 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-green-900 dark:text-green-300">
                Research Complete ✅
              </h3>
              <p className="text-sm text-green-700 dark:text-green-400">
                SEO Score: {researchResults.keyword_analysis.overall_score}/100 | 
                Keywords: {Object.keys(researchResults.keyword_analysis.keyword_analysis).length} | 
                Titles: {researchResults.title_suggestions.length}
              </p>
            </div>
            <button
              onClick={() => setShowResearchPanel(true)}
              className="text-sm text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300"
            >
              View Details
            </button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Left Column - Form */}
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Basic Information
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Draft Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter your draft title..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Topic *
                </label>
                <input
                  type="text"
                  name="topic"
                  value={formData.topic}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="What is your blog post about?"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Keywords
                </label>
                <input
                  type="text"
                  name="keywords"
                  value={formData.keywords}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter keywords separated by commas"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target Audience
                </label>
                <input
                  type="text"
                  name="target_audience"
                  value={formData.target_audience}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Who is your target audience?"
                />
              </div>
            </div>
          </div>

          {/* Content Settings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Content Settings
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Writing Preset
                </label>
                <select
                  name="preset"
                  value={formData.preset}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {presets.map(preset => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label} - {preset.description}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tone
                </label>
                <select
                  name="tone"
                  value={formData.tone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {tones.map(tone => (
                    <option key={tone.value} value={tone.value}>
                      {tone.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Word Count
                </label>
                <input
                  type="number"
                  name="word_count"
                  value={formData.word_count}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  min="100"
                  max="3000"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <button
                onClick={handleGenerateContent}
                disabled={isGenerating || !formData.topic}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <SparklesIcon className="w-4 h-4" />
                {isGenerating ? "Generating..." : "Generate Content"}
              </button>
              
              <button
                onClick={handleSaveDraft}
                disabled={creatingPost || !formData.title}
                className="flex-1 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <DocumentTextIcon className="w-4 h-4" />
                {creatingPost ? "Saving..." : "Save as Draft"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Generated Content Preview */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Generated Content
            </h2>
            
            {generatedContent ? (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Response:</h3>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg max-h-96 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                      {JSON.stringify(generatedContent, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <SparklesIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 dark:text-gray-400">
                  Generated content will appear here
                </p>
              </div>
            )}
          </div>

          {/* API Status */}
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
            <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
              Blog Writer API Status
            </h3>
            <div className="text-sm text-blue-700 dark:text-blue-400">
              <div>✅ Connected to Blog Writer API</div>
              <div>🎯 8 Writing Presets Available</div>
              <div>🚀 AI Content Generation Ready</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function NewDraftPage() {
  return (
    <Suspense fallback={
      <div className="p-6 max-w-4xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-8"></div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                <div className="space-y-4">
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4"></div>
                <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    }>
      <NewDraftContent />
    </Suspense>
  );
}
