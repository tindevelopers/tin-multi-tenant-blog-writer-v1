"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { 
  ArrowLeftIcon,
  DocumentTextIcon,
  SparklesIcon,
  MagnifyingGlassIcon,
  BoltIcon,
  Cog6ToothIcon
} from "@heroicons/react/24/outline";
import { useBlogPostMutations } from "@/hooks/useBlogPosts";
import { blogWriterAPI } from "@/lib/blog-writer-api";
import BlogResearchPanel from "@/components/blog-writer/BlogResearchPanel";
import ContentSuggestionsPanel from "@/components/blog-writer/ContentSuggestionsPanel";
import EnhancedContentClustersPanel from "@/components/content-clusters/EnhancedContentClustersPanel";
import BrandVoiceSettings from "@/components/blog-writer/BrandVoiceSettings";
import ContentPresetsManager from "@/components/blog-writer/ContentPresetsManager";
import InternalLinkSuggestions from "@/components/blog-writer/InternalLinkSuggestions";
import WorkflowStatusIndicator from "@/components/blog-writer/WorkflowStatusIndicator";
import QuickActionsMenu from "@/components/blog-writer/QuickActionsMenu";
import PlatformSelector from "@/components/blog-writer/PlatformSelector";
import { createClient } from "@/lib/supabase/client";
import type { BlogResearchResults, TitleSuggestion } from "@/lib/keyword-research";
import { useQueueStatusSSE } from "@/hooks/useQueueStatusSSE";
import { logger } from "@/utils/logger";
import BlogFieldConfiguration from "@/components/blog-writer/BlogFieldConfiguration";
import { extractBlogFields, type BlogFieldData } from "@/lib/blog-field-validator";
import MultiPhaseWorkflowPanel from "@/components/workflow/MultiPhaseWorkflowPanel";

