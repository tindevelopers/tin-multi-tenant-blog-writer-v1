"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useBlogPost } from "@/hooks/useBlogPosts";
import { useBlogPostMutations } from "@/hooks/useBlogPosts";
import { 
  ArrowLeftIcon,
  CheckIcon,
  ArrowsRightLeftIcon,
  SparklesIcon,
  DocumentTextIcon,
  PhotoIcon,
  CheckCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon
} from "@heroicons/react/24/outline";
import TipTapEditor from "@/components/blog-writer/TipTapEditor";
import { extractBlogFields, generateSlug, calculateReadTime, validateBlogFields, type BlogFieldData } from "@/lib/blog-field-validator";
import { dataForSEOContentGenerationClient } from "@/lib/dataforseo-content-generation-client";
import { llmAnalysisClient } from "@/lib/llm-analysis-client";
import { extractImagesFromContent, extractFeaturedImage } from "@/lib/image-extractor";
import { logger } from "@/utils/logger";
import BlogFieldConfiguration from "@/components/blog-writer/BlogFieldConfiguration";
import WorkflowStagesHorizontal from "@/components/workflow/WorkflowStagesHorizontal";
import type { WorkflowPhase } from "@/lib/workflow-phase-manager";

type DraftFormState = {
  title: string;
  content: string;
  excerpt: string;
  status: 'draft' | 'published' | 'scheduled' | 'archived';
  slug: string;
  seoTitle: string;
  metaDescription: string;
  featuredImage: string;
  featuredImageAlt: string;
  thumbnailImage: string;
  thumbnailImageAlt: string;
  authorName: string;
  authorImage: string;
  authorBio: string;
  locale: string;
  isFeatured: boolean;
  publishedAt: string;
};

const stripHtml = (html: string) => html.replace(/<[^>]*>/g, " ");

