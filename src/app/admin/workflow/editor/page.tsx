"use client";

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { logger } from '@/utils/logger';
import { 
  FileText, 
  ArrowRight, 
  ArrowLeft,
  Save,
  Sparkles,
  Eye,
  CheckCircle2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { blogWriterAPI } from '@/lib/blog-writer-api';
import { useBlogPostMutations } from '@/hooks/useBlogPosts';
import BrandVoiceSettings from '@/components/blog-writer/BrandVoiceSettings';
import ContentPresetsManager from '@/components/blog-writer/ContentPresetsManager';
import InternalLinkSuggestions from '@/components/blog-writer/InternalLinkSuggestions';
import WorkflowStatusIndicator from '@/components/blog-writer/WorkflowStatusIndicator';
import QuickActionsMenu from '@/components/blog-writer/QuickActionsMenu';
import PlatformSelector from '@/components/blog-writer/PlatformSelector';
import Alert from '@/components/ui/alert/Alert';
import TipTapEditor from '@/components/blog-writer/TipTapEditor';
import { InternalLinksDisplay } from '@/components/blog-writer/InternalLinksDisplay';
import { GeneratedImagesDisplay } from '@/components/blog-writer/GeneratedImagesDisplay';
import { ContentStructureDisplay } from '@/components/blog-writer/ContentStructureDisplay';
import { InterlinkingRecommendations } from '@/components/integrations/InterlinkingRecommendations';
import type { EnhancedBlogResponse } from '@/types/blog-generation';

export default function EditorPage() {
  const router = useRouter();
  const { createDraft, loading: creatingPost } = useBlogPostMutations();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  interface WorkflowSession {
    session_id?: string;
    target_audience?: string;
    workflow_data?: {
      content_goal?: string;
      content_strategy?: {
        main_keyword?: string;
        secondary_keywords?: string;
        target_audience?: string;
      };
      selected_topics?: Array<{
        id?: string;
        title: string;
        target_keywords?: string[];
        word_count_estimate?: number;
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  }

  interface ContentStrategy {
    main_keyword?: string;
    secondary_keywords?: string;
    target_audience?: string;
    [key: string]: unknown;
  }

  const [workflowSession, setWorkflowSession] = useState<WorkflowSession | null>(null);
  const [strategy, setStrategy] = useState<ContentStrategy | null>(null);
  const [userId, setUserId] = useState<string | undefined>(undefined);
  
  const [formData, setFormData] = useState({
    title: '',
    topic: '',
    keywords: '',
    target_audience: '',
    tone: 'professional',
    word_count: 1500,
    content: '',
    excerpt: '',
    include_external_links: true,
    include_backlinks: true,
    backlink_count: 5,
    quality_level: 'high', // Default to high quality
    preset: '', // Optional preset (legacy)
    preset_id: '', // Content preset ID from database
    featuredImage: null as { image_url?: string; alt_text?: string; image_id?: string; width?: number; height?: number } | null,
    // Custom instructions and quality features (v1.3.0)
    template_type: 'expert_authority' as 'expert_authority' | 'how_to_guide' | 'comparison' | 'case_study' | 'news_update' | 'tutorial' | 'listicle' | 'review',
    custom_instructions: '',
    length: 'medium' as 'short' | 'medium' | 'long' | 'very_long',
    use_google_search: false,
    use_fact_checking: false,
    use_citations: false,
    use_serp_optimization: false,
    use_consensus_generation: false,
    use_knowledge_graph: false,
    use_semantic_keywords: false,
    use_quality_scoring: false,
    // Product research features
    include_product_research: false,
    include_brands: true,
    include_models: true,
    include_prices: true,
    include_features: true,
    include_reviews: true,
    include_pros_cons: true,
    include_product_table: true,
    include_comparison_section: true,
    include_buying_guide: true,
    include_faq_section: true,
    research_depth: 'comprehensive' as 'basic' | 'standard' | 'comprehensive',
  });

  const [qualityLevels, setQualityLevels] = useState<Array<{ value: string; label: string; description?: string }>>([]);
  const [presets, setPresets] = useState<Array<{ value: string; label: string; description?: string }>>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  interface BrandVoice {
    id?: string;
    name?: string;
    tone?: string;
    style?: string;
    [key: string]: unknown;
  }

  interface ContentPreset {
    preset_id?: string;
    id?: string;
    name?: string;
    description?: string;
    word_count?: number;
    quality_level?: string;
    [key: string]: unknown;
  }

  const [brandVoice, setBrandVoice] = useState<BrandVoice | null>(null);
  const [selectedPreset, setSelectedPreset] = useState<ContentPreset | null>(null);
  const [savedPostId, setSavedPostId] = useState<string | null>(null);
  const [queueId, setQueueId] = useState<string | null>(null);
  const [queueStatus, setQueueStatus] = useState<string | null>(null);
  const [approvalId, setApprovalId] = useState<string | null>(null);
  const [approvalStatus, setApprovalStatus] = useState<string | null>(null);
  const [showPlatformSelector, setShowPlatformSelector] = useState(false);
  const [generationResult, setGenerationResult] = useState<EnhancedBlogResponse | null>(null);
  const [selectedIntegrationId, setSelectedIntegrationId] = useState<string | null>(null);
  const [orgId, setOrgId] = useState<string | undefined>(undefined);

  const tones = [
    { value: 'professional', label: 'Professional' },
    { value: 'casual', label: 'Casual' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'authoritative', label: 'Authoritative' },
    { value: 'conversational', label: 'Conversational' }
  ];

  const templateTypes = [
    { value: 'expert_authority', label: 'Expert Authority', description: 'Position as domain expert' },
    { value: 'how_to_guide', label: 'How-To Guide', description: 'Step-by-step instructions' },
    { value: 'comparison', label: 'Comparison', description: 'Structured comparison format' },
    { value: 'case_study', label: 'Case Study', description: 'Real-world examples' },
    { value: 'news_update', label: 'News Update', description: 'Recent developments' },
    { value: 'tutorial', label: 'Tutorial', description: 'Learning objectives' },
    { value: 'listicle', label: 'Listicle', description: 'Numbered/bulleted format' },
    { value: 'review', label: 'Review', description: 'Comprehensive evaluation' }
  ];

  // Auto-enable quality features for premium/enterprise
  const isPremiumQuality = useMemo(() => 
    formData.quality_level === 'premium' || formData.quality_level === 'enterprise',
    [formData.quality_level]
  );

  // Load workflow session and strategy
  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          
          // Get user's org_id
          const { data: userProfile } = await supabase
            .from('users')
            .select('org_id')
            .eq('user_id', user.id)
            .single();
          
          if (userProfile?.org_id) {
            setOrgId(userProfile.org_id);
          }
        }

        const sessionId = localStorage.getItem('workflow_session_id');
        if (sessionId) {
          const { data: session, error: sessionError } = await supabase
            .from('workflow_sessions')
            .select('*')
            .eq('session_id', sessionId)
            .maybeSingle();

          if (sessionError && sessionError.code !== 'PGRST116') {
            // Session error logged silently - session may not exist yet
          }

          if (session) {
            setWorkflowSession(session);
            const workflowData = session.workflow_data || {};
            const contentGoal = workflowData.content_goal || 'seo';
            const contentStrategy = workflowData.content_strategy || {};
            setStrategy(contentStrategy);

            // Pre-populate form with strategy data
            if (contentStrategy.main_keyword) {
              setFormData(prev => ({
                ...prev,
                title: workflowData.selected_topics?.[0]?.title || '',
                topic: contentStrategy.main_keyword,
                keywords: contentStrategy.secondary_keywords || '',
                target_audience: contentStrategy.target_audience || session.target_audience || '',
                word_count: workflowData.selected_topics?.[0]?.word_count_estimate || 1500
              }));
            }
          } else if (sessionError?.code === 'PGRST116') {
            // Session doesn't exist - clear localStorage
            localStorage.removeItem('workflow_session_id');
          }
        }
      } catch (error) {
        // Error loading data - set error state for UI
        setError('Failed to load editor data');
      }
    };

    loadData();
  }, []);

  // Load quality levels and presets
  useEffect(() => {
    const loadQualityOptions = async () => {
      setLoadingOptions(true);
      try {
        // Fetch quality levels
        const qualityLevelsData = await blogWriterAPI.getQualityLevels();
        if (Array.isArray(qualityLevelsData) && qualityLevelsData.length > 0) {
          setQualityLevels(qualityLevelsData.map((level: { id?: string; value?: string; name?: string; label?: string; description?: string }) => ({
            value: level.id || level.value || level.name || String(level),
            label: level.label || level.name || level.description || String(level),
            description: level.description
          })));
        } else {
          // Fallback to default quality levels if API doesn't return any
          setQualityLevels([
            { value: 'low', label: 'Low (Fast)', description: 'Quick generation, basic quality' },
            { value: 'medium', label: 'Medium (Balanced)', description: 'Good balance of speed and quality' },
            { value: 'high', label: 'High (Recommended)', description: 'Best quality, may take longer' },
            { value: 'premium', label: 'Premium (Best)', description: 'Highest quality, uses advanced models' }
          ]);
        }

        // Fetch presets
        const presetsData = await blogWriterAPI.getPresets();
        if (Array.isArray(presetsData) && presetsData.length > 0) {
          setPresets(presetsData.map((preset: { id?: string; value?: string; name?: string; label?: string; description?: string }) => ({
            value: preset.id || preset.value || preset.name || String(preset),
            label: preset.label || preset.name || preset.description || String(preset),
            description: preset.description
          })));
        }
      } catch (error) {
        logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
          context: 'load-quality-options',
        });
        // Set default quality levels on error
        setQualityLevels([
          { value: 'low', label: 'Low (Fast)', description: 'Quick generation, basic quality' },
          { value: 'medium', label: 'Medium (Balanced)', description: 'Good balance of speed and quality' },
          { value: 'high', label: 'High (Recommended)', description: 'Best quality, may take longer' },
          { value: 'premium', label: 'Premium (Best)', description: 'Highest quality, uses advanced models' }
        ]);
      } finally {
        setLoadingOptions(false);
      }
    };

    loadQualityOptions();
  }, []);

  // Generate content
  const handleGenerateContent = useCallback(async () => {
    if (!formData.topic) {
      setError('Please enter a topic');
      return;
    }

    try {
      setGenerating(true);
      setError(null);

      const keywords = formData.keywords
        ? formData.keywords.split(',').map(k => k.trim()).filter(k => k)
        : [];

      // Get content goal from workflow session
      const contentGoal = workflowSession?.workflow_data?.content_goal || 'seo';
      
      const result = await blogWriterAPI.generateBlog({
        topic: formData.topic,
        keywords: keywords.length > 0 ? keywords : undefined,
        target_audience: formData.target_audience || undefined,
        tone: formData.tone,
        word_count: formData.word_count,
        preset_id: formData.preset_id || undefined,
        quality_level: formData.quality_level || 'high',
        preset: formData.preset || undefined,
        include_external_links: formData.include_external_links,
        include_backlinks: formData.include_backlinks,
        backlink_count: formData.include_backlinks ? formData.backlink_count : undefined,
        content_goal: contentGoal, // Pass content goal to API
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
        // Product research features
        include_product_research: formData.include_product_research,
        include_brands: formData.include_product_research ? formData.include_brands : undefined,
        include_models: formData.include_product_research ? formData.include_models : undefined,
        include_prices: formData.include_product_research ? formData.include_prices : undefined,
        include_features: formData.include_product_research ? formData.include_features : undefined,
        include_reviews: formData.include_product_research ? formData.include_reviews : undefined,
        include_pros_cons: formData.include_product_research ? formData.include_pros_cons : undefined,
        include_product_table: formData.include_product_research ? formData.include_product_table : undefined,
        include_comparison_section: formData.include_product_research ? formData.include_comparison_section : undefined,
        include_buying_guide: formData.include_product_research ? formData.include_buying_guide : undefined,
        include_faq_section: formData.include_product_research ? formData.include_faq_section : undefined,
        research_depth: formData.include_product_research ? formData.research_depth : undefined,
      });

      // Capture queue_id if present
      if (result && typeof result === 'object' && 'queue_id' in result) {
        const capturedQueueId = (result as { queue_id: string }).queue_id;
        setQueueId(capturedQueueId);
        setQueueStatus("generating");
        logger.debug('Queue ID captured', { queueId: capturedQueueId });
        
        // Show success message with link to queue
        setSuccess(`Blog generation started! View progress in the queue dashboard.`);
        setTimeout(() => setSuccess(null), 5000);
      }

      if (result && typeof result === 'object') {
        const content = result.content || result.html || JSON.stringify(result, null, 2);
        const title = result.title || formData.title || formData.topic;
        const excerpt = result.excerpt || result.description || '';
        const featuredImage = result.featured_image as { image_url?: string; alt_text?: string; image_id?: string; width?: number; height?: number } | null | undefined;

        // Content is already enhanced with images embedded, use it directly
        const finalContent = typeof content === 'string' ? content : JSON.stringify(content);
        
        // Store featured image reference for saving
        if (featuredImage && typeof featuredImage === 'object' && 'image_url' in featuredImage && featuredImage.image_url) {
          // Store featured image in formData for later use when saving
          setFormData(prev => ({
            ...prev,
            content: finalContent, // Content already has images embedded from enhancer
            title: typeof title === 'string' ? title : (title ? String(title) : prev.title),
            excerpt: typeof excerpt === 'string' ? excerpt : (excerpt ? String(excerpt) : prev.excerpt),
            featuredImage: featuredImage // Store for saving
          }));
        } else {
        setFormData(prev => ({
          ...prev,
          content: finalContent,
          title: typeof title === 'string' ? title : (title ? String(title) : prev.title),
          excerpt: typeof excerpt === 'string' ? excerpt : (excerpt ? String(excerpt) : prev.excerpt)
        }));
        }

        // Store full result for v1.3.1 feature displays
        if (result && typeof result === 'object' && 'content' in result && 'title' in result) {
          setGenerationResult(result as unknown as EnhancedBlogResponse);
        }

        setSuccess('Content generated successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to generate content. Please try again.');
      }
    } catch (err: unknown) {
      logger.logError(err instanceof Error ? err : new Error('Unknown error'), {
        context: 'generate-content',
      });
      setError(err instanceof Error ? err.message : 'Failed to generate content');
    } finally {
      setGenerating(false);
    }
  }, [formData, workflowSession, isPremiumQuality]);

  const handleRequestApproval = useCallback(async () => {
    if (!queueId && !savedPostId) {
      setError("Please generate or save the blog first");
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
      setSuccess("Approval requested successfully!");
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
        context: 'request-approval',
      });
      setError("Failed to request approval. Please try again.");
    }
  }, [queueId, savedPostId]);

  const handlePublish = useCallback(async (platforms: string[]) => {
    if (!savedPostId && !queueId) {
      setError("Please save the blog first");
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

      setSuccess(`Successfully queued for publishing to: ${platforms.join(", ")}`);
      setTimeout(() => setSuccess(null), 5000);
      setShowPlatformSelector(false);
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
        context: 'publish-content',
      });
      setError("Failed to publish. Please try again.");
    }
  }, [savedPostId, queueId]);

  // Save as draft
  const handleSaveDraft = useCallback(async () => {
    if (!formData.title || !formData.content) {
      setError('Please provide a title and content');
      return;
    }

    if (!userId) {
      setError('User not authenticated');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Extract featured image from content if present
      const imageMatch = formData.content.match(/<figure class="featured-image">[\s\S]*?<img[^>]+src="([^"]+)"[^>]*>[\s\S]*?<\/figure>/);
      const featuredImageUrl = imageMatch ? imageMatch[1] : null;
      
      // Ensure image is embedded in content if it exists
      let finalContent = formData.content;
      if (featuredImageUrl && !finalContent.includes(featuredImageUrl)) {
        const imageHtml = `<figure class="featured-image"><img src="${featuredImageUrl}" alt="${formData.title}" class="w-full h-auto rounded-lg shadow-xl my-8 object-contain" /></figure>`;
        if (finalContent.includes('</p>')) {
          // Replace only the first occurrence
          finalContent = finalContent.replace('</p>', `</p>${imageHtml}`);
        } else {
          finalContent = imageHtml + finalContent;
        }
      }

      const draftResult = await createDraft({
        title: formData.title,
        content: finalContent,
        excerpt: formData.excerpt,
        seo_data: {
          topic: formData.topic,
          keywords: formData.keywords.split(',').map(k => k.trim()).filter(k => k),
          target_audience: formData.target_audience,
          tone: formData.tone
        },
        metadata: {
          preset_id: formData.preset_id || null,
          brand_voice_used: !!brandVoice,
          quality_level: formData.quality_level
        },
        featured_image: formData.featuredImage
      });

      if (draftResult) {
        // Store post ID for internal link suggestions
        const postId = (draftResult as any).post_id || (draftResult as any).id;
        if (postId) {
          setSavedPostId(postId);
        }

        // Update workflow session with draft reference
        const supabase = createClient();
        const sessionId = workflowSession?.session_id;
        if (sessionId) {
          const workflowData = workflowSession?.workflow_data || {};
          const postId = (draftResult as { post_id?: string; id?: string }).post_id || (draftResult as { post_id?: string; id?: string }).id;
          const { error: workflowError } = await supabase
            .from('workflow_sessions')
            .update({
              current_step: 'editor',
              completed_steps: ['objective', 'keywords', 'clusters', 'ideas', 'topics', 'strategy', 'editor'],
              workflow_data: {
                ...workflowData,
                saved_draft: {
                  post_id: postId,
                  title: formData.title,
                  created_at: new Date().toISOString()
                }
              },
              updated_at: new Date().toISOString()
            })
            .eq('session_id', sessionId);

          if (workflowError) {
            logger.error('Error updating workflow session', { 
              error: workflowError,
              sessionId 
            });
            // Don't throw - draft was saved successfully, workflow update is secondary
          } else {
            logger.debug('Draft saved successfully', {
              postId,
              title: formData.title,
              sessionId,
            });
          }
        }

        setSuccess('Draft saved successfully');
        // Don't redirect immediately - allow user to add internal links
        // setTimeout(() => {
        //   router.push('/admin/workflow/posts');
        // }, 2000);
      } else {
        setError('Failed to save draft');
      }
    } catch (err: unknown) {
      logger.logError(err instanceof Error ? err : new Error('Unknown error'), {
        context: 'save-draft',
      });
      setError(err instanceof Error ? err.message : 'Failed to save draft');
    } finally {
      setLoading(false);
    }
  }, [formData, userId, workflowSession]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              AI Content Editor
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Generate and edit high-quality blog content with AI assistance
            </p>
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
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6">
          <Alert
            variant="error"
            title="Error"
            message={error}
          />
        </div>
      )}
      {success && (
        <div className="mb-6">
          <Alert
            variant="success"
            title="Success"
            message={success}
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column - Form */}
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Content Details
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Saved Topic <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.title}
                  onChange={(e) => {
                    const workflowData = workflowSession?.workflow_data || {};
                    const savedTopics = workflowData.selected_topics || [];
                    const selectedTopic = savedTopics.find((t: { title: string; target_keywords?: string[]; word_count_estimate?: number; [key: string]: unknown }) => t.title === e.target.value);
                    if (selectedTopic) {
                      setFormData({
                        ...formData,
                        title: selectedTopic.title,
                        topic: selectedTopic.target_keywords?.[0] || '',
                        keywords: selectedTopic.target_keywords?.slice(1).join(', ') || '',
                        target_audience: workflowSession?.target_audience || '',
                        word_count: selectedTopic.word_count_estimate || 1500
                      });
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select a saved topic...</option>
                  {(workflowSession?.workflow_data?.selected_topics || []).map((topic: { id?: string; title: string; [key: string]: unknown }, index: number) => (
                    <option key={topic.id || index} value={topic.title}>
                      {topic.title}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Choose from your saved topics to auto-populate the form
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Blog Post Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Enter your blog post title..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Topic <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.topic}
                  onChange={(e) => setFormData({ ...formData, topic: e.target.value })}
                  placeholder="What is your blog post about?"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target Keywords
                </label>
                <input
                  type="text"
                  value={formData.keywords}
                  onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                  placeholder="keyword1, keyword2, keyword3"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target Audience
                </label>
                <input
                  type="text"
                  value={formData.target_audience}
                  onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                  placeholder="Who is your target audience?"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Brand Voice & Presets */}
              <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-4">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  Brand Voice & Presets
                </h3>
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
                <ContentPresetsManager
                  compact={true}
                  selectedPresetId={formData.preset_id}
                  onPresetSelect={(preset) => {
                    setSelectedPreset(preset as ContentPreset | null);
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

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Writing Tone {brandVoice && <span className="text-xs text-green-600">(from brand voice)</span>}
                </label>
                <select
                  value={formData.tone}
                  onChange={(e) => setFormData({ ...formData, tone: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
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
                  Target Word Count {selectedPreset && <span className="text-xs text-blue-600">(from preset)</span>}
                </label>
                <input
                  type="number"
                  value={formData.word_count}
                  onChange={(e) => setFormData({ ...formData, word_count: parseInt(e.target.value) || 1500 })}
                  min="500"
                  max="5000"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              {/* Quality Level Selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Quality Level <span className="text-xs text-gray-500">(Affects AI model used)</span>
                </label>
                {loadingOptions ? (
                  <div className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 text-sm text-gray-500">
                    Loading quality options...
                  </div>
                ) : (
                  <select
                    value={formData.quality_level}
                    onChange={(e) => setFormData({ ...formData, quality_level: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    {qualityLevels.map(level => (
                      <option key={level.value} value={level.value}>
                        {level.label} {level.description ? `- ${level.description}` : ''}
                      </option>
                    ))}
                  </select>
                )}
                {isPremiumQuality && (
                  <p className="mt-1 text-xs text-green-600 dark:text-green-400">
                    ✓ All quality features will be automatically enabled
                  </p>
                )}
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Higher quality uses more advanced AI models for better content
                </p>
              </div>

              {/* Template Type */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Template Type
                </label>
                <select
                  value={formData.template_type}
                  onChange={(e) => setFormData({ ...formData, template_type: e.target.value as any })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
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

              {/* Content Length */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Content Length
                </label>
                <select
                  value={formData.length}
                  onChange={(e) => setFormData({ ...formData, length: e.target.value as any })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="short">Short (~500-1000 words)</option>
                  <option value="medium">Medium (~1000-2000 words)</option>
                  <option value="long">Long (~2000-3000 words)</option>
                  <option value="very_long">Very Long (3000+ words)</option>
                </select>
              </div>

              {/* Quality Features (only show if not premium) */}
              {!isPremiumQuality && (
                <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4 space-y-3">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Quality Features (Optional)
                  </h3>
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

              {/* Product Research Features */}
              <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Product Research Features
                  </h3>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.include_product_research}
                      onChange={(e) => setFormData({ ...formData, include_product_research: e.target.checked })}
                      className="w-4 h-4 text-orange-600 border-gray-300 rounded"
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300">Enable Product Research</span>
                  </label>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  Automatically enabled for topics with &quot;best&quot;, &quot;top&quot;, &quot;review&quot;, or &quot;compare&quot; keywords. Enable manually for product-focused content.
                </p>
                {formData.include_product_research && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Research Depth
                      </label>
                      <select
                        value={formData.research_depth}
                        onChange={(e) => setFormData({ ...formData, research_depth: e.target.value as 'basic' | 'standard' | 'comprehensive' })}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                      >
                        <option value="basic">Basic</option>
                        <option value="standard">Standard</option>
                        <option value="comprehensive">Comprehensive (Recommended)</option>
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.include_brands}
                          onChange={(e) => setFormData({ ...formData, include_brands: e.target.checked })}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded"
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300">Brands</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.include_models}
                          onChange={(e) => setFormData({ ...formData, include_models: e.target.checked })}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded"
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300">Models</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.include_prices}
                          onChange={(e) => setFormData({ ...formData, include_prices: e.target.checked })}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded"
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300">Prices</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.include_features}
                          onChange={(e) => setFormData({ ...formData, include_features: e.target.checked })}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded"
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300">Features</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.include_reviews}
                          onChange={(e) => setFormData({ ...formData, include_reviews: e.target.checked })}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded"
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300">Reviews</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.include_pros_cons}
                          onChange={(e) => setFormData({ ...formData, include_pros_cons: e.target.checked })}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded"
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300">Pros/Cons</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.include_product_table}
                          onChange={(e) => setFormData({ ...formData, include_product_table: e.target.checked })}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded"
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300">Product Table</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.include_comparison_section}
                          onChange={(e) => setFormData({ ...formData, include_comparison_section: e.target.checked })}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded"
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300">Comparison</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.include_buying_guide}
                          onChange={(e) => setFormData({ ...formData, include_buying_guide: e.target.checked })}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded"
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300">Buying Guide</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.include_faq_section}
                          onChange={(e) => setFormData({ ...formData, include_faq_section: e.target.checked })}
                          className="w-4 h-4 text-orange-600 border-gray-300 rounded"
                        />
                        <span className="text-xs text-gray-700 dark:text-gray-300">FAQ Section</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>

              {/* Custom Instructions */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Custom Instructions (Optional)
                </label>
                <textarea
                  value={formData.custom_instructions}
                  onChange={(e) => setFormData({ ...formData, custom_instructions: e.target.value })}
                  rows={6}
                  placeholder="Add custom instructions for structure, linking, images, or quality requirements..."
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-sm"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Leave empty to use default instructions. Premium quality uses default instructions automatically.
                </p>
              </div>

              {/* Preset Selection (Optional) */}
              {presets.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Content Preset <span className="text-xs text-gray-500">(Optional)</span>
                  </label>
                  <select
                    value={formData.preset}
                    onChange={(e) => setFormData({ ...formData, preset: e.target.value })}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="">None (Use default settings)</option>
                    {presets.map(preset => (
                      <option key={preset.value} value={preset.value}>
                        {preset.label} {preset.description ? `- ${preset.description}` : ''}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* External Links Options */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white">
                  External Links & SEO Options
                </h3>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.include_external_links}
                      onChange={(e) => setFormData({ ...formData, include_external_links: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Include external links to source documents
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.include_backlinks}
                      onChange={(e) => setFormData({ ...formData, include_backlinks: e.target.checked })}
                      className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      Include backlinks
                    </span>
                  </label>
                  {formData.include_backlinks && (
                    <div className="ml-6">
                      <label className="block text-xs text-gray-700 dark:text-gray-300 mb-1">
                        Number of backlinks:
                      </label>
                      <input
                        type="number"
                        value={formData.backlink_count}
                        onChange={(e) => setFormData({ ...formData, backlink_count: parseInt(e.target.value) || 5 })}
                        min="1"
                        max="20"
                        className="w-24 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex flex-col gap-3">
              <button
                onClick={handleGenerateContent}
                disabled={generating || !formData.topic}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
              >
                {generating ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    Generate Content
                  </>
                )}
              </button>
              
              <button
                onClick={handleSaveDraft}
                disabled={loading || creatingPost || !formData.title || !formData.content}
                className="w-full px-6 py-3 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
              >
                {loading || creatingPost ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save as Draft
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Content Editor */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Content Editor
            </h2>
            
            {formData.content ? (
              <TipTapEditor
                content={formData.content || ''}
                onChange={(html) => setFormData({ ...formData, content: html })}
                placeholder="Generated content will appear here. Edit it using the toolbar above..."
                onImageUpload={async (file) => {
                  try {
                    const uploadFormData = new FormData();
                    uploadFormData.append('file', file);

                    const response = await fetch('/api/images/upload', {
                      method: 'POST',
                      body: uploadFormData,
                    });

                    if (!response.ok) {
                      const error = await response.json();
                      throw new Error(error.error || 'Upload failed');
                    }

                    const result = await response.json();
                    return result.url;
                  } catch (error) {
                    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
                      context: 'upload-image',
                    });
                    throw error;
                  }
                }}
                editable={true}
                className="mt-2"
              />
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Generated content will appear here</p>
                <p className="text-sm mt-2">Click &quot;Generate Content&quot; to create your blog post</p>
              </div>
            )}
          </div>

          {/* v1.3.1 Feature Displays - Content Structure */}
          {generationResult?.content && (
            <ContentStructureDisplay 
              content={generationResult.content}
              content_metadata={generationResult.content_metadata}
            />
          )}

          {/* v1.3.1 Feature Displays - Internal Links */}
          {generationResult?.internal_links && generationResult.internal_links.length > 0 && (
            <InternalLinksDisplay 
              internal_links={generationResult.internal_links}
            />
          )}

          {/* v1.3.1 Feature Displays - Generated Images */}
          {(generationResult?.featured_image || (generationResult?.generated_images && generationResult.generated_images.length > 0)) && (
            <GeneratedImagesDisplay 
              featured_image={generationResult.featured_image}
              generated_images={generationResult.generated_images}
            />
          )}

          {/* Interlinking Recommendations (if integration selected) */}
          {selectedIntegrationId && formData.keywords && orgId && (
            <InterlinkingRecommendations
              orgId={orgId}
              integrationId={selectedIntegrationId}
              keywords={formData.keywords.split(',').map(k => k.trim()).filter(k => k)}
              onOpportunitySelect={(opportunity) => {
                console.log('Selected interlinking opportunity:', opportunity);
                // Could insert link into content at cursor position
              }}
            />
          )}

          {/* Internal Link Suggestions */}
          {savedPostId && formData.content && (
            <InternalLinkSuggestions
              postId={savedPostId}
              content={formData.content}
              compact={true}
              onLinkAdd={(link) => {
                console.log('Internal link added:', link);
              }}
            />
          )}

          {/* Excerpt */}
          {formData.excerpt && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Excerpt
              </h3>
              <p className="text-gray-900 dark:text-white">
                {formData.excerpt}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Back Button */}
      <div className="mt-6">
        <button
          onClick={() => router.push('/admin/workflow/strategy')}
          className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Strategy
        </button>
      </div>

      {/* Platform Selector Modal */}
      {showPlatformSelector && (
        <PlatformSelector
          onSelect={handlePublish}
          onCancel={() => setShowPlatformSelector(false)}
        />
      )}
    </div>
  );
}