type GeneratedContent = {
  title?: string;
  content?: string;
  excerpt?: string;
  meta_title?: string;
  meta_description?: string;
  featured_image?: string;
  seo_score?: number;
  readability_score?: number;
  quality_score?: number;
  word_count?: number;
  metadata?: Record<string, unknown>;
};
// import Alert from "@/components/ui/alert/Alert"; // Unused import

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

  // Map search_type to template_type
  const mapSearchTypeToTemplate = (searchType: string | null): "expert_authority" | "how_to_guide" | "comparison" | "case_study" | "news_update" | "tutorial" | "listicle" | "review" => {
    const mapping: Record<string, "expert_authority" | "how_to_guide" | "comparison" | "case_study" | "news_update" | "tutorial" | "listicle" | "review"> = {
      'how_to': 'how_to_guide',
      'product': 'comparison',
      'comparison': 'comparison',
      'listicle': 'listicle',
      'qa': 'tutorial',
      'brand': 'expert_authority',
      'evergreen': 'expert_authority',
      'seasonal': 'news_update',
      'general': 'expert_authority',
    };
    return mapping[searchType || ''] || 'expert_authority';
  };

  // Handle URL parameters from content clusters page and keyword research
  useEffect(() => {
    if (searchParams) {
      const title = searchParams.get('title');
      const topic = searchParams.get('topic');
      const keywords = searchParams.get('keywords');
      const keyword = searchParams.get('keyword'); // From keyword research
      const search_type = searchParams.get('search_type'); // From keyword research
      const niche = searchParams.get('niche'); // From keyword research
      const target_audience = searchParams.get('target_audience');
      const word_count = searchParams.get('word_count');

      if (title || topic || keywords || keyword || target_audience || word_count || search_type) {
        // URL parameters detected, populating form
        // console.log('🔍 URL parameters detected, populating form:', {
        //   title, topic, keywords, keyword, search_type, niche, target_audience, word_count
        // });

        // Map search_type to template_type if provided
        const templateType = search_type ? mapSearchTypeToTemplate(search_type) : formData.template_type;

        setFormData(prev => ({
          ...prev,
          title: title || keyword || prev.title, // Use keyword if title not provided
          topic: topic || keyword || prev.topic, // Use keyword as topic if not provided
          keywords: keywords || keyword || prev.keywords, // Use keyword if keywords not provided
          target_audience: target_audience || niche || prev.target_audience, // Use niche as target_audience
          word_count: word_count ? parseInt(word_count) : prev.word_count,
          template_type: templateType, // Set template based on search_type
        }));

        // Skip research panel since we already have the data
        setShowResearchPanel(false);
        setShowContentClusters(false);
        setShowContentSuggestions(true);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);
  
  const [formData, setFormData] = useState({
    title: "",
    topic: "",
    keywords: "",
    target_audience: "",
    tone: "professional",
    word_count: 800,
    preset: "seo_focused",
    preset_id: "", // New: Content preset ID
    quality_level: "high",
    content: "",
    excerpt: "",
    include_external_links: true, // Default to true for better SEO
    include_backlinks: true, // Default to true
    backlink_count: 5, // Default number of backlinks
    // Custom instructions and quality features (v1.3.0)
    template_type: "expert_authority" as "expert_authority" | "how_to_guide" | "comparison" | "case_study" | "news_update" | "tutorial" | "listicle" | "review",
    custom_instructions: "",
    length: "medium" as "short" | "medium" | "long" | "very_long",
    use_google_search: false,
    use_fact_checking: false,
    use_citations: false,
    use_serp_optimization: false,
    use_consensus_generation: false,
    use_knowledge_graph: false,
    use_semantic_keywords: false,
    use_quality_scoring: false,
    // Additional blog fields
    slug: "",
    author_name: "",
    author_image: "",
    author_bio: "",
    featured_image: "",
    featured_image_alt: "",
    thumbnail_image: "",
    thumbnail_image_alt: "",
    locale: "en",
    is_featured: false,
    published_at: "",
  });

  const [showFieldConfig, setShowFieldConfig] = useState(false);
  const [blogFieldData, setBlogFieldData] = useState<BlogFieldData>({});

  const [generatedContent, setGeneratedContent] = useState<GeneratedContent | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingType, setGeneratingType] = useState<'test' | 'content' | null>(null); // Track which button triggered generation
  const [savedPostId, setSavedPostId] = useState<string | null>(null);
  const [queueId, setQueueId] = useState<string | null>(null);
  const [queueStatus, setQueueStatus] = useState<string | null>(null);
  const [generationProgress, setGenerationProgress] = useState<{
    percentage: number;
    stage: string;
    status: string | null;
  }>({
    percentage: 0,
    stage: '',
    status: null,
  });
  
  // Use SSE for real-time progress updates when queueId is available
  const { status: sseStatus, progress: sseProgress, stage: sseStage } = useQueueStatusSSE(queueId);
  
  // Update generation progress from SSE
  useEffect(() => {
    if (queueId && sseStatus) {
      setQueueStatus(sseStatus);
      setGenerationProgress({
        percentage: sseProgress,
        stage: sseStage || 'Processing...',
        status: sseStatus,
      });
    }
  }, [queueId, sseStatus, sseProgress, sseStage]);

  // Fetch generated content from queue when generation completes
  useEffect(() => {
    const fetchGeneratedContent = async () => {
      if (!queueId || sseStatus !== 'generated' || generatedContent) {
        return; // Don't fetch if already have content or not ready
      }

      try {
        logger.debug('📥 Fetching generated content from queue:', queueId);
        const response = await fetch(`/api/blog-queue/${queueId}`);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch queue item: ${response.status}`);
        }

        const result = await response.json();
        const queueItem = result.queue_item;

        if (queueItem?.generated_content || queueItem?.generation_metadata) {
          const metadata = queueItem.generation_metadata || {};
          
          // Extract excerpt from multiple possible locations in generation_metadata
          // Priority: excerpt → meta_description → seo_metadata.meta_description → extract from content
          let excerptValue = metadata.excerpt || 
                            metadata.meta_description || 
                            (metadata.seo_metadata && typeof metadata.seo_metadata === 'object' && 'meta_description' in metadata.seo_metadata 
                              ? (metadata.seo_metadata as any).meta_description 
                              : null) ||
                            null;
          
          // If no excerpt found, try to extract first paragraph from content
          if (!excerptValue && queueItem.generated_content) {
            const contentText = queueItem.generated_content.replace(/<[^>]*>/g, '').trim();
            const firstParagraph = contentText.split('\n').find((p: string) => p.trim().length > 50) || 
                                  contentText.substring(0, 200);
            excerptValue = firstParagraph.length > 200 ? firstParagraph.substring(0, 197) + '...' : firstParagraph;
          }
          
          const excerpt: string = excerptValue ? (typeof excerptValue === 'string' ? excerptValue : String(excerptValue)) : '';
          const title = queueItem.generated_title || formData.title || '';
          const content = queueItem.generated_content || '';

          logger.debug('✅ Fetched generated content from queue:', {
            hasContent: !!content,
            hasExcerpt: !!excerpt,
            excerptLength: excerpt.length,
            contentLength: content?.length || 0,
            metadataKeys: Object.keys(metadata),
            excerptSource: metadata.excerpt ? 'excerpt' : metadata.meta_description ? 'meta_description' : 'extracted_from_content',
          });

          const blogContent = {
            title,
            content,
            excerpt,
            meta_description: metadata.meta_description || excerpt,
            seo_score: metadata.seo_score,
            readability_score: metadata.readability_score,
            quality_score: metadata.quality_score,
            word_count: metadata.word_count,
            metadata: metadata,
          };

          setGeneratedContent(blogContent);
          
          // Update form data with generated content including excerpt
          setFormData(prev => ({
            ...prev,
            title: title || prev.title,
            content: content || prev.content,
            excerpt: excerpt || prev.excerpt, // Ensure excerpt is set
          }));

          logger.debug('✅ Updated formData with excerpt:', {
            excerpt: excerpt || 'empty',
            excerptLength: excerpt.length,
          });
        }
      } catch (error) {
        logger.error('❌ Error fetching generated content from queue:', error);
      }
    };

    fetchGeneratedContent();
  }, [queueId, sseStatus, generatedContent]);
  const [approvalId, setApprovalId] = useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [showPlatformSelector, setShowPlatformSelector] = useState(false);
  const [brandVoice, setBrandVoice] = useState<any>(null);
  const [selectedPreset, setSelectedPreset] = useState<any>(null);
  
  // Creation mode: 'quick' = standard generation, 'multi-phase' = 5-phase workflow
  const [creationMode, setCreationMode] = useState<'quick' | 'multi-phase'>('quick');
  
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

  const templateTypes = [
    { value: "expert_authority", label: "Expert Authority", description: "Position as domain expert" },
    { value: "how_to_guide", label: "How-To Guide", description: "Step-by-step instructions" },
    { value: "comparison", label: "Comparison", description: "Structured comparison format" },
    { value: "case_study", label: "Case Study", description: "Real-world examples" },
    { value: "news_update", label: "News Update", description: "Recent developments" },
    { value: "tutorial", label: "Tutorial", description: "Learning objectives" },
    { value: "listicle", label: "Listicle", description: "Numbered/bulleted format" },
    { value: "review", label: "Review", description: "Comprehensive evaluation" }
  ];

  // Auto-enable quality features for premium/enterprise
  const isPremiumQuality = formData.quality_level === 'premium' || formData.quality_level === 'enterprise';

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
    logger.debug('📝 handleBlogGenerated - excerpt check:', {
      hasExcerpt: !!blogContent?.excerpt,
      excerpt: blogContent?.excerpt || 'missing',
      excerptLength: blogContent?.excerpt?.length || 0,
      allKeys: blogContent ? Object.keys(blogContent) : [],
    });
    setGeneratedContent(blogContent);
    
    // Update form data with generated content
    if (blogContent) {
      setFormData(prev => ({
        ...prev,
        title: blogContent.title || prev.title,
        content: blogContent.content || prev.content,
        excerpt: blogContent.excerpt || prev.excerpt || '', // Ensure excerpt is set, default to empty string
      }));
      
      logger.debug('✅ Updated formData with excerpt:', {
        excerpt: blogContent.excerpt || 'empty',
        excerptLength: blogContent.excerpt?.length || 0,
      });
    }
    
    setShowContentSuggestions(false);
  };

  const handleDraftSaved = (draftId: string) => {
    console.log('📝 Draft saved with ID:', draftId);
    // Optionally redirect to drafts page or show success message
    // router.push('/contentmanagement/drafts');
  };

  const handleGenerateTestBlog = async () => {
    setIsGenerating(true);
    setGeneratingType('test');
    try {
      const testTopic = formData.topic || "Test Blog Post";
      
      console.log('🧪 Generating test blog (100 words):', { topic: testTopic });
      
      const result = await blogWriterAPI.generateBlog({
        topic: testTopic,
        keywords: [],
        target_audience: "general",
        tone: "professional",
        word_count: 100, // Test blog: exactly 100 words
        template_type: formData.template_type || "expert_authority",
        length: "short",
        // Disable all advanced features for faster test generation
        use_google_search: false,
        use_fact_checking: false,
        use_citations: false,
        use_serp_optimization: false,
        use_consensus_generation: false,
        use_knowledge_graph: false,
        use_semantic_keywords: false,
        use_quality_scoring: false,
        custom_instructions: "Generate a concise 100-word blog post. Keep it brief and focused.",
      });

      console.log('🧪 Test blog generated:', result);

      // Handle async response
      if (result && (result as any).queue_id) {
        const capturedQueueId = (result as any).queue_id;
        setQueueId(capturedQueueId);
        
        if (result.error || result.status === 'failed') {
          setQueueStatus("failed");
          console.warn('⚠️ Test blog generation failed:', capturedQueueId, result.error);
        } else {
          setQueueStatus("generating");
          console.log('✅ Test blog generation queued:', capturedQueueId);
        }
        
        setIsGenerating(false);
        setGeneratingType(null);
      } else {
        console.error('❌ No queue_id returned from test blog generation:', result);
        setIsGenerating(false);
        setGeneratingType(null);
        alert('Test blog generation failed to start. Please try again.');
      }
    } catch (error) {
      console.error("Error generating test blog:", error);
      setIsGenerating(false);
      setGeneratingType(null);
      alert("Error generating test blog. Please check your connection and try again.");
    }
  };

  const handleGenerateContent = async () => {
    if (!formData.topic) {
      alert("Please enter a topic for your blog post");
      return;
    }

    setIsGenerating(true);
    setGeneratingType('content');
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
        word_count: wordCount,
        preset_id: formData.preset_id || undefined,
        quality_level: formData.quality_level,
        include_external_links: formData.include_external_links,
        include_backlinks: formData.include_backlinks,
        backlink_count: formData.include_backlinks ? formData.backlink_count : undefined,
        // Custom instructions and quality features (v1.3.0)
        template_type: formData.template_type,
        custom_instructions: formData.custom_instructions || undefined,
        length: formData.length,
        use_google_search: isPremiumQuality ? true : formData.use_google_search,
        use_fact_checking: isPremiumQuality ? true : formData.use_fact_checking,
        use_citations: isPremiumQuality ? true : formData.use_citations,
        use_serp_optimization: isPremiumQuality ? true : formData.use_serp_optimization,
        use_consensus_generation: isPremiumQuality ? true : formData.use_consensus_generation,
        use_knowledge_graph: isPremiumQuality ? true : formData.use_knowledge_graph,
        use_semantic_keywords: isPremiumQuality ? true : formData.use_semantic_keywords,
        use_quality_scoring: isPremiumQuality ? true : formData.use_quality_scoring,
      });

      console.log('🔍 Generated result:', result);

      // In async mode, we ALWAYS get a queue_id, even on errors
      // The backend now always returns queue_id in error responses too
      if (result && (result as any).queue_id) {
        const capturedQueueId = (result as any).queue_id;
        setQueueId(capturedQueueId);
        
        // Check if this is an error response
        if (result.error || result.status === 'failed') {
          setQueueStatus("failed");
          console.warn('⚠️ Blog generation failed but queue_id received:', capturedQueueId, result.error);
          // Don't show alert - let the queue UI show the failed status
        } else {
          setQueueStatus("generating");
          console.log('✅ Blog generation queued:', capturedQueueId);
        }
        
        setIsGenerating(false); // Stop loading spinner
        setGeneratingType(null);
        // Don't show alert - let the progress UI handle feedback
        // The SSE hook will update status automatically
      } else {
        // This should rarely happen now, but handle gracefully
        console.error('❌ No queue_id returned from generation:', result);
        setIsGenerating(false);
        setGeneratingType(null);
        alert('Blog generation failed to start. Please try again or check the queue dashboard.');
      }

      // REMOVED: Immediate content handling - async mode never returns content immediately
      // Content will be fetched via queue status when generation completes (handled by existing useEffect)
      
    } catch (error) {
      console.error("Error generating content:", error);
      setIsGenerating(false);
      setGeneratingType(null);
      alert("Error generating content. Please check your connection and try again.");
    }
  };

  const handleRequestApproval = async () => {
    if (!queueId && !savedPostId) {
      alert("Please generate or save the blog first");
      return;
    }

    try {
      const response = await fetch("/api/blog-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queue_id: queueId || null,
          post_id: savedPostId || null,
          review_notes: "",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to request approval");
      }

      const data = await response.json();
      setApprovalId(data.approval_id);
      setApprovalStatus("pending");
      alert("Approval requested successfully!");
    } catch (error) {
      console.error("Error requesting approval:", error);
      alert("Failed to request approval. Please try again.");
    }
  };

  const handlePublish = async (platforms: string[]) => {
    if (!savedPostId && !queueId) {
      alert("Please save the blog first");
      return;
    }

    try {
      for (const platform of platforms) {
        const response = await fetch("/api/blog-publishing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            post_id: savedPostId || null,
            queue_id: queueId || null,
            platform,
            scheduled_at: null,
          }),
        });

        if (!response.ok) {
          throw new Error(`Failed to publish to ${platform}`);
        }
      }

      alert(`Successfully queued for publishing to: ${platforms.join(", ")}`);
      setShowPlatformSelector(false);
    } catch (error) {
      console.error("Error publishing:", error);
      alert("Failed to publish. Please try again.");
    }
  };

  // Prepare field configuration data from current form state
  const prepareFieldConfigData = (): BlogFieldData => {
    const contentToSave = String(formData.content || generatedContent?.content || "");
    const excerptToSave = String(
      formData.excerpt || 
      generatedContent?.excerpt || 
      generatedContent?.meta_description || 
      ""
    );
    const wordCount = generatedContent?.word_count as number || 
                     contentToSave.split(/\s+/).filter(word => word.length > 0).length;

    return extractBlogFields({
      title: formData.title,
      content: contentToSave,
      excerpt: excerptToSave,
      metadata: {
        ...(formData.slug ? { slug: formData.slug } : {}),
        ...(formData.featured_image ? { featured_image: formData.featured_image } : {}),
        ...(formData.featured_image_alt ? { featured_image_alt: formData.featured_image_alt } : {}),
        ...(formData.thumbnail_image ? { thumbnail_image: formData.thumbnail_image } : {}),
        ...(formData.thumbnail_image_alt ? { thumbnail_image_alt: formData.thumbnail_image_alt } : {}),
        ...(formData.author_name ? { author_name: formData.author_name } : {}),
        ...(formData.author_image ? { author_image: formData.author_image } : {}),
        ...(formData.author_bio ? { author_bio: formData.author_bio } : {}),
        locale: formData.locale,
        is_featured: formData.is_featured,
        word_count: wordCount,
        ...(formData.published_at ? { published_at: formData.published_at } : {}),
        ...(generatedContent?.featured_image ? { featured_image: generatedContent.featured_image as string } : {}),
      },
      seo_data: {
        meta_title: generatedContent?.meta_title as string || formData.title,
        meta_description: generatedContent?.meta_description as string || excerptToSave,
      },
      featured_image: generatedContent?.featured_image ? {
        image_url: generatedContent.featured_image as string,
      } : undefined,
      word_count: wordCount,
    });
  };

  const handleFieldConfigSave = (fieldData: BlogFieldData) => {
    // Update formData with configured fields
    setFormData(prev => ({
      ...prev,
      slug: fieldData.slug || prev.slug,
      excerpt: fieldData.excerpt || prev.excerpt,
      featured_image: fieldData.featured_image || prev.featured_image,
      featured_image_alt: fieldData.featured_image_alt || prev.featured_image_alt,
      thumbnail_image: fieldData.thumbnail_image || prev.thumbnail_image,
      thumbnail_image_alt: fieldData.thumbnail_image_alt || prev.thumbnail_image_alt,
      author_name: fieldData.author_name || prev.author_name,
      author_image: fieldData.author_image || prev.author_image,
      author_bio: fieldData.author_bio || prev.author_bio,
      locale: fieldData.locale || prev.locale,
      is_featured: fieldData.is_featured || prev.is_featured,
      published_at: fieldData.published_at || prev.published_at,
    }));
    setBlogFieldData(fieldData);
    setShowFieldConfig(false);
  };

  const handleSaveDraft = async () => {
    if (!formData.title) {
      alert("Please enter a title for your draft");
      return;
    }

    try {
      const contentToSave = String(formData.content || generatedContent?.content || "");
      // Extract excerpt with fallback chain: formData.excerpt → generatedContent.excerpt → generatedContent.meta_description → empty string
      const excerptToSave = String(
        formData.excerpt || 
        generatedContent?.excerpt || 
        generatedContent?.meta_description || 
        ""
      );
      
      // Validate that we have actual content to save
      if (!contentToSave || contentToSave.trim().length === 0) {
        alert("Cannot save draft: No content available. Please generate content first or add some content manually.");
        return;
      }
      
      logger.debug('💾 Saving draft with data:', {
        title: formData.title,
        contentLength: contentToSave.length,
        excerptLength: excerptToSave.length,
        excerpt: excerptToSave || 'empty',
        hasGeneratedContent: !!generatedContent,
        formDataExcerpt: formData.excerpt || 'empty',
        generatedContentExcerpt: generatedContent?.excerpt || 'empty',
        generatedContentMetaDescription: generatedContent?.meta_description || 'empty',
      });
      
      console.log('💾 Saving draft with data:', {
        title: formData.title,
        contentLength: contentToSave.length,
        excerptLength: excerptToSave.length,
        excerpt: excerptToSave || 'empty',
        hasGeneratedContent: !!generatedContent,
        formDataExcerpt: formData.excerpt || 'empty',
        generatedContentExcerpt: generatedContent?.excerpt || 'empty',
        contentPreview: contentToSave.substring(0, 200) + '...'
      });

      // Extract word count from generated content or calculate from content length
      const wordCount = generatedContent?.word_count as number || 
                       contentToSave.split(/\s+/).filter(word => word.length > 0).length;

      // Use configured field data if available, otherwise use formData
      const finalFieldData = Object.keys(blogFieldData).length > 0 ? blogFieldData : prepareFieldConfigData();

      // Build comprehensive draft data with all fields
      const draftData = {
        title: formData.title,
        content: contentToSave,
        excerpt: finalFieldData.excerpt || excerptToSave,
        slug: finalFieldData.slug,
        author_name: finalFieldData.author_name,
        author_image: finalFieldData.author_image,
        author_bio: finalFieldData.author_bio,
        thumbnail_image: finalFieldData.thumbnail_image,
        thumbnail_image_alt: finalFieldData.thumbnail_image_alt,
        locale: finalFieldData.locale || 'en',
        is_featured: finalFieldData.is_featured,
        published_at: finalFieldData.published_at,
        seo_data: {
          topic: formData.topic,
          keywords: formData.keywords.split(',').map(k => k.trim()).filter(k => k),
          target_audience: formData.target_audience || "general",
          tone: formData.tone || "professional",
          meta_title: finalFieldData.seo_title || generatedContent?.meta_title as string || formData.title,
          meta_description: finalFieldData.meta_description || generatedContent?.meta_description as string || excerptToSave,
        },
        metadata: {
          generated_from_research: true,
          research_results: researchResults,
          generation_timestamp: new Date().toISOString(),
          ai_generated: true,
          preset_id: formData.preset_id || null,
          brand_voice_used: !!brandVoice,
          // Additional fields for complete blog creation
          slug: finalFieldData.slug,
          locale: finalFieldData.locale || 'en',
          word_count: wordCount,
          featured_image: finalFieldData.featured_image || generatedContent?.featured_image as string || undefined,
          featured_image_alt: finalFieldData.featured_image_alt,
          thumbnail_image: finalFieldData.thumbnail_image,
          thumbnail_image_alt: finalFieldData.thumbnail_image_alt,
          author_name: finalFieldData.author_name,
          author_image: finalFieldData.author_image,
          author_bio: finalFieldData.author_bio,
          is_featured: finalFieldData.is_featured,
          published_at: finalFieldData.published_at,
        },
        featured_image: finalFieldData.featured_image ? {
          image_url: finalFieldData.featured_image,
          alt_text: finalFieldData.featured_image_alt,
        } : undefined,
        word_count: wordCount,
      };

      console.log('🚀 Calling createDraft with data:', draftData);
      const result = await createDraft(draftData);
      console.log('📝 createDraft result:', result);
      
      if (result) {
        console.log('✅ Draft saved successfully:', result);
        setSavedPostId(result.post_id);
        alert("Draft saved successfully!");
        // Don't redirect immediately - allow user to add internal links
        // router.push("/contentmanagement/drafts");
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
    <div className="relative p-4 sm:p-6 max-w-7xl mx-auto">
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
            
            {/* Creation Mode Toggle */}
            <div className="mt-4 flex items-center gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Mode:</span>
              <div className="flex bg-gray-100 dark:bg-gray-800 rounded-lg p-1">
                <button
                  onClick={() => setCreationMode('quick')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    creationMode === 'quick'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <BoltIcon className="w-4 h-4" />
                  Quick Generate
                </button>
                <button
                  onClick={() => setCreationMode('multi-phase')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                    creationMode === 'multi-phase'
                      ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm'
                      : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                  }`}
                >
                  <Cog6ToothIcon className="w-4 h-4" />
                  Multi-Phase Workflow
                </button>
              </div>
            </div>
            {/* Workflow Status Indicator */}
            {(queueId || approvalId) && (
              <div className="mt-3">
                <WorkflowStatusIndicator
                  queueId={queueId}
                  queueStatus={queueStatus as any}
                  approvalId={approvalId}
                  approvalStatus={approvalStatus as any}
                />
              </div>
            )}
            
          </div>
          <div className="flex items-center space-x-2">
            {/* Quick Actions Menu */}
            {(queueId || approvalId || savedPostId) && (
              <QuickActionsMenu
                queueId={queueId}
                approvalId={approvalId}
                postId={savedPostId}
                status={queueStatus || undefined}
                onRequestApproval={handleRequestApproval}
                onPublish={() => setShowPlatformSelector(true)}
              />
            )}
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

          {/* Multi-Phase Workflow Panel */}
          {creationMode === 'multi-phase' && (
            <div className="mb-8">
              <MultiPhaseWorkflowPanel
                defaultConfig={{
                  topic: formData.topic || formData.title,
                  keywords: formData.keywords ? formData.keywords.split(',').map(k => k.trim()) : [],
                  targetAudience: formData.target_audience,
                  tone: formData.tone,
                  wordCount: formData.word_count,
                  qualityLevel: formData.quality_level,
                }}
                onWorkflowComplete={(state) => {
                  // Handle workflow completion
                  logger.info('Multi-phase workflow completed', { state });
                  if (state.publishingResult?.postId) {
                    setSavedPostId(state.publishingResult.postId);
                  }
                  // Populate form with generated content
                  if (state.contentResult?.content) {
                    setGeneratedContent({
                      title: state.contentResult.title,
                      content: state.contentResult.content,
                      excerpt: state.contentResult.excerpt,
                      word_count: state.contentResult.wordCount,
                    });
                    setFormData(prev => ({
                      ...prev,
                      title: state.contentResult?.title || prev.title,
                      content: state.contentResult?.content || prev.content,
                      excerpt: state.contentResult?.excerpt || prev.excerpt,
                    }));
                  }
                }}
              />
            </div>
          )}

          {/* Research Panel - Only show in quick mode */}
          {creationMode === 'quick' && showResearchPanel && (
            <div className="mb-8">
              <BlogResearchPanel
                onResearchComplete={handleResearchComplete}
                onTitleSelect={handleTitleSelect}
                userId={userId}
              />
            </div>
          )}

          {/* Content Clusters Panel - Only in quick mode */}
          {creationMode === 'quick' && showContentClusters && researchResults && (
            <div className="mb-8">
              <EnhancedContentClustersPanel
                researchResults={researchResults}
                onSuggestionSelect={handleSuggestionSelect}
                onGenerateBlog={handleBlogGenerated}
                onDraftSaved={handleDraftSaved}
              />
            </div>
          )}

          {/* Content Suggestions Panel - Only in quick mode */}
          {creationMode === 'quick' && showContentSuggestions && researchResults && (
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

      {/* Research Results Summary - Only in quick mode */}
      {creationMode === 'quick' && researchResults && !showResearchPanel && (
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

      {/* Quick Mode Form */}
      {creationMode === 'quick' && (
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 xl:gap-8">
        {/* Left Column - Form */}
        <div className="lg:col-span-3 space-y-6">
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

          {/* Brand Voice & Presets */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Brand Voice & Presets
            </h2>
            
            <div className="space-y-4">
              {/* Brand Voice Compact View */}
              <BrandVoiceSettings 
                compact={true}
                onSettingsChange={(settings) => {
                  setBrandVoice(settings);
                  if (settings?.tone) {
                    setFormData(prev => ({ ...prev, tone: settings.tone }));
                  }
                  if (settings?.target_audience) {
                    setFormData(prev => ({ ...prev, target_audience: settings.target_audience }));
                  }
                }}
              />

              {/* Content Preset Selection */}
              <ContentPresetsManager
                compact={true}
                selectedPresetId={formData.preset_id}
                onPresetSelect={(preset) => {
                  setSelectedPreset(preset);
                  if (preset) {
                    setFormData(prev => ({
                      ...prev,
                      preset_id: preset.preset_id || '',
                      word_count: preset.word_count || prev.word_count,
                      quality_level: preset.quality_level || prev.quality_level
                    }));
                  } else {
                    setFormData(prev => ({ ...prev, preset_id: '' }));
                  }
                }}
              />
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
                  Writing Preset (Legacy)
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
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Note: Use Content Preset above for organization-level presets
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Tone {brandVoice && <span className="text-xs text-green-600">(from brand voice)</span>}
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
                  Word Count {selectedPreset && <span className="text-xs text-blue-600">(from preset)</span>}
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

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quality Level {selectedPreset && <span className="text-xs text-blue-600">(from preset)</span>}
                </label>
                <select
                  name="quality_level"
                  value={formData.quality_level}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="standard">Standard</option>
                  <option value="high">High</option>
                  <option value="premium">Premium (Auto-enables all quality features)</option>
                  <option value="enterprise">Enterprise (Auto-enables all quality features)</option>
                </select>
                {isPremiumQuality && (
                  <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                    ✓ All quality features will be automatically enabled
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Template Type
                </label>
                <select
                  name="template_type"
                  value={formData.template_type}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {templateTypes.map(template => (
                    <option key={template.value} value={template.value}>
                      {template.label} - {template.description}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Select the content structure template for your blog post
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Content Length
                </label>
                <select
                  name="length"
                  value={formData.length}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="short">Short (~500-1000 words)</option>
                  <option value="medium">Medium (~1000-2000 words)</option>
                  <option value="long">Long (~2000-3000 words)</option>
                  <option value="very_long">Very Long (3000+ words)</option>
                </select>
              </div>

              {!isPremiumQuality && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                      Quality Features (Optional)
                    </h3>
                    {/* Show count of active features */}
                    {(() => {
                      const activeCount = [
                        formData.use_google_search,
                        formData.use_fact_checking,
                        formData.use_citations,
                        formData.use_serp_optimization,
                        formData.use_consensus_generation,
                        formData.use_knowledge_graph,
                        formData.use_semantic_keywords,
                        formData.use_quality_scoring,
                      ].filter(Boolean).length;
                      return activeCount > 0 ? (
                        <span className="text-xs font-medium px-2 py-1 bg-purple-600 text-white rounded-full">
                          {activeCount} active
                        </span>
                      ) : null;
                    })()}
                  </div>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                    Enable advanced features for better content quality. Premium/Enterprise quality enables all features automatically.
                  </p>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.use_google_search}
                        onChange={(e) => setFormData({ ...formData, use_google_search: e.target.checked })}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Google Search Research</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.use_fact_checking}
                        onChange={(e) => setFormData({ ...formData, use_fact_checking: e.target.checked })}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Fact-Checking</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.use_citations}
                        onChange={(e) => setFormData({ ...formData, use_citations: e.target.checked })}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Citations</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.use_serp_optimization}
                        onChange={(e) => setFormData({ ...formData, use_serp_optimization: e.target.checked })}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">SERP Optimization</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.use_consensus_generation}
                        onChange={(e) => setFormData({ ...formData, use_consensus_generation: e.target.checked })}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        Consensus Generation (GPT-4o + Claude) - Best Quality
                      </span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.use_knowledge_graph}
                        onChange={(e) => setFormData({ ...formData, use_knowledge_graph: e.target.checked })}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Knowledge Graph</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.use_semantic_keywords}
                        onChange={(e) => setFormData({ ...formData, use_semantic_keywords: e.target.checked })}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Semantic Keywords</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={formData.use_quality_scoring}
                        onChange={(e) => setFormData({ ...formData, use_quality_scoring: e.target.checked })}
                        className="w-4 h-4 text-purple-600 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">Quality Scoring</span>
                    </label>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Custom Instructions (Optional)
                </label>
                <textarea
                  name="custom_instructions"
                  value={formData.custom_instructions}
                  onChange={handleInputChange}
                  rows={6}
                  placeholder="Add custom instructions for structure, linking, images, or quality requirements..."
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Leave empty to use default instructions. Premium quality uses default instructions automatically.
                </p>
              </div>
            </div>
          </div>

          {/* External Links & SEO Options */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 border-blue-200 dark:border-blue-800 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
              External Links & SEO Options
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
              Configure external links and backlinks to improve SEO and content credibility
            </p>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <input
                  type="checkbox"
                  id="include_external_links"
                  name="include_external_links"
                  checked={formData.include_external_links}
                  onChange={handleInputChange}
                  className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <label htmlFor="include_external_links" className="block text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
                    Include external links to source documents
                  </label>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Automatically add links to authoritative sources and references in your blog content
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <input
                  type="checkbox"
                  id="include_backlinks"
                  name="include_backlinks"
                  checked={formData.include_backlinks}
                  onChange={handleInputChange}
                  className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <div className="flex-1">
                  <label htmlFor="include_backlinks" className="block text-sm font-medium text-gray-900 dark:text-white cursor-pointer">
                    Include backlinks
                  </label>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                    Add strategic backlinks to improve SEO and content discoverability
                  </p>
                  
                  {formData.include_backlinks && (
                    <div className="mt-3 ml-0">
                      <label htmlFor="backlink_count" className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        Number of backlinks:
                      </label>
                      <input
                        type="number"
                        id="backlink_count"
                        name="backlink_count"
                        value={formData.backlink_count}
                        onChange={handleInputChange}
                        className="w-32 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                        min="1"
                        max="20"
                      />
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        Recommended: 3-7 backlinks per article
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 sm:p-6">
            {/* Generation Progress - Inline when generating */}
            {queueId && queueStatus === "generating" && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-300 flex items-center gap-2">
                    <svg className="animate-spin h-4 w-4 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    {generationProgress.stage || "Processing..."}
                  </span>
                  <span className="text-sm font-semibold text-blue-700 dark:text-blue-400">
                    {generationProgress.percentage}%
                  </span>
                </div>
                <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2.5">
                  <div
                    className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${generationProgress.percentage}%` }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2 text-xs text-blue-600 dark:text-blue-400">
                  <span>Queue ID: {queueId.substring(0, 8)}...</span>
                  <button
                    onClick={() => router.push(`/contentmanagement/blog-queue/${queueId}`)}
                    className="hover:underline font-medium"
                  >
                    View Details →
                  </button>
                </div>
              </div>
            )}
            
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Field Configuration Button */}
              {formData.title && (formData.content || (generatedContent?.content && String(generatedContent.content).trim().length > 0)) && (
                <button
                  onClick={() => {
                    setBlogFieldData(prepareFieldConfigData());
                    setShowFieldConfig(true);
                  }}
                  className="px-4 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
                  title="Configure all blog fields before saving"
                >
                  <Cog6ToothIcon className="w-4 h-4" />
                  Configure Fields
                </button>
              )}
              
              {/* Test Blog Button */}
              <button
                onClick={handleGenerateTestBlog}
                disabled={isGenerating}
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium whitespace-nowrap"
                title="Generate a quick 100-word test blog"
              >
                {generatingType === 'test' ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Testing...
                  </>
                ) : (
                  <>
                    <BoltIcon className="w-4 h-4" />
                    Test (100w)
                  </>
                )}
              </button>
              
              {/* Generate Content Button */}
              <button
                onClick={handleGenerateContent}
                disabled={isGenerating || !formData.topic}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium whitespace-nowrap"
              >
                {generatingType === 'content' ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Generating...
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-4 h-4" />
                    Generate
                  </>
                )}
              </button>
              
              {/* Save as Draft Button */}
              <button
                onClick={handleSaveDraft}
                disabled={creatingPost || !formData.title}
                className="px-4 py-2.5 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg flex items-center justify-center gap-2 transition-colors text-sm font-medium whitespace-nowrap"
              >
                <DocumentTextIcon className="w-4 h-4" />
                {creatingPost ? "Saving..." : "Save Draft"}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Generated Content Preview */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Generated Content
            </h2>
            
            {generatedContent ? (
              <div className="space-y-4">
                {generatedContent.title != null && String(generatedContent.title).trim() !== '' && (
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Title:</h3>
                    <p className="text-gray-700 dark:text-gray-300">{String(generatedContent.title)}</p>
                  </div>
                )}
                {generatedContent.excerpt != null && String(generatedContent.excerpt).trim() !== '' && (
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Excerpt:</h3>
                    <p className="text-gray-700 dark:text-gray-300">{String(generatedContent.excerpt)}</p>
                  </div>
                )}
                {generatedContent.content != null && String(generatedContent.content).trim() !== '' && (
                  <div>
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Content:</h3>
                    <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg max-h-96 overflow-y-auto">
                      <div className="prose dark:prose-invert max-w-none">
                        <div className="whitespace-pre-wrap text-sm text-gray-700 dark:text-gray-300">
                          {String(generatedContent.content)}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {generatedContent.metadata != null && (
                  <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-2 text-sm">Generation Info:</h3>
                    <div className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                      {Boolean((generatedContent.metadata as Record<string, unknown>).used_brand_voice) && (
                        <div>✓ Brand voice applied</div>
                      )}
                      {Boolean((generatedContent.metadata as Record<string, unknown>).used_preset) && (
                        <div>✓ Content preset applied</div>
                      )}
                      {Boolean((generatedContent.metadata as Record<string, unknown>).enhanced) && (
                        <div>✓ Enhanced generation used</div>
                      )}
                    </div>
                  </div>
                )}
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

          {/* Internal Link Suggestions */}
          {savedPostId && generatedContent?.content != null && String(generatedContent.content).trim() !== '' && (
            <InternalLinkSuggestions
              postId={savedPostId}
              content={String(generatedContent.content)}
              compact={true}
              onLinkAdd={(link) => {
                console.log('Internal link added:', link);
              }}
            />
          )}

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
      )}

      {/* Platform Selector Modal */}
      {showPlatformSelector && (
        <PlatformSelector
          onSelect={handlePublish}
          onCancel={() => setShowPlatformSelector(false)}
        />
      )}

      {/* Field Configuration Modal */}
      <BlogFieldConfiguration
        initialData={blogFieldData}
        onSave={handleFieldConfigSave}
        onCancel={() => setShowFieldConfig(false)}
        show={showFieldConfig}
      />
    </div>
  );
}

export default function NewDraftPage() {
  return (
    <Suspense fallback={
      <div className="p-4 sm:p-6 max-w-7xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-48"></div>
          <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-8 w-64"></div>
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 xl:gap-8">
            <div className="lg:col-span-3 space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-32"></div>
                <div className="space-y-4">
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                  <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              </div>
            </div>
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded mb-4 w-40"></div>
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