export default function EditDraftPage() {
  const router = useRouter();
  const params = useParams();
  const draftId = params.id as string;
  
  const { post: draft, loading, error } = useBlogPost(draftId);
  const { updatePost } = useBlogPostMutations();
  
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [llmSuggestions, setLlmSuggestions] = useState<{
    missingFields: string[];
    recommendations: string[];
    improvements: string[];
  } | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  const [formData, setFormData] = useState<DraftFormState>({
    title: '',
    content: '',
    excerpt: '',
    status: 'draft',
    slug: '',
    seoTitle: '',
    metaDescription: '',
    featuredImage: '',
    featuredImageAlt: '',
    thumbnailImage: '',
    thumbnailImageAlt: '',
    authorName: '',
    authorImage: '',
    authorBio: '',
    locale: 'en',
    isFeatured: false,
    publishedAt: ''
  });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [contentStats, setContentStats] = useState({ wordCount: 0, readTime: 1 });
  const [fieldValidation, setFieldValidation] = useState<ReturnType<typeof validateBlogFields> | null>(null);
  const [showFieldConfig, setShowFieldConfig] = useState(false);
  const [pendingSaveAction, setPendingSaveAction] = useState<(() => void) | null>(null);
  const [workflowPhase, setWorkflowPhase] = useState<WorkflowPhase | null>(null);

  // Determine phase completion status
  const phase1Complete = workflowPhase && ['phase_1_content', 'phase_2_images', 'phase_3_enhancement', 'completed'].includes(workflowPhase);
  const phase2Complete = workflowPhase && ['phase_2_images', 'phase_3_enhancement', 'completed'].includes(workflowPhase);
  const phase3Complete = workflowPhase && ['phase_3_enhancement', 'completed'].includes(workflowPhase);

  useEffect(() => {
    if (draft) {
      const metadata = (draft.metadata as Record<string, unknown>) || {};
      const seoData = (draft.seo_data as Record<string, unknown>) || {};
      
      // Extract workflow phase from metadata
      const phase = metadata.workflow_phase as WorkflowPhase | undefined;
      if (phase) {
        setWorkflowPhase(phase);
      } else if (draft.content && draft.title) {
        // If content exists but no phase set, assume Phase 1 is complete
        setWorkflowPhase('phase_1_content');
      }
      
      const extractedFields = extractBlogFields({
        title: draft.title || '',
        content: draft.content || '',
        excerpt: draft.excerpt || undefined,
        metadata,
        seo_data: seoData,
        word_count: metadata.word_count as number | undefined,
      });

      setFormData({
        title: draft.title || '',
        content: draft.content || '',
        excerpt: draft.excerpt || extractedFields.excerpt || '',
        status: draft.status || 'draft',
        slug: extractedFields.slug || '',
        seoTitle: extractedFields.seo_title || draft.title || '',
        metaDescription: extractedFields.meta_description || draft.excerpt || '',
        featuredImage: extractedFields.featured_image || '',
        featuredImageAlt: extractedFields.featured_image_alt || '',
        thumbnailImage: extractedFields.thumbnail_image || '',
        thumbnailImageAlt: extractedFields.thumbnail_image_alt || '',
        authorName: extractedFields.author_name || '',
        authorImage: extractedFields.author_image || '',
        authorBio: extractedFields.author_bio || '',
        locale: extractedFields.locale || 'en',
        isFeatured: extractedFields.is_featured ?? false,
        publishedAt: extractedFields.published_at || draft.published_at || '',
      });
    }
  }, [draft]);

  useEffect(() => {
    const plainText = stripHtml(formData.content || '');
    const words = plainText ? plainText.split(/\s+/).filter((word) => word.length > 0) : [];
    setContentStats({
      wordCount: words.length,
      readTime: Math.max(1, calculateReadTime(words.length || 1)),
    });
    
    // Validate fields for Webflow publishing
    const validation = validateBlogFields({
      title: formData.title,
      content: formData.content,
      excerpt: formData.excerpt,
      slug: formData.slug,
      featured_image: formData.featuredImage,
      featured_image_alt: formData.featuredImageAlt,
      thumbnail_image: formData.thumbnailImage,
      thumbnail_image_alt: formData.thumbnailImageAlt,
      author_name: formData.authorName,
      author_image: formData.authorImage,
      author_bio: formData.authorBio,
      seo_title: formData.seoTitle,
      meta_description: formData.metaDescription,
      locale: formData.locale,
      word_count: contentStats.wordCount,
      read_time: contentStats.readTime,
    });
    setFieldValidation(validation);
  }, [formData, contentStats.wordCount, contentStats.readTime]);

  const buildMetadataPayload = () => {
    const existingMetadata = (draft?.metadata as Record<string, unknown>) || {};
    const metadataPayload: Record<string, unknown> = {
      slug: formData.slug || generateSlug(formData.title || 'untitled'),
      locale: formData.locale || 'en',
      is_featured: formData.isFeatured,
      read_time: contentStats.readTime,
      word_count: contentStats.wordCount,
    };

    if (formData.featuredImage) metadataPayload.featured_image = formData.featuredImage;
    if (formData.featuredImageAlt) metadataPayload.featured_image_alt = formData.featuredImageAlt;
    if (formData.thumbnailImage) metadataPayload.thumbnail_image = formData.thumbnailImage;
    if (formData.thumbnailImageAlt) metadataPayload.thumbnail_image_alt = formData.thumbnailImageAlt;
    if (formData.authorName) metadataPayload.author_name = formData.authorName;
    if (formData.authorImage) metadataPayload.author_image = formData.authorImage;
    if (formData.authorBio) metadataPayload.author_bio = formData.authorBio;
    if (formData.publishedAt) metadataPayload.published_at = formData.publishedAt;

    return {
      ...existingMetadata,
      ...metadataPayload,
    };
  };

  const handleAutoGenerateFields = async () => {
    if (!formData.content) {
      alert('Add content before generating fields.');
      return;
    }

    setAiGenerating(true);
    setLlmSuggestions(null);
    setShowSuggestions(false);

    try {
      // Extract images from content (especially Cloudinary URLs)
      const extractedImages = extractImagesFromContent(formData.content);
      const cloudinaryImages = extractedImages.filter(img => img.type === 'cloudinary');
      
      logger.debug('Extracted images from content', {
        totalImages: extractedImages.length,
        cloudinaryImages: cloudinaryImages.length,
      });

      // Extract featured image if available
      const featuredImage = extractFeaturedImage(formData.content);
      if (featuredImage && !formData.featuredImage) {
        logger.debug('Found featured image in content', {
          url: featuredImage.url.substring(0, 50) + '...',
        });
      }

      // Try LLM analysis first (if OpenAI is configured)
      try {
        const analysis = await llmAnalysisClient.analyzeBlogContent({
          title: formData.title || 'Untitled',
          content: formData.content,
          images: extractedImages.map(img => ({
            url: img.url,
            type: img.type,
            position: img.position,
          })),
          existingFields: {
            excerpt: formData.excerpt,
            slug: formData.slug,
            seoTitle: formData.seoTitle,
            metaDescription: formData.metaDescription,
            featuredImage: formData.featuredImage,
            featuredImageAlt: formData.featuredImageAlt,
          },
        });

        // Update form data with LLM-generated fields
        setFormData(prev => ({
          ...prev,
          slug: analysis.slug || prev.slug || generateSlug(prev.title || 'untitled'),
          seoTitle: analysis.seoTitle || prev.seoTitle || prev.title,
          metaDescription: analysis.metaDescription || prev.metaDescription,
          excerpt: analysis.excerpt || prev.excerpt,
          // Update featured image if found and not already set
          featuredImage: prev.featuredImage || featuredImage?.url || analysis.imageDescriptions[0]?.url || '',
          featuredImageAlt: prev.featuredImageAlt || featuredImage?.altText || analysis.imageDescriptions[0]?.altText || '',
        }));

        // Update image alt texts from LLM analysis
        if (analysis.imageDescriptions && analysis.imageDescriptions.length > 0) {
          // Find featured image description
          const featuredImageDesc = analysis.imageDescriptions.find(desc => 
            desc.url === featuredImage?.url || desc.url === formData.featuredImage
          );
          
          if (featuredImageDesc && !formData.featuredImageAlt) {
            setFormData(prev => ({
              ...prev,
              featuredImageAlt: featuredImageDesc.altText,
            }));
          }
        }

        // Store suggestions for UI display
        setLlmSuggestions(analysis.suggestions);
        setShowSuggestions(true);

        logger.debug('LLM analysis completed', {
          fallback: analysis.fallback,
          suggestionsCount: analysis.suggestions?.recommendations?.length || 0,
        });

        if (analysis.fallback && analysis.message) {
          logger.info('LLM analysis used fallback', {
            message: analysis.message,
          });
        }

        return; // Success, exit early
      } catch (llmError) {
        logger.warn('LLM analysis failed, falling back to DataForSEO', {
          error: llmError instanceof Error ? llmError.message : String(llmError),
        });
        // Fall through to DataForSEO fallback
      }

      // Fallback to DataForSEO if LLM fails
      const plainText = stripHtml(formData.content).trim();
      const excerptFallback = formData.excerpt && formData.excerpt.trim().length > 0
        ? formData.excerpt
        : plainText.substring(0, 220).concat(plainText.length > 220 ? '…' : '');

      const meta = await dataForSEOContentGenerationClient.generateMetaTags(
        plainText || formData.title || '',
        'en',
        formData.title
      );

      // Update form data with DataForSEO-generated values
      setFormData(prev => ({
        ...prev,
        slug: prev.slug || generateSlug(prev.title || 'untitled'),
        seoTitle: meta.meta_title || prev.seoTitle || prev.title,
        metaDescription: meta.meta_description || prev.metaDescription || excerptFallback,
        excerpt: prev.excerpt || excerptFallback,
        // Set featured image if found
        featuredImage: prev.featuredImage || featuredImage?.url || '',
        featuredImageAlt: prev.featuredImageAlt || featuredImage?.altText || '',
      }));

      if (meta.fallback && meta.message) {
        logger.info('Field generation used DataForSEO fallback', {
          message: meta.message,
        });
      }
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error('Failed to auto-generate fields'), {
        context: 'edit-draft-generate-fields',
      });
      
      // Final fallback: simple extraction
      try {
        const plainText = stripHtml(formData.content).trim();
        const excerptFallback = formData.excerpt && formData.excerpt.trim().length > 0
          ? formData.excerpt
          : plainText.substring(0, 220).concat(plainText.length > 220 ? '…' : '');
        
        const cleanText = plainText || formData.title || '';
        const metaTitle = formData.title || cleanText.substring(0, 60);
        const metaDescription = cleanText.substring(0, 155);
        
        const fallbackMeta = {
          meta_title: metaTitle.length > 60 ? metaTitle.substring(0, 57) + '...' : metaTitle,
          meta_description: metaDescription.length > 155 ? metaDescription.substring(0, 152) + '...' : metaDescription,
        };
        
        setFormData(prev => ({
          ...prev,
          slug: prev.slug || generateSlug(prev.title || 'untitled'),
          seoTitle: fallbackMeta.meta_title || prev.seoTitle || prev.title,
          metaDescription: fallbackMeta.meta_description || prev.metaDescription || excerptFallback,
          excerpt: prev.excerpt || excerptFallback,
        }));
        
        logger.info('Used basic extraction fallback', {
          context: 'edit-draft-generate-fields',
        });
      } catch (fallbackError) {
        logger.error('All fallback methods failed', {
          error: fallbackError,
          context: 'edit-draft-generate-fields',
        });
        alert('Unable to generate fields automatically. Please fill them manually.');
      }
    } finally {
      setAiGenerating(false);
    }
  };

  const buildSeoPayload = () => {
    const existingSeo = (draft?.seo_data as Record<string, unknown>) || {};
    return {
      ...existingSeo,
      meta_title: formData.seoTitle || formData.title,
      meta_description: formData.metaDescription || formData.excerpt,
    };
  };

  const handleSave = async () => {
    // Phase 6: Check if critical fields are missing before saving
    if (fieldValidation && (fieldValidation.missingRequired.length > 0 || fieldValidation.missingRecommended.length > 0)) {
      // Show field configuration modal if critical fields are missing
      setPendingSaveAction(() => handleSaveInternal);
      setShowFieldConfig(true);
      return;
    }
    
    await handleSaveInternal();
  };

  const handleSaveInternal = async () => {
    try {
      setSaving(true);
      const payload = {
        title: formData.title,
        content: formData.content,
        excerpt: formData.excerpt,
        status: formData.status,
        metadata: buildMetadataPayload(),
        seo_data: buildSeoPayload(),
        published_at: formData.publishedAt || null,
      };

      const success = await updatePost(draftId, payload);
      if (success) {
        alert('Draft saved successfully!');
        router.push('/contentmanagement/drafts');
      } else {
        alert('Failed to save draft. Please try again.');
      }
    } catch (err) {
      console.error('Error saving draft:', err);
      alert('Error saving draft. Please try again.');
    } finally {
      setSaving(false);
      setShowFieldConfig(false);
      setPendingSaveAction(null);
    }
  };

  const handleFieldConfigSave = (fieldData: BlogFieldData) => {
    // Update form data with configured fields
    setFormData(prev => ({
      ...prev,
      excerpt: fieldData.excerpt || prev.excerpt,
      slug: fieldData.slug || prev.slug,
      seoTitle: fieldData.seo_title || prev.seoTitle,
      metaDescription: fieldData.meta_description || prev.metaDescription,
      featuredImage: fieldData.featured_image || prev.featuredImage,
      featuredImageAlt: fieldData.featured_image_alt || prev.featuredImageAlt,
      thumbnailImage: fieldData.thumbnail_image || prev.thumbnailImage,
      thumbnailImageAlt: fieldData.thumbnail_image_alt || prev.thumbnailImageAlt,
      authorName: fieldData.author_name || prev.authorName,
      authorImage: fieldData.author_image || prev.authorImage,
      authorBio: fieldData.author_bio || prev.authorBio,
      locale: fieldData.locale || prev.locale,
      isFeatured: fieldData.is_featured ?? prev.isFeatured,
      publishedAt: fieldData.published_at || prev.publishedAt,
    }));
    
    setShowFieldConfig(false);
    
    // Execute pending save action if any
    if (pendingSaveAction) {
      pendingSaveAction();
      setPendingSaveAction(null);
    }
  };

  const prepareFieldConfigData = (): BlogFieldData => {
    return {
      title: formData.title,
      content: formData.content,
      excerpt: formData.excerpt,
      slug: formData.slug,
      seo_title: formData.seoTitle,
      meta_description: formData.metaDescription,
      featured_image: formData.featuredImage,
      featured_image_alt: formData.featuredImageAlt,
      thumbnail_image: formData.thumbnailImage,
      thumbnail_image_alt: formData.thumbnailImageAlt,
      author_name: formData.authorName,
      author_image: formData.authorImage,
      author_bio: formData.authorBio,
      locale: formData.locale,
      is_featured: formData.isFeatured,
      published_at: formData.publishedAt,
      word_count: contentStats.wordCount,
      read_time: contentStats.readTime,
    };
  };

  const handleStatusUpdate = async () => {
    try {
      setStatusSaving(true);
      const payload: { status: DraftFormState['status']; published_at?: string | null } = {
        status: formData.status,
      };

      if (formData.status === 'published') {
        payload.published_at = formData.publishedAt || new Date().toISOString();
        if (payload.published_at) {
          handleInputChange('publishedAt', payload.published_at);
        }
      } else if (formData.publishedAt) {
        payload.published_at = formData.publishedAt;
      }

      const result = await updatePost(draftId, payload);
      if (result) {
        alert('Status updated successfully!');
        router.refresh();
      } else {
        alert('Failed to update status. Please try again.');
      }
    } catch (err) {
      console.error('Error updating status:', err);
      alert('Error updating status. Please try again.');
    } finally {
      setStatusSaving(false);
    }
  };

  const handleInputChange = <K extends keyof DraftFormState>(field: K, value: DraftFormState[K]) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading draft...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Error
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
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
              Edit Draft
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              Make changes to your draft content
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <CheckIcon className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Draft'}
            </button>
          </div>
        </div>
      </div>

      {/* Workflow Stages - Horizontal */}
      {workflowPhase && (
        <div className="mb-6">
          <WorkflowStagesHorizontal currentPhase={workflowPhase} />
          
          {/* Phase-specific indicators */}
          <div className="mt-4 flex flex-wrap gap-3">
            {phase1Complete && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
                <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                <span className="text-sm text-green-700 dark:text-green-300 font-medium">Phase 1: Content Generated</span>
              </div>
            )}
            {phase2Complete && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg">
                <CheckCircleIcon className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <span className="text-sm text-purple-700 dark:text-purple-300 font-medium">Phase 2: Images Added</span>
              </div>
            )}
            {phase3Complete && (
              <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                <CheckCircleIcon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-sm text-indigo-700 dark:text-indigo-300 font-medium">Phase 3: Enhanced Metadata</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="max-w-7xl mx-auto">
          {/* Form */}
          <div className="space-y-6">
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Title
          </label>
          <input
            type="text"
            id="title"
            value={formData.title}
            onChange={(e) => handleInputChange('title', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            placeholder="Enter draft title..."
          />
        </div>

        {/* Excerpt */}
        <div>
          <label htmlFor="excerpt" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <span className="flex items-center gap-2">
              Excerpt
              {fieldValidation?.missingRecommended.includes('excerpt') && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded">
                  <ExclamationTriangleIcon className="w-3 h-3" />
                  Recommended
                </span>
              )}
              {formData.excerpt && !fieldValidation?.missingRecommended.includes('excerpt') && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded">
                  <CheckCircleIcon className="w-3 h-3" />
                  Complete
                </span>
              )}
            </span>
            {!formData.excerpt && (
              <span className="ml-2 text-xs text-amber-600 dark:text-amber-400">
                (No excerpt found - consider extracting from content)
              </span>
            )}
          </label>
          <textarea
            id="excerpt"
            value={formData.excerpt}
            onChange={(e) => handleInputChange('excerpt', e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-y"
            placeholder={formData.excerpt || "Enter draft excerpt... (A brief summary of the blog post, typically 150-200 characters)"}
          />
          {formData.excerpt && (
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
              {formData.excerpt.length} characters
            </p>
          )}
        </div>

        {/* Content */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            <span className="flex items-center gap-2">
              Content
              {phase1Complete && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded">
                  <DocumentTextIcon className="w-3 h-3" />
                  Phase 1 Complete
                </span>
              )}
            </span>
          </label>
          <TipTapEditor
            content={formData.content || ''}
            onChange={(html) => handleInputChange('content', html)}
            placeholder="Start writing your blog post..."
            excerpt={formData.excerpt || ''}
            editable={true}
            className="mt-2"
          />
        </div>

        {/* Field Validation Warnings */}
        {fieldValidation && (fieldValidation.missingRecommended.length > 0 || fieldValidation.warnings.length > 0) && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <InformationCircleIcon className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-amber-800 dark:text-amber-200 mb-2">
                  Recommended Fields for Webflow Publishing
                </h3>
                {fieldValidation.missingRecommended.length > 0 && (
                  <div className="mb-2">
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">
                      Missing recommended fields:
                    </p>
                    <ul className="list-disc list-inside text-xs text-amber-600 dark:text-amber-400 space-y-1">
                      {fieldValidation.missingRecommended.map((field) => (
                        <li key={field}>
                          {field === 'excerpt' && 'Excerpt (summary of the blog post)'}
                          {field === 'featured_image' && 'Featured Image (main image for the post)'}
                          {field === 'author_name' && 'Author Name (required for Webflow)'}
                          {field === 'meta_description' && 'Meta Description (SEO summary)'}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {fieldValidation.warnings.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-amber-700 dark:text-amber-300 mb-1">
                      Warnings:
                    </p>
                    <ul className="list-disc list-inside text-xs text-amber-600 dark:text-amber-400 space-y-1">
                      {fieldValidation.warnings.map((warning, idx) => (
                        <li key={idx}>{warning}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Webflow Publishing Fields */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Webflow Publishing Fields</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Configure all fields required before syncing to Webflow.
              </p>
            </div>
            <button
              onClick={handleAutoGenerateFields}
              disabled={aiGenerating || !formData.content}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              title={!formData.content ? 'Add content before using AI' : 'Let AI suggest slug and meta tags'}
            >
              {aiGenerating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Generating…
                </>
              ) : (
                <>
                  <SparklesIcon className="w-4 h-4" />
                  Generate Fields with AI
                </>
              )}
            </button>
          </div>

          {/* LLM Suggestions Panel */}
          {showSuggestions && llmSuggestions && (
            <div className="mb-6 bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-3">
                    <SparklesIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    <h3 className="text-sm font-semibold text-purple-900 dark:text-purple-100">
                      AI-Generated Suggestions
                    </h3>
                  </div>
                  
                  {llmSuggestions.recommendations.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-purple-800 dark:text-purple-200 mb-2">
                        Recommendations:
                      </p>
                      <ul className="list-disc list-inside text-xs text-purple-700 dark:text-purple-300 space-y-1">
                        {llmSuggestions.recommendations.map((rec, idx) => (
                          <li key={idx}>{rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {llmSuggestions.improvements.length > 0 && (
                    <div className="mb-3">
                      <p className="text-xs font-medium text-purple-800 dark:text-purple-200 mb-2">
                        Content Improvements:
                      </p>
                      <ul className="list-disc list-inside text-xs text-purple-700 dark:text-purple-300 space-y-1">
                        {llmSuggestions.improvements.map((imp, idx) => (
                          <li key={idx}>{imp}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  {llmSuggestions.missingFields.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-purple-800 dark:text-purple-200 mb-2">
                        Missing Fields:
                      </p>
                      <ul className="list-disc list-inside text-xs text-purple-700 dark:text-purple-300 space-y-1">
                        {llmSuggestions.missingFields.map((field, idx) => (
                          <li key={idx}>{field}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => setShowSuggestions(false)}
                  className="text-purple-400 hover:text-purple-600 dark:hover:text-purple-300 transition-colors"
                  title="Close suggestions"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Slug
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="auto-generated-slug"
                />
                <button
                  type="button"
                  onClick={() => handleInputChange('slug', generateSlug(formData.title || ''))}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                  title="Regenerate slug from title"
                >
                  <ArrowsRightLeftIcon className="w-4 h-4" />
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Locale
              </label>
              <select
                value={formData.locale}
                onChange={(e) => handleInputChange('locale', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              >
                <option value="en">English</option>
                <option value="es">Spanish</option>
                <option value="fr">French</option>
                <option value="de">German</option>
                <option value="it">Italian</option>
                <option value="pt">Portuguese</option>
                <option value="zh">Chinese</option>
                <option value="ja">Japanese</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Featured Post
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={formData.isFeatured}
                  onChange={(e) => handleInputChange('isFeatured', e.target.checked)}
                  className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Highlight on featured sections.
                </span>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Published Date
              </label>
              <input
                type="datetime-local"
                value={formData.publishedAt ? new Date(formData.publishedAt).toISOString().slice(0, 16) : ''}
                onChange={(e) => handleInputChange('publishedAt', e.target.value ? new Date(e.target.value).toISOString() : '')}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span className="flex items-center gap-2 flex-wrap">
                  SEO Title
                  {phase3Complete && formData.seoTitle && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 rounded">
                      <SparklesIcon className="w-3 h-3" />
                      Phase 3
                    </span>
                  )}
                  {formData.seoTitle && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded">
                      <CheckCircleIcon className="w-3 h-3" />
                      Complete
                    </span>
                  )}
                </span>
              </label>
              <input
                type="text"
                value={formData.seoTitle}
                onChange={(e) => handleInputChange('seoTitle', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Compelling headline for search results"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span className="flex items-center gap-2 flex-wrap">
                  Meta Description
                  {phase3Complete && formData.metaDescription && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300 rounded">
                      <SparklesIcon className="w-3 h-3" />
                      Phase 3
                    </span>
                  )}
                  {fieldValidation?.missingRecommended.includes('meta_description') && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded">
                      <ExclamationTriangleIcon className="w-3 h-3" />
                      Recommended
                    </span>
                  )}
                  {formData.metaDescription && !fieldValidation?.missingRecommended.includes('meta_description') && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded">
                      <CheckCircleIcon className="w-3 h-3" />
                      Complete
                    </span>
                  )}
                </span>
              </label>
              <textarea
                value={formData.metaDescription}
                onChange={(e) => handleInputChange('metaDescription', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-y"
                placeholder="150-160 character summary for SERPs"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span className="flex items-center gap-2 flex-wrap">
                  Featured Image URL
                  {phase2Complete && formData.featuredImage && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded">
                      <PhotoIcon className="w-3 h-3" />
                      Phase 2
                    </span>
                  )}
                  {fieldValidation?.missingRecommended.includes('featured_image') && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded">
                      <ExclamationTriangleIcon className="w-3 h-3" />
                      Recommended
                    </span>
                  )}
                  {formData.featuredImage && !fieldValidation?.missingRecommended.includes('featured_image') && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded">
                      <CheckCircleIcon className="w-3 h-3" />
                      Complete
                    </span>
                  )}
                </span>
              </label>
              <input
                type="url"
                value={formData.featuredImage}
                onChange={(e) => handleInputChange('featuredImage', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="https://example.com/image.jpg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Featured Image Alt Text
              </label>
              <input
                type="text"
                value={formData.featuredImageAlt}
                onChange={(e) => handleInputChange('featuredImageAlt', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Describe the featured image"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Thumbnail Image URL
              </label>
              <input
                type="url"
                value={formData.thumbnailImage}
                onChange={(e) => handleInputChange('thumbnailImage', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="https://example.com/thumbnail.jpg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Thumbnail Image Alt Text
              </label>
              <input
                type="text"
                value={formData.thumbnailImageAlt}
                onChange={(e) => handleInputChange('thumbnailImageAlt', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="Describe the thumbnail image"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span className="flex items-center gap-2">
                  Author Name
                  {fieldValidation?.missingRecommended.includes('author_name') && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 rounded">
                      <ExclamationTriangleIcon className="w-3 h-3" />
                      Recommended
                    </span>
                  )}
                  {formData.authorName && !fieldValidation?.missingRecommended.includes('author_name') && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded">
                      <CheckCircleIcon className="w-3 h-3" />
                      Complete
                    </span>
                  )}
                </span>
              </label>
              <input
                type="text"
                value={formData.authorName}
                onChange={(e) => handleInputChange('authorName', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="e.g., Jane Smith"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Author Image URL
              </label>
              <input
                type="url"
                value={formData.authorImage}
                onChange={(e) => handleInputChange('authorImage', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="https://example.com/author.jpg"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Author Bio
              </label>
              <textarea
                value={formData.authorBio}
                onChange={(e) => handleInputChange('authorBio', e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white resize-y"
                placeholder="Short bio shown with the post"
              />
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-6 text-sm text-gray-600 dark:text-gray-400">
            <span>{contentStats.wordCount.toLocaleString()} words</span>
            <span>≈ {contentStats.readTime} min read</span>
          </div>
        </div>

        {/* Status */}
        <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Status
          </label>
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            <select
              id="status"
              value={formData.status}
              onChange={(e) => handleInputChange('status', e.target.value as 'draft' | 'published' | 'scheduled' | 'archived')}
              className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
            >
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="scheduled">Scheduled</option>
              <option value="archived">Archived</option>
            </select>
            <button
              onClick={handleStatusUpdate}
              disabled={statusSaving}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {statusSaving ? 'Updating...' : 'Update Status'}
            </button>
          </div>
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
            Updating the status removes this post from the Draft queue when set to Published/Scheduled and makes it appear in the Publishing dashboard.
          </p>
        </div>
          </div>
        </div>

      </div>

      {/* Field Configuration Modal */}
      {showFieldConfig && (
        <BlogFieldConfiguration
          initialData={prepareFieldConfigData()}
          onSave={handleFieldConfigSave}
          onCancel={() => {
            setShowFieldConfig(false);
            setPendingSaveAction(null);
          }}
          show={showFieldConfig}
        />
      )}
    </div>
  );
}
