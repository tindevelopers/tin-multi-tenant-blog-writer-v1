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
  InformationCircleIcon,
  XMarkIcon,
  DocumentCheckIcon,
  ArrowPathIcon,
} from "@heroicons/react/24/outline";
import TipTapEditor from "@/components/blog-writer/TipTapEditor";
import { extractBlogFields, generateSlug, calculateReadTime, validateBlogFields, type BlogFieldData } from "@/lib/blog-field-validator";
import { dataForSEOContentGenerationClient } from "@/lib/dataforseo-content-generation-client";
import { llmAnalysisClient } from "@/lib/llm-analysis-client";
import { extractImagesFromContent, extractFeaturedImage } from "@/lib/image-extractor";
import { logger } from "@/utils/logger";
import { sanitizeContent, sanitizeExcerpt, sanitizeTitle, sanitizeBlogData } from "@/lib/unified-content-sanitizer";
import BlogFieldConfiguration from "@/components/blog-writer/BlogFieldConfiguration";
import WorkflowStagesHorizontal from "@/components/workflow/WorkflowStagesHorizontal";
import type { WorkflowPhase } from "@/lib/workflow-phase-manager";
import { PublishButton } from "@/components/publishing/PublishButton";
import { PublishingTargetSelector } from "@/components/publishing/PublishingTargetSelector";
import { SiteScanStatus } from "@/components/publishing/SiteScanStatus";
import { UserRole, type PublishingTarget } from "@/types/publishing";
import { createClient } from "@/lib/supabase/client";

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

// ImageWithFallback component for better error handling
function ImageWithFallback({ src, alt, className }: { src: string; alt: string; className?: string }) {
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);

  if (error || !src) {
    return (
      <div className={`flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-700 text-gray-400 dark:text-gray-500 p-4 ${className}`}>
        <PhotoIcon className="w-8 h-8 mb-2" />
        <span className="text-xs">Image failed to load</span>
        {src && (
          <a 
            href={src} 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-xs text-blue-500 hover:underline mt-1 break-all max-w-full px-2"
          >
            Open URL →
          </a>
        )}
      </div>
    );
  }

  return (
    <>
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-700">
          <div className="animate-spin rounded-full h-6 w-6 border-2 border-gray-400 border-t-transparent"></div>
        </div>
      )}
      <img
        src={src}
        alt={alt}
        className={`${className} ${loading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
        onError={() => {
          setError(true);
          setLoading(false);
          logger.error('Image failed to load', { src: src.substring(0, 100), alt });
        }}
        onLoad={() => setLoading(false)}
        crossOrigin="anonymous"
      />
    </>
  );
}

export default function EditDraftPage() {
  const router = useRouter();
  const params = useParams();
  const draftId = params.id as string;
  
  const { post: draft, loading, error, refetch } = useBlogPost(draftId);
  const { updatePost } = useBlogPostMutations();
  
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [approvalLoading, setApprovalLoading] = useState(false);
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
  const [contentImages, setContentImages] = useState<Array<{ url: string; alt: string }>>([]);
  const [publishingTarget, setPublishingTarget] = useState<PublishingTarget | undefined>();
  const [orgId, setOrgId] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [userRole, setUserRole] = useState<UserRole>(UserRole.WRITER);
  const [reviewStatus, setReviewStatus] = useState<{
    status: 'none' | 'pending' | 'approved' | 'rejected' | 'changes_requested';
    reviewedBy?: string;
    reviewedAt?: string;
    comments?: string;
    loading: boolean;
  }>({
    status: 'none',
    loading: false,
  });
  const [linkAnalysis, setLinkAnalysis] = useState<{
    currentLinks: number;
    availableOpportunities: number;
    analyzing: boolean;
    lastAnalyzed: string | null;
    insertedLinks: Array<{ anchor: string; url: string; type: string }>;
  }>({
    currentLinks: 0,
    availableOpportunities: 0,
    analyzing: false,
    lastAnalyzed: null,
    insertedLinks: [],
  });

  // Authors state
  const [authors, setAuthors] = useState<Array<{
    id: string;
    name: string;
    email?: string;
    bio?: string;
    image_url?: string;
    role?: string;
  }>>([]);
  const [selectedAuthorId, setSelectedAuthorId] = useState<string | null>(null);
  const [authorsLoading, setAuthorsLoading] = useState(false);

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
      
      // Normalize existing content to clean up markdown artifacts
      const { normalizeBlogContent } = require('@/lib/content-sanitizer');
      const normalized = normalizeBlogContent({
        title: draft.title || '',
        content: draft.content || '',
        excerpt: draft.excerpt || '',
      });
      
      const extractedFields = extractBlogFields({
        title: normalized.title,
        content: normalized.content,
        excerpt: normalized.excerpt,
        metadata,
        seo_data: seoData,
        word_count: metadata.word_count as number | undefined,
      });

      // Extract images from metadata (Phase 2 stores them here)
      const featuredImageFromMetadata = metadata.featured_image as string | undefined;
      const featuredImageAltFromMetadata = metadata.featured_image_alt as string | undefined;
      const thumbnailImageFromMetadata = metadata.thumbnail_image as string | undefined;
      const thumbnailImageAltFromMetadata = metadata.thumbnail_image_alt as string | undefined;
      const contentImagesFromMetadata = metadata.content_images as Array<{ url: string; alt: string }> | undefined;

      // Set content images for display
      if (contentImagesFromMetadata && Array.isArray(contentImagesFromMetadata)) {
        setContentImages(contentImagesFromMetadata);
      } else {
        setContentImages([]);
      }

      setFormData({
        title: normalized.title,
        content: normalized.sanitizedContent || normalized.content,
        excerpt: normalized.excerpt || extractedFields.excerpt || '',
        status: draft.status || 'draft',
        slug: extractedFields.slug || '',
        seoTitle: extractedFields.seo_title || normalized.title || '',
        metaDescription: extractedFields.meta_description || normalized.excerpt || '',
        featuredImage: featuredImageFromMetadata || extractedFields.featured_image || '',
        featuredImageAlt: featuredImageAltFromMetadata || extractedFields.featured_image_alt || '',
        thumbnailImage: thumbnailImageFromMetadata || extractedFields.thumbnail_image || '',
        thumbnailImageAlt: thumbnailImageAltFromMetadata || extractedFields.thumbnail_image_alt || '',
        authorName: extractedFields.author_name || '',
        authorImage: extractedFields.author_image || '',
        authorBio: extractedFields.author_bio || '',
        locale: extractedFields.locale || 'en',
        isFeatured: extractedFields.is_featured ?? false,
        publishedAt: extractedFields.published_at || draft.published_at || '',
      });

      // Capture org_id from draft if present
      if ((draft as any)?.org_id) {
        setOrgId((draft as any).org_id);
      }

      // Capture publishing target from metadata if present
      if (metadata.cms_provider && metadata.site_id) {
        setPublishingTarget({
          cms_provider: metadata.cms_provider as any,
          site_id: metadata.site_id as string,
          collection_id: metadata.collection_id as string | undefined,
          site_name: (metadata as any).site_name as string | undefined,
        });
      }
    }
  }, [draft]);

  // Fetch current user to populate userId and role
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (user) {
        setUserId(user.id);
        const { data } = await supabase
          .from("users")
          .select("role, org_id")
          .eq("user_id", user.id)
          .single();
        if (data?.role) {
          setUserRole((data.role as UserRole) || UserRole.WRITER);
        }
        if (data?.org_id && !orgId) {
          setOrgId(data.org_id);
        }
      }
    });
  }, [orgId]);

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

  // Fetch authors on mount
  useEffect(() => {
    async function fetchAuthors() {
      setAuthorsLoading(true);
      try {
        const response = await fetch('/api/authors');
        if (response.ok) {
          const data = await response.json();
          setAuthors(data.authors || []);
          
          // If we have a current author name, try to find matching author
          if (formData.authorName && data.authors) {
            const matchingAuthor = data.authors.find(
              (a: { name: string }) => a.name.toLowerCase() === formData.authorName.toLowerCase()
            );
            if (matchingAuthor) {
              setSelectedAuthorId(matchingAuthor.id);
            }
          } else if (data.defaultAuthorId) {
            setSelectedAuthorId(data.defaultAuthorId);
          }
        }
      } catch (error) {
        logger.error('Failed to fetch authors:', error);
      } finally {
        setAuthorsLoading(false);
      }
    }
    fetchAuthors();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Handle author selection
  const handleAuthorSelect = (authorId: string) => {
    setSelectedAuthorId(authorId);
    const author = authors.find(a => a.id === authorId);
    if (author) {
      setFormData(prev => ({
        ...prev,
        authorName: author.name,
        authorImage: author.image_url || '',
        authorBio: author.bio || '',
      }));
    } else if (authorId === 'custom') {
      // Clear fields for custom entry
      setFormData(prev => ({
        ...prev,
        authorName: '',
        authorImage: '',
        authorBio: '',
      }));
    }
  };

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
    // Include content images from Phase 2
    if (contentImages.length > 0) metadataPayload.content_images = contentImages;

    return {
      ...existingMetadata,
      ...metadataPayload,
    };
  };

  // Insert an image into the TipTap content
  const handleInsertImageIntoContent = (imageUrl: string, altText: string, position: 'top' | 'bottom' | 'cursor' = 'bottom') => {
    if (!imageUrl) {
      alert('No image URL to insert');
      return;
    }
    
    // Create the image HTML - styled for blog posts
    const imageHTML = `<figure class="my-8"><img src="${imageUrl}" alt="${altText}" class="w-full h-auto rounded-lg" /><figcaption class="text-center text-sm text-gray-500 mt-2">${altText}</figcaption></figure>`;
    
    let newContent = formData.content || '';
    
    if (position === 'top') {
      // Insert at the beginning of content
      newContent = imageHTML + newContent;
    } else {
      // Insert at the end of content
      newContent = newContent + imageHTML;
    }
    
    // Update the content
    handleInputChange('content', newContent);
    
    logger.info('Image inserted into content', { 
      imageUrl: imageUrl.substring(0, 50) + '...', 
      altText, 
      position 
    });
    
    // Show confirmation
    alert(`✅ Image inserted at ${position} of content. Don't forget to save!`);
  };

  // Auto-insert all images into content after Phase 2 generation
  const autoInsertImagesIntoContent = (
    content: string,
    headerImage: { url: string; alt: string } | null,
    contentImagesArray: Array<{ url: string; alt: string }>
  ): string => {
    let modifiedContent = content || '';
    
    // Insert header image at the top (after first h1 or at start)
    if (headerImage?.url) {
      const headerImageHTML = `<figure class="featured-image my-8"><img src="${headerImage.url}" alt="${headerImage.alt || 'Featured image'}" class="w-full h-auto rounded-lg shadow-lg" /><figcaption class="text-center text-sm text-gray-500 mt-2">${headerImage.alt || ''}</figcaption></figure>`;
      
      const h1Match = modifiedContent.match(/<h1[^>]*>.*?<\/h1>/i);
      if (h1Match && h1Match.index !== undefined) {
        const insertPos = (h1Match.index || 0) + h1Match[0].length;
        modifiedContent = modifiedContent.slice(0, insertPos) + headerImageHTML + modifiedContent.slice(insertPos);
      } else {
        modifiedContent = headerImageHTML + modifiedContent;
      }
      logger.info('✅ Header image auto-inserted at top of content');
    }
    
    // Insert content images after H2/H3 headings (distributed evenly)
    if (contentImagesArray.length > 0) {
      const h2Matches = [...modifiedContent.matchAll(/<h2[^>]*>.*?<\/h2>/gi)];
      const h3Matches = [...modifiedContent.matchAll(/<h3[^>]*>.*?<\/h3>/gi)];
      const allHeadings = [...h2Matches, ...h3Matches].sort((a, b) => (a.index || 0) - (b.index || 0));
      
      let imagesInserted = 0;
      const headingsPerImage = Math.max(1, Math.floor(allHeadings.length / contentImagesArray.length));
      
      // Work backwards to preserve indices
      for (let i = allHeadings.length - 1; i >= 0 && imagesInserted < contentImagesArray.length; i--) {
        if ((allHeadings.length - 1 - i) % headingsPerImage === 0) {
          const heading = allHeadings[i];
          const imageIdx = contentImagesArray.length - 1 - imagesInserted;
          const img = contentImagesArray[imageIdx];
          if (img && heading.index !== undefined) {
            const imageHTML = `<figure class="content-image my-6"><img src="${img.url}" alt="${img.alt || 'Content image'}" class="w-full h-auto rounded-lg" /><figcaption class="text-center text-sm text-gray-500 mt-2">${img.alt || ''}</figcaption></figure>`;
            const insertPos = heading.index + heading[0].length;
            modifiedContent = modifiedContent.slice(0, insertPos) + imageHTML + modifiedContent.slice(insertPos);
            imagesInserted++;
          }
        }
      }
      logger.info(`✅ ${imagesInserted} content images auto-inserted after headings`);
    }
    
    return modifiedContent;
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
      
      // Apply unified sanitization before saving to remove any remaining AI artifacts
      const draftMetadata = draft?.metadata as Record<string, unknown> | undefined;
      const primaryKeyword = (draftMetadata?.keywords as string[])?.[0];
      
      const sanitizedData = sanitizeBlogData({
        title: formData.title,
        content: formData.content,
        excerpt: formData.excerpt,
      }, primaryKeyword);
      
      if (sanitizedData.sanitizationApplied) {
        logger.info('Save: Content sanitized before saving', {
          summary: sanitizedData.summary,
        });
      }
      
      const payload = {
        title: sanitizedData.title,
        content: sanitizedData.content,
        excerpt: sanitizedData.excerpt,
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

  // Fetch review status on load
  useEffect(() => {
    const fetchReviewStatus = async () => {
      if (!draftId) return;
      
      setReviewStatus(prev => ({ ...prev, loading: true }));
      try {
        const response = await fetch(`/api/blog-approvals?post_id=${draftId}&limit=1`);
        if (response.ok) {
          const data = await response.json();
          if (data.items && data.items.length > 0) {
            const approval = data.items[0];
            setReviewStatus({
              status: approval.status || 'pending',
              reviewedBy: approval.reviewed_by_user?.full_name || approval.reviewed_by_user?.email,
              reviewedAt: approval.reviewed_at,
              comments: approval.review_notes,
              loading: false,
            });
          } else {
            setReviewStatus({ status: 'none', loading: false });
          }
        }
      } catch (error) {
        logger.warn('Failed to fetch review status', { error });
        setReviewStatus({ status: 'none', loading: false });
      }
    };

    fetchReviewStatus();
  }, [draftId]);

  const handleRequestApproval = async () => {
    // Get queue_id from draft metadata
    const draftMetadata = draft?.metadata as Record<string, unknown> | undefined;
    const queueId = draftMetadata?.workflow_queue_id as string | undefined;
    
    if (!queueId) {
      alert('No associated queue item found. This draft may have been created manually.');
      return;
    }
    
    setApprovalLoading(true);
    try {
      const response = await fetch("/api/blog-approvals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          queue_id: queueId,
        }),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to request approval");
      }
      
      // Update review status to pending
      setReviewStatus({
        status: 'pending',
        loading: false,
      });
      
      alert("✅ Approval requested successfully! The content is now pending review.");
    } catch (err) {
      console.error("Error requesting approval:", err);
      alert(err instanceof Error ? err.message : "Failed to request approval");
    } finally {
      setApprovalLoading(false);
    }
  };

  const handleRegenerateBlog = async () => {
    // Get queue item data from draft metadata
    const draftMetadata = draft?.metadata as Record<string, unknown> | undefined;
    
    if (!confirm(`Are you sure you want to regenerate "${formData.title}"? This will create a new queue item.`)) {
      return;
    }
    
    try {
      const response = await fetch('/api/blog-writer/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: formData.title || 'Blog Post',
          keywords: draftMetadata?.keywords || [],
          target_audience: draftMetadata?.target_audience || 'general',
          tone: draftMetadata?.tone || 'professional',
          word_count: contentStats.wordCount || 1500,
        }),
      });
      
      if (!response.ok) throw new Error("Failed to regenerate");
      
      const result = await response.json();
      if (result.queue_id) {
        router.push(`/contentmanagement/blog-queue/${result.queue_id}`);
      } else {
        alert("Blog regeneration started! Check the Blog Queue for progress.");
        router.push('/contentmanagement/blog-queue');
      }
    } catch (err) {
      console.error("Error regenerating blog:", err);
      alert("Failed to regenerate blog. Please try again.");
    }
  };

  const handlePhase1ContentGeneration = async () => {
    if (!formData.title) {
      alert('Please enter a title before generating content.');
      return;
    }

    setAiGenerating(true);
    try {
      // Get org_id and keywords from draft metadata for site-aware generation
      const orgId = (draft as any)?.org_id as string | undefined;
      const draftMetadata = draft?.metadata as Record<string, unknown> | undefined;
      const keywords = (draftMetadata?.keywords as string[]) || [];

      const response = await fetch('/api/workflow/generate-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: formData.title,
          keywords: keywords,
          target_audience: draftMetadata?.target_audience || 'general',
          tone: draftMetadata?.tone || 'professional',
          word_count: 1500,
          org_id: orgId, // Enable site-aware generation with stored scan data
          use_site_context: true, // Use existing site content for context
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Content generation failed');
      }

      const result = await response.json();
      
      // Normalize and update content
      if (result.content || result.blog_post?.content) {
        const { normalizeBlogContent } = await import('@/lib/content-sanitizer');
        const normalized = normalizeBlogContent(result);
        
        // Apply unified sanitization to remove AI artifacts
        const sanitizedContent = sanitizeContent(normalized.sanitizedContent || normalized.content);
        const sanitizedExcerpt = sanitizeExcerpt(normalized.excerpt || '');
        
        if (sanitizedContent.wasModified) {
          logger.info('Phase 1: AI artifacts removed', {
            artifactsRemoved: sanitizedContent.artifactsRemoved.length,
            stats: sanitizedContent.stats,
          });
        }
        
        setFormData(prev => ({
          ...prev,
          content: sanitizedContent.content,
          excerpt: sanitizedExcerpt.excerpt || prev.excerpt,
        }));

        // Update workflow phase
        setWorkflowPhase('phase_1_content');
        
        // Show success with site context info
        const usedSiteContext = result.site_context_used;
        alert(usedSiteContext 
          ? 'Content generated with site intelligence! Internal link targets embedded.'
          : 'Content generated successfully!');
      }
    } catch (error) {
      logger.error('Phase 1 content generation failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate content. Please try again.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handlePhase2ImageGeneration = async () => {
    if (!formData.content || !formData.title) {
      alert('Please generate content (Phase 1) before generating images.');
      return;
    }

    setAiGenerating(true);
    try {
      // Get queue_id from draft metadata if available
      const draftMetadata = draft?.metadata as Record<string, unknown> | undefined;
      const queueId = draftMetadata?.workflow_queue_id as string | undefined;

      if (!queueId) {
        // Create a temporary queue entry for Phase 2 (minimal data)
        const queueResponse = await fetch('/api/workflow/multi-phase', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            topic: formData.title || 'Untitled Blog Post',
            keywords: [],
            target_audience: 'general',
            tone: 'professional',
            word_count: 1500,
            phase2Only: true, // Flag to create minimal queue entry
            generateFeaturedImage: true,
            generateContentImages: true,
            imageStyle: 'photographic',
          }),
        });

        if (!queueResponse.ok) {
          throw new Error('Failed to create queue entry');
        }

        const queueResult = await queueResponse.json();
        const tempQueueId = queueResult.queue_id;

        // Now generate images - include org_id for tenant isolation in Cloudinary
        const orgId = (draft as Record<string, unknown>)?.org_id as string | undefined;
        const response = await fetch('/api/workflow/generate-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            queue_id: tempQueueId,
            org_id: orgId, // CRITICAL: Pass org_id for tenant isolation in Cloudinary
            topic: formData.title,
            title: formData.title,
            content: formData.content, // Pass content for analysis
            excerpt: formData.excerpt,
            generate_featured: true,
            generate_content_images: true,
            generate_thumbnail: true, // Generate thumbnail
            style: 'photographic',
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Image generation failed');
        }

        const result = await response.json();

        // Update form data with generated images IMMEDIATELY (before saving)
        let updatedFormData = { ...formData };
        
        if (result.header_image || result.featured_image) {
          const headerImage = result.header_image || result.featured_image;
          updatedFormData.featuredImage = headerImage.url || '';
          updatedFormData.featuredImageAlt = headerImage.alt || `Header image for ${formData.title}`;
        }

        if (result.thumbnail_image) {
          updatedFormData.thumbnailImage = result.thumbnail_image.url || '';
          updatedFormData.thumbnailImageAlt = result.thumbnail_image.alt || `Thumbnail for ${formData.title}`;
        }

        // Update content images state IMMEDIATELY
        const updatedContentImages = result.content_images && result.content_images.length > 0
          ? result.content_images.map((img: { url: string; alt: string }) => ({
              url: img.url,
              alt: img.alt,
            }))
          : contentImages;
        
        // ═══════════════════════════════════════════════════════════════════════════
        // AUTO-INSERT IMAGES INTO CONTENT (Path 1: new tempQueueId)
        // Header goes at top, content images distributed after headings
        // ═══════════════════════════════════════════════════════════════════════════
        const headerImageData = updatedFormData.featuredImage 
          ? { url: updatedFormData.featuredImage, alt: updatedFormData.featuredImageAlt || 'Featured image' }
          : null;
        updatedFormData.content = autoInsertImagesIntoContent(
          updatedFormData.content || '',
          headerImageData,
          updatedContentImages
        );
        
        // Update state immediately so images show up right away
        setFormData(updatedFormData);
        setContentImages(updatedContentImages);
        
        logger.info('✅ Images set in form state with auto-inserted images', {
          featuredImage: updatedFormData.featuredImage,
          thumbnailImage: updatedFormData.thumbnailImage,
          contentImagesCount: updatedContentImages.length,
        });

        // Save images AND updated content to draft immediately using updatePost
        try {
          // Build metadata with updated form data (use updatedFormData, not formData)
          const existingMetadata = (draft?.metadata as Record<string, unknown>) || {};
          const updatedMetadata: Record<string, unknown> = {
            ...existingMetadata,
            slug: updatedFormData.slug || generateSlug(updatedFormData.title || 'untitled'),
            locale: updatedFormData.locale || 'en',
            is_featured: updatedFormData.isFeatured,
            read_time: contentStats.readTime,
            word_count: contentStats.wordCount,
            featured_image: updatedFormData.featuredImage,
            featured_image_alt: updatedFormData.featuredImageAlt,
            thumbnail_image: updatedFormData.thumbnailImage,
            thumbnail_image_alt: updatedFormData.thumbnailImageAlt,
            content_images: updatedContentImages,
            workflow_phase: 'phase_2_images',
          };

          // Include other fields if they exist
          if (updatedFormData.authorName) updatedMetadata.author_name = updatedFormData.authorName;
          if (updatedFormData.authorImage) updatedMetadata.author_image = updatedFormData.authorImage;
          if (updatedFormData.authorBio) updatedMetadata.author_bio = updatedFormData.authorBio;
          if (updatedFormData.publishedAt) updatedMetadata.published_at = updatedFormData.publishedAt;

          const savedPost = await updatePost(draftId, {
            content: updatedFormData.content, // Save content with auto-inserted images
            metadata: updatedMetadata,
          });

          if (savedPost) {
            logger.info('✅ Images and content saved to draft successfully', {
              hasFeaturedImage: !!updatedMetadata.featured_image,
              hasThumbnail: !!updatedMetadata.thumbnail_image,
              contentImagesCount: Array.isArray(updatedMetadata.content_images) ? updatedMetadata.content_images.length : 0,
            });
          } else {
            logger.warn('⚠️ Failed to save images to draft - updatePost returned null');
          }
        } catch (saveError) {
          logger.warn('Error saving images to draft', { error: saveError });
        }

        // Reload content from server to get updated HTML with inline images
        try {
          const refreshResponse = await fetch(`/api/drafts/${draftId}`);
          if (refreshResponse.ok) {
            const refreshResult = await refreshResponse.json();
            const refreshedDraft = refreshResult.data;
            if (refreshedDraft?.content && refreshedDraft.content !== formData.content) {
              setFormData(prev => ({ ...prev, content: refreshedDraft.content }));
              logger.info('✅ Content refreshed with inline images');
            }
          }
        } catch (refreshError) {
          logger.warn('Could not refresh content', { error: refreshError });
        }

        setWorkflowPhase('phase_2_images');
        alert('✅ Phase 2: Images generated and inserted into content! Check the editor to see your images.');
      } else {
        // Use existing queue_id - include org_id for tenant isolation in Cloudinary
        const existingOrgId = (draft as Record<string, unknown>)?.org_id as string | undefined;
        const response = await fetch('/api/workflow/generate-images', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            queue_id: queueId,
            org_id: existingOrgId, // CRITICAL: Pass org_id for tenant isolation in Cloudinary
            topic: formData.title,
            title: formData.title,
            content: formData.content,
            excerpt: formData.excerpt,
            generate_featured: true,
            generate_content_images: true,
            generate_thumbnail: true,
            style: 'photographic',
          }),
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Image generation failed');
        }

        const result = await response.json();

        // Update form data with generated images IMMEDIATELY (before saving)
        let updatedFormData = { ...formData };
        
        if (result.header_image || result.featured_image) {
          const headerImage = result.header_image || result.featured_image;
          updatedFormData.featuredImage = headerImage.url || '';
          updatedFormData.featuredImageAlt = headerImage.alt || `Header image for ${formData.title}`;
        }

        if (result.thumbnail_image) {
          updatedFormData.thumbnailImage = result.thumbnail_image.url || '';
          updatedFormData.thumbnailImageAlt = result.thumbnail_image.alt || `Thumbnail for ${formData.title}`;
        }

        // Update content images state IMMEDIATELY
        const updatedContentImages = result.content_images && result.content_images.length > 0
          ? result.content_images.map((img: { url: string; alt: string }) => ({
              url: img.url,
              alt: img.alt,
            }))
          : contentImages;
        
        // ═══════════════════════════════════════════════════════════════════════════
        // AUTO-INSERT IMAGES INTO CONTENT (Path 2: existing queueId)
        // Header goes at top, content images distributed after headings
        // ═══════════════════════════════════════════════════════════════════════════
        const headerImageData2 = updatedFormData.featuredImage 
          ? { url: updatedFormData.featuredImage, alt: updatedFormData.featuredImageAlt || 'Featured image' }
          : null;
        updatedFormData.content = autoInsertImagesIntoContent(
          updatedFormData.content || '',
          headerImageData2,
          updatedContentImages
        );
        
        // Update state immediately so images show up right away
        setFormData(updatedFormData);
        setContentImages(updatedContentImages);
        
        logger.info('✅ Images set in form state with auto-inserted images', {
          featuredImage: updatedFormData.featuredImage,
          thumbnailImage: updatedFormData.thumbnailImage,
          contentImagesCount: updatedContentImages.length,
        });

        // Save images AND updated content to draft immediately using updatePost
        try {
          // Build metadata with updated form data (use updatedFormData, not formData)
          const existingMetadata = (draft?.metadata as Record<string, unknown>) || {};
          const updatedMetadata: Record<string, unknown> = {
            ...existingMetadata,
            slug: updatedFormData.slug || generateSlug(updatedFormData.title || 'untitled'),
            locale: updatedFormData.locale || 'en',
            is_featured: updatedFormData.isFeatured,
            read_time: contentStats.readTime,
            word_count: contentStats.wordCount,
            featured_image: updatedFormData.featuredImage,
            featured_image_alt: updatedFormData.featuredImageAlt,
            thumbnail_image: updatedFormData.thumbnailImage,
            thumbnail_image_alt: updatedFormData.thumbnailImageAlt,
            content_images: updatedContentImages,
            workflow_phase: 'phase_2_images',
          };

          // Include other fields if they exist
          if (updatedFormData.authorName) updatedMetadata.author_name = updatedFormData.authorName;
          if (updatedFormData.authorImage) updatedMetadata.author_image = updatedFormData.authorImage;
          if (updatedFormData.authorBio) updatedMetadata.author_bio = updatedFormData.authorBio;
          if (updatedFormData.publishedAt) updatedMetadata.published_at = updatedFormData.publishedAt;

          const savedPost = await updatePost(draftId, {
            content: updatedFormData.content, // Save content with auto-inserted images
            metadata: updatedMetadata,
          });

          if (savedPost) {
            logger.info('✅ Images and content saved to draft successfully', {
              hasFeaturedImage: !!updatedMetadata.featured_image,
              hasThumbnail: !!updatedMetadata.thumbnail_image,
              contentImagesCount: Array.isArray(updatedMetadata.content_images) ? updatedMetadata.content_images.length : 0,
            });
          } else {
            logger.warn('⚠️ Failed to save images to draft - updatePost returned null');
          }
        } catch (saveError) {
          logger.warn('Error saving images to draft', { error: saveError });
        }

        // Reload content from server to get updated HTML with inline images
        try {
          const refreshResponse = await fetch(`/api/drafts/${draftId}`);
          if (refreshResponse.ok) {
            const refreshResult = await refreshResponse.json();
            const refreshedDraft = refreshResult.data;
            if (refreshedDraft?.content && refreshedDraft.content !== formData.content) {
              setFormData(prev => ({ ...prev, content: refreshedDraft.content }));
              logger.info('✅ Content refreshed with inline images');
            }
          }
        } catch (refreshError) {
          logger.warn('Could not refresh content', { error: refreshError });
        }

        setWorkflowPhase('phase_2_images');
        alert('✅ Phase 2: Images generated and inserted into content! Check the editor to see your images.');
      }
    } catch (error) {
      logger.error('Phase 2 image generation failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate images. Please try again.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handlePhase3ContentEnhancement = async () => {
    if (!formData.content) {
      alert('Please add content before enhancing metadata.');
      return;
    }

    setAiGenerating(true);
    try {
      // Extract keywords and org_id from draft metadata
      const draftMetadata = draft?.metadata as Record<string, unknown> | undefined;
      const queueId = draftMetadata?.workflow_queue_id as string | undefined;
      const keywords = (draftMetadata?.keywords as string[]) || [];
      const orgId = (draft as any)?.org_id as string | undefined;

      logger.info('Phase 3: Starting content enhancement', {
        hasQueueId: !!queueId,
        hasOrgId: !!orgId,
        keywordsCount: keywords.length,
        contentLength: formData.content.length,
      });

      const response = await fetch('/api/workflow/enhance-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: formData.content,
          title: formData.title,
          topic: formData.title,
          keywords: keywords,
          generate_structured_data: true,
          improve_formatting: true,
          insert_hyperlinks: true, // Enable internal link insertion via InterlinkingEngine
          deep_interlinking: true, // Enable Phase 2 lazy-loading for top candidates
          max_internal_links: 5, // Maximum internal links to insert
          org_id: orgId, // Pass org_id for Webflow integration lookup
          site_id: publishingTarget?.site_id, // Pass explicit site_id for multi-site orgs
          queue_id: queueId, // Pass queue_id to update the draft automatically
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Content enhancement failed');
      }

      const result = await response.json();
      
      logger.info('Phase 3: Enhancement completed', {
        hasEnhancedContent: !!result.enhanced_content,
        hasEnhancedFields: !!result.enhanced_fields,
        seoScore: result.seo_score,
        contentLengthAfter: result.enhanced_content?.length,
      });
      
      // Sanitize the enhanced content to remove any AI artifacts
      const sanitizedContent = sanitizeContent(result.enhanced_content || '');
      const sanitizedExcerpt = sanitizeExcerpt(result.enhanced_fields?.excerpt || '');
      const sanitizedMetaDesc = sanitizeExcerpt(result.enhanced_fields?.meta_description || '');
      
      if (sanitizedContent.wasModified) {
        logger.info('Phase 3: AI artifacts removed from enhanced content', {
          artifactsRemoved: sanitizedContent.artifactsRemoved.length,
          stats: sanitizedContent.stats,
        });
      }
      
      // Update enhanced fields INCLUDING the enhanced content with internal links
      setFormData(prev => ({
        ...prev,
        // Update content with the sanitized enhanced version (includes internal links)
        content: sanitizedContent.content || prev.content,
        // Update SEO fields (also sanitized)
        seoTitle: sanitizeTitle(result.enhanced_fields?.meta_title || '') || prev.seoTitle,
        metaDescription: sanitizedMetaDesc.excerpt || prev.metaDescription,
        excerpt: sanitizedExcerpt.excerpt || prev.excerpt,
        slug: result.enhanced_fields?.slug || prev.slug,
      }));

      // Update workflow phase
      setWorkflowPhase('phase_3_enhancement');
      
      // Refetch to ensure all changes are synced
      await refetch();
      
      alert('Content enhanced with internal links and metadata!');
    } catch (error) {
      logger.error('Phase 3 enhancement failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to enhance content. Please try again.');
    } finally {
      setAiGenerating(false);
    }
  };

  // Handler for polishing existing content (Phase 2 edit mode)
  const handlePolishContent = async (operations: string[] = ['full_polish']) => {
    if (!formData.content) {
      alert('Please add content before polishing.');
      return;
    }

    setAiGenerating(true);
    try {
      const orgId = (draft as any)?.org_id as string | undefined;
      const draftMetadata = draft?.metadata as Record<string, unknown> | undefined;
      const keywords = (draftMetadata?.keywords as string[]) || [];

      logger.info('Starting content polish', {
        operations,
        hasOrgId: !!orgId,
        keywordsCount: keywords.length,
        contentLength: formData.content.length,
      });

      const response = await fetch('/api/workflow/polish-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: formData.content,
          title: formData.title,
          keywords,
          operations,
          org_id: orgId,
          site_id: publishingTarget?.site_id, // Pass explicit site_id for multi-site orgs
          max_internal_links: 5,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Content polish failed');
      }

      const result = await response.json();
      
      logger.info('Content polish completed', {
        changesMade: result.changes_made?.length || 0,
        internalLinksAdded: result.improvements?.internal_links_added || 0,
        suggestionsCount: result.suggestions?.length || 0,
      });

      // Update content with polished version (sanitized)
      if (result.polished_content) {
        const sanitizedContent = sanitizeContent(result.polished_content);
        
        if (sanitizedContent.wasModified) {
          logger.info('Polish: AI artifacts removed', {
            artifactsRemoved: sanitizedContent.artifactsRemoved.length,
            stats: sanitizedContent.stats,
          });
        }
        
        setFormData(prev => ({
          ...prev,
          content: sanitizedContent.content,
        }));
      }

      // Update link analysis state
      if (result.improvements?.internal_links_added > 0) {
        setLinkAnalysis(prev => ({
          ...prev,
          currentLinks: prev.currentLinks + result.improvements.internal_links_added,
          lastAnalyzed: new Date().toISOString(),
        }));
      }

      // Build success message
      const changes = result.changes_made || [];
      const suggestions = result.suggestions || [];
      let message = 'Content polished successfully!';
      if (changes.length > 0) {
        message += `\n\nChanges made:\n• ${changes.slice(0, 3).join('\n• ')}`;
      }
      if (suggestions.length > 0) {
        message += `\n\nSuggestions:\n• ${suggestions.slice(0, 3).join('\n• ')}`;
      }
      alert(message);

    } catch (error) {
      logger.error('Content polish failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to polish content. Please try again.');
    } finally {
      setAiGenerating(false);
    }
  };

  // Handler for inserting internal links only (without full Phase 3 enhancement)
  const handleInsertInternalLinks = async () => {
    if (!formData.content) {
      alert('Please add content before inserting links.');
      return;
    }

    setLinkAnalysis(prev => ({ ...prev, analyzing: true }));
    
    try {
      const orgId = (draft as any)?.org_id as string | undefined;
      const draftMetadata = draft?.metadata as Record<string, unknown> | undefined;
      const keywords = (draftMetadata?.keywords as string[]) || [];

      logger.info('Inserting internal links', {
        hasOrgId: !!orgId,
        keywordsCount: keywords.length,
        contentLength: formData.content.length,
      });

      // Count current links
      const currentLinkCount = (formData.content.match(/<a\s/gi) || []).length;

      const response = await fetch('/api/workflow/enhance-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: formData.content,
          title: formData.title,
          topic: formData.title,
          keywords: keywords.length > 0 ? keywords : [''],
          generate_structured_data: false,
          improve_formatting: false, // Don't reformat, just insert links
          insert_hyperlinks: true,
          org_id: orgId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Link insertion failed');
      }

      const result = await response.json();
      
      // Count new links
      const newLinkCount = (result.enhanced_content?.match(/<a\s/gi) || []).length;
      const linksInserted = newLinkCount - currentLinkCount;

      // Extract inserted links for display
      const linkRegex = /<a\s+(?:[^>]*?\s+)?href="([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
      const insertedLinks: Array<{ anchor: string; url: string; type: string }> = [];
      let match;
      while ((match = linkRegex.exec(result.enhanced_content || '')) !== null) {
        const url = match[1];
        const anchor = match[2].replace(/<[^>]+>/g, '').trim();
        if (url.includes('webflow.io') || url.includes('.')) {
          insertedLinks.push({
            anchor: anchor.substring(0, 50),
            url,
            type: url.includes('webflow.io') ? 'CMS' : 'Static',
          });
        }
      }

      // Update content with links
      if (result.enhanced_content) {
        setFormData(prev => ({
          ...prev,
          content: result.enhanced_content,
        }));
      }

      setLinkAnalysis({
        currentLinks: newLinkCount,
        availableOpportunities: 0,
        analyzing: false,
        lastAnalyzed: new Date().toISOString(),
        insertedLinks: insertedLinks.slice(0, 10), // Show up to 10 links
      });

      if (linksInserted > 0) {
        alert(`✅ Inserted ${linksInserted} internal links! Don't forget to save your draft.`);
      } else {
        alert('No new link opportunities found. Your content may already have good internal linking.');
      }
    } catch (error) {
      logger.error('Link insertion failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to insert links. Please try again.');
      setLinkAnalysis(prev => ({ ...prev, analyzing: false }));
    }
  };

  // Count current links in content
  useEffect(() => {
    if (formData.content) {
      const linkCount = (formData.content.match(/<a\s/gi) || []).length;
      setLinkAnalysis(prev => ({ ...prev, currentLinks: linkCount }));
    }
  }, [formData.content]);

  const handleGenerateThumbnail = async () => {
    if (!formData.title) {
      alert('Please enter a title before generating thumbnail.');
      return;
    }

    setAiGenerating(true);
    try {
      // Use the new generate-and-upload endpoint that handles Cloudinary upload and media library
      const response = await fetch('/api/images/generate-and-upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Professional thumbnail image for blog post: "${formData.title}". Square format, eye-catching, clean design suitable for blog preview cards and social sharing.`,
          aspectRatio: '1:1',
          imageType: 'thumbnail',
          title: formData.title,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Thumbnail generation failed');
      }

      const result = await response.json();
      
      logger.debug('Thumbnail generation response', {
        success: result.success,
        url: result.url?.substring(0, 100),
        assetId: result.asset_id,
      });

      if (result.success && result.url) {
        setFormData(prev => ({
          ...prev,
          thumbnailImage: result.url,
          thumbnailImageAlt: prev.thumbnailImageAlt || `Thumbnail for ${formData.title}`,
        }));
        logger.info('✅ Thumbnail generated, uploaded to Cloudinary, and saved to media library', {
          url: result.url.substring(0, 100),
          assetId: result.asset_id,
          publicId: result.public_id,
        });
        alert('✅ Thumbnail generated and saved to Media Library!');
      } else {
        throw new Error('No image URL returned from generation');
      }
    } catch (error) {
      logger.error('Thumbnail generation failed:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate thumbnail. Please try again.');
    } finally {
      setAiGenerating(false);
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
            {/* Review Status Indicator */}
            {reviewStatus.status !== 'none' && !reviewStatus.loading && (
              <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${
                reviewStatus.status === 'approved' 
                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 border border-green-200 dark:border-green-800'
                  : reviewStatus.status === 'rejected'
                  ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 border border-red-200 dark:border-red-800'
                  : reviewStatus.status === 'changes_requested'
                  ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
              }`}>
                {reviewStatus.status === 'approved' && <CheckCircleIcon className="w-4 h-4" />}
                {reviewStatus.status === 'rejected' && <XMarkIcon className="w-4 h-4" />}
                {reviewStatus.status === 'changes_requested' && <ExclamationTriangleIcon className="w-4 h-4" />}
                {reviewStatus.status === 'pending' && <ArrowPathIcon className="w-4 h-4 animate-spin" />}
                <span>
                  {reviewStatus.status === 'approved' && 'Approved'}
                  {reviewStatus.status === 'rejected' && 'Rejected'}
                  {reviewStatus.status === 'changes_requested' && 'Changes Requested'}
                  {reviewStatus.status === 'pending' && 'Pending Review'}
                </span>
                {reviewStatus.reviewedBy && (
                  <span className="text-xs opacity-75">by {reviewStatus.reviewedBy}</span>
                )}
              </div>
            )}
            
            {/* Request Approval - for review workflow */}
            {(reviewStatus.status === 'none' || reviewStatus.status === 'rejected' || reviewStatus.status === 'changes_requested') && (
              <button
                onClick={handleRequestApproval}
                disabled={approvalLoading || !formData.content}
                className="flex items-center px-3 py-2 border border-blue-300 dark:border-blue-600 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                title="Submit for review and approval"
              >
                <DocumentCheckIcon className="w-4 h-4 mr-1.5" />
                {approvalLoading ? 'Requesting...' : reviewStatus.status === 'none' ? 'Request Approval' : 'Resubmit for Approval'}
              </button>
            )}
            
            {/* Regenerate - creates new queue item */}
            <button
              onClick={handleRegenerateBlog}
              disabled={!formData.title}
              className="flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              title="Create a new generation with updated settings"
            >
              <ArrowPathIcon className="w-4 h-4 mr-1.5" />
              Regenerate
            </button>
            
            {/* Save Draft - Primary */}
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-medium"
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
          
          {/* Phase-specific indicators and manual triggers */}
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap gap-3">
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
            
            {/* Publishing Target Selection - MUST be set before Phase 3 for internal linking */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Publishing Target
                </h4>
                {!publishingTarget?.site_id && (
                  <span className="text-xs px-2 py-0.5 bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-full flex items-center gap-1">
                    <ExclamationTriangleIcon className="w-3 h-3" />
                    Required for internal linking
                  </span>
                )}
                {publishingTarget?.site_id && (
                  <span className="text-xs px-2 py-0.5 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full flex items-center gap-1">
                    <CheckCircleIcon className="w-3 h-3" />
                    Site selected
                  </span>
                )}
              </div>
              <div className="space-y-3">
                <PublishingTargetSelector
                  orgId={orgId || ''}
                  userId={userId || ''}
                  userRole={userRole}
                  value={publishingTarget}
                  onChange={(target) => {
                    setPublishingTarget(target);
                    logger.info('Publishing target selected', {
                      siteId: target?.site_id,
                      siteName: target?.site_name,
                      cmsProvider: target?.cms_provider,
                    });
                  }}
                />
                {/* Site Scan Status - Shows internal linking data availability */}
                {publishingTarget?.site_id && orgId && (
                  <SiteScanStatus
                    orgId={orgId}
                    siteId={publishingTarget.site_id}
                    siteName={publishingTarget.site_name}
                    compact={true}
                  />
                )}
                {!publishingTarget?.site_id && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Select a publishing target to enable intelligent internal linking during content enhancement (Phase 3).
                  </p>
                )}
              </div>
            </div>

            {/* AI Generation Pipeline - For new content creation */}
            <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  AI Generation Pipeline
                </h4>
                {(phase1Complete || phase2Complete || phase3Complete) && (
                  <span className="text-xs px-2 py-0.5 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-full">
                    {phase3Complete ? 'All phases complete' : phase2Complete ? '2 of 3 complete' : '1 of 3 complete'}
                  </span>
                )}
              </div>
              <div className="flex flex-wrap gap-3">
                {!phase1Complete && (
                  <button
                    onClick={handlePhase1ContentGeneration}
                    disabled={aiGenerating}
                    title="Generate site-aware content using existing site intelligence"
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm"
                  >
                    <DocumentTextIcon className="w-4 h-4" />
                    {aiGenerating ? 'Generating...' : '1. Generate Content'}
                  </button>
                )}
                {phase1Complete && !phase2Complete && (
                  <button
                    onClick={handlePhase2ImageGeneration}
                    disabled={aiGenerating}
                    title="Generate featured, thumbnail, and inline images"
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm"
                  >
                    {aiGenerating ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <PhotoIcon className="w-4 h-4" />
                    )}
                    {aiGenerating ? 'Generating Images...' : '2. Add Images'}
                  </button>
                )}
                {phase2Complete && !phase3Complete && (
                  <button
                    onClick={handlePhase3ContentEnhancement}
                    disabled={aiGenerating}
                    title="Enhance SEO, add internal links, generate structured data"
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 dark:bg-indigo-500 text-white rounded-lg hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm"
                  >
                    {aiGenerating ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <SparklesIcon className="w-4 h-4" />
                    )}
                    {aiGenerating ? 'Enhancing...' : '3. Enhance & Link'}
                  </button>
                )}
                {phase3Complete && (
                  <div className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-700 dark:text-green-300 text-sm font-medium">
                    <CheckCircleIcon className="w-4 h-4" />
                    Ready for Review
                  </div>
                )}
              </div>
            </div>

            {/* Polish & Refine Section - Available after content exists */}
            {formData.content && formData.content.length > 100 && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 flex items-center gap-2">
                    <SparklesIcon className="w-4 h-4 text-amber-500" />
                    Polish & Refine (Human Review Mode)
                  </h4>
                  <span className="text-xs px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 rounded-full">
                    Targeted improvements
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                  Use these tools to make targeted improvements without regenerating content. Ideal for final touches before publishing.
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  <button
                    onClick={() => handlePolishContent(['full_polish'])}
                    disabled={aiGenerating}
                    title="Comprehensive polish: readability, grammar, SEO, and links"
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    {aiGenerating ? (
                      <div className="w-3 h-3 border-2 border-amber-600 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <SparklesIcon className="w-4 h-4" />
                    )}
                    Full Polish
                  </button>
                  <button
                    onClick={() => handlePolishContent(['add_internal_links'])}
                    disabled={aiGenerating}
                    title="Add internal links using site intelligence"
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/30 dark:hover:bg-blue-900/50 text-blue-800 dark:text-blue-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    <ArrowsRightLeftIcon className="w-4 h-4" />
                    Add Links
                  </button>
                  <button
                    onClick={() => handlePolishContent(['improve_readability'])}
                    disabled={aiGenerating}
                    title="Improve flow, sentence structure, and clarity"
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-800 dark:text-green-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    <DocumentTextIcon className="w-4 h-4" />
                    Readability
                  </button>
                  <button
                    onClick={() => handlePolishContent(['enhance_seo'])}
                    disabled={aiGenerating}
                    title="Optimize meta title, description, and keywords"
                    className="flex items-center justify-center gap-2 px-3 py-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-800 dark:text-purple-200 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium"
                  >
                    <DocumentCheckIcon className="w-4 h-4" />
                    SEO
                  </button>
                </div>
                {/* Additional polish operations */}
                <div className="grid grid-cols-3 gap-2 mt-2">
                  <button
                    onClick={() => handlePolishContent(['fix_grammar'])}
                    disabled={aiGenerating}
                    title="Fix grammar, spelling, and punctuation"
                    className="flex items-center justify-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
                  >
                    Fix Grammar
                  </button>
                  <button
                    onClick={() => handlePolishContent(['strengthen_intro'])}
                    disabled={aiGenerating}
                    title="Make the introduction more compelling"
                    className="flex items-center justify-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
                  >
                    Better Intro
                  </button>
                  <button
                    onClick={() => handlePolishContent(['strengthen_conclusion'])}
                    disabled={aiGenerating}
                    title="Strengthen the conclusion with a clear CTA"
                    className="flex items-center justify-center gap-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium"
                  >
                    Better Outro
                  </button>
                </div>
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
            generatedImages={[
              // Featured/Header image
              ...(formData.featuredImage ? [{
                url: formData.featuredImage,
                alt: formData.featuredImageAlt || 'Featured image',
                type: 'header' as const
              }] : []),
              // Thumbnail image
              ...(formData.thumbnailImage ? [{
                url: formData.thumbnailImage,
                alt: formData.thumbnailImageAlt || 'Thumbnail',
                type: 'thumbnail' as const
              }] : []),
              // Content images from Phase 2
              ...contentImages.map((img, idx) => ({
                url: img.url,
                alt: img.alt || `Content image ${idx + 1}`,
                type: 'content' as const
              }))
            ]}
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

        {/* ═══════════════════════════════════════════════════════════════════════════
            BLOG IMAGES SECTION - Always visible with intuitive layout
            This section manages all images: Header (16:9), Thumbnail (1:1), and Content Images
        ═══════════════════════════════════════════════════════════════════════════ */}
        <div className="bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-gray-800 dark:via-gray-800 dark:to-gray-800 rounded-xl shadow-sm border border-purple-200 dark:border-gray-700 p-6 mb-6">
          {/* Section Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <PhotoIcon className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                Blog Images
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Header, thumbnail, and content images for your blog post. Images are auto-inserted when generated.
              </p>
            </div>
            <div className="flex items-center gap-3">
              {phase2Complete && (
                <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 rounded-full">
                  <CheckCircleIcon className="w-3 h-3" />
                  Images Generated
                </span>
              )}
              {!phase2Complete && phase1Complete && (
                <button
                  onClick={handlePhase2ImageGeneration}
                  disabled={aiGenerating}
                  className="flex items-center gap-2 px-4 py-2 bg-purple-600 dark:bg-purple-500 text-white rounded-lg hover:bg-purple-700 dark:hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-medium shadow-sm"
                >
                  {aiGenerating ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <SparklesIcon className="w-4 h-4" />
                  )}
                  {aiGenerating ? 'Generating...' : 'Generate All Images'}
                </button>
              )}
            </div>
          </div>

          {/* Image Cards Grid - 3 columns */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* ═══ HEADER IMAGE (16:9) ═══ */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900/50 shadow-sm">
              <div className="bg-gradient-to-r from-purple-500 to-blue-500 px-4 py-2">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-white/80" />
                  Header Image
                  <span className="text-xs text-white/70">(16:9)</span>
                </h3>
              </div>
              {formData.featuredImage ? (
                <>
                  <div className="aspect-video bg-gray-100 dark:bg-gray-800 relative">
                    <ImageWithFallback
                      src={formData.featuredImage}
                      alt={formData.featuredImageAlt || 'Header image'}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 right-2 flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleInsertImageIntoContent(formData.featuredImage, formData.featuredImageAlt || 'Header image', 'top')}
                        className="px-2 py-1 bg-blue-600/90 hover:bg-blue-700 text-white text-xs rounded shadow-sm backdrop-blur-sm"
                        title="Insert at top of content"
                      >
                        Insert
                      </button>
                    </div>
                  </div>
                  <div className="p-3 space-y-2">
                    <input
                      type="url"
                      value={formData.featuredImage}
                      onChange={(e) => handleInputChange('featuredImage', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white font-mono"
                      placeholder="Image URL"
                    />
                    <input
                      type="text"
                      value={formData.featuredImageAlt}
                      onChange={(e) => handleInputChange('featuredImageAlt', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded focus:ring-2 focus:ring-purple-500 dark:bg-gray-800 dark:text-white"
                      placeholder="Alt text for accessibility"
                    />
                  </div>
                </>
              ) : (
                <div className="aspect-video bg-gray-50 dark:bg-gray-800/50 flex flex-col items-center justify-center p-4">
                  <PhotoIcon className="w-12 h-12 text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-3">
                    Used as hero image in blog header
                  </p>
                  {phase1Complete && !aiGenerating && (
                    <button
                      onClick={handlePhase2ImageGeneration}
                      className="text-xs px-3 py-1.5 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded-lg transition-colors"
                    >
                      Generate
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ═══ THUMBNAIL IMAGE (1:1) ═══ */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900/50 shadow-sm">
              <div className="bg-gradient-to-r from-green-500 to-teal-500 px-4 py-2">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-white/80" />
                  Thumbnail
                  <span className="text-xs text-white/70">(1:1)</span>
                </h3>
              </div>
              {formData.thumbnailImage ? (
                <>
                  <div className="aspect-square bg-gray-100 dark:bg-gray-800 relative flex items-center justify-center">
                    <ImageWithFallback
                      src={formData.thumbnailImage}
                      alt={formData.thumbnailImageAlt || 'Thumbnail'}
                      className="w-full h-full object-cover"
                    />
                    <span className="absolute bottom-2 left-2 text-xs bg-black/50 text-white px-2 py-0.5 rounded backdrop-blur-sm">
                      Card preview
                    </span>
                  </div>
                  <div className="p-3 space-y-2">
                    <input
                      type="url"
                      value={formData.thumbnailImage}
                      onChange={(e) => handleInputChange('thumbnailImage', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white font-mono"
                      placeholder="Thumbnail URL"
                    />
                    <input
                      type="text"
                      value={formData.thumbnailImageAlt}
                      onChange={(e) => handleInputChange('thumbnailImageAlt', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-200 dark:border-gray-600 rounded focus:ring-2 focus:ring-green-500 dark:bg-gray-800 dark:text-white"
                      placeholder="Alt text"
                    />
                  </div>
                </>
              ) : (
                <div className="aspect-square bg-gray-50 dark:bg-gray-800/50 flex flex-col items-center justify-center p-4">
                  <PhotoIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-3">
                    Square image for blog cards
                  </p>
                  {phase1Complete && !aiGenerating && (
                    <button
                      onClick={handlePhase2ImageGeneration}
                      className="text-xs px-3 py-1.5 bg-green-100 hover:bg-green-200 dark:bg-green-900/30 dark:hover:bg-green-900/50 text-green-700 dark:text-green-300 rounded-lg transition-colors"
                    >
                      Generate
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* ═══ CONTENT IMAGES ═══ */}
            <div className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden bg-white dark:bg-gray-900/50 shadow-sm">
              <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-4 py-2 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-white/80" />
                  Content Images
                  <span className="text-xs text-white/70">({contentImages.length})</span>
                </h3>
                {contentImages.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      contentImages.forEach((img, idx) => {
                        setTimeout(() => {
                          handleInsertImageIntoContent(img.url, img.alt || `Content image ${idx + 1}`);
                        }, idx * 100);
                      });
                    }}
                    className="text-xs px-2 py-1 bg-white/20 hover:bg-white/30 text-white rounded transition-colors"
                  >
                    Insert All
                  </button>
                )}
              </div>
              {contentImages.length > 0 ? (
                <div className="p-3">
                  <div className="grid grid-cols-2 gap-2 max-h-[250px] overflow-y-auto">
                    {contentImages.map((image, index) => (
                      <div key={index} className="relative group">
                        <div className="aspect-video bg-gray-100 dark:bg-gray-800 rounded overflow-hidden">
                          <ImageWithFallback
                            src={image.url}
                            alt={image.alt || `Content ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleInsertImageIntoContent(image.url, image.alt || `Content image ${index + 1}`)}
                            className="px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                          >
                            Insert
                          </button>
                          <button
                            onClick={() => {
                              const updated = contentImages.filter((_, i) => i !== index);
                              setContentImages(updated);
                            }}
                            className="px-2 py-1 bg-red-600 text-white text-xs rounded hover:bg-red-700"
                          >
                            ×
                          </button>
                        </div>
                        <span className="absolute bottom-1 left-1 text-[10px] bg-black/60 text-white px-1 rounded">
                          {index + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-[200px] bg-gray-50 dark:bg-gray-800/50 flex flex-col items-center justify-center p-4">
                  <PhotoIcon className="w-10 h-10 text-gray-300 dark:text-gray-600 mb-2" />
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center mb-3">
                    Images for blog sections
                  </p>
                  {phase1Complete && !aiGenerating && (
                    <button
                      onClick={handlePhase2ImageGeneration}
                      className="text-xs px-3 py-1.5 bg-orange-100 hover:bg-orange-200 dark:bg-orange-900/30 dark:hover:bg-orange-900/50 text-orange-700 dark:text-orange-300 rounded-lg transition-colors"
                    >
                      Generate
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Helpful tip */}
          {!phase2Complete && phase1Complete && (
            <div className="mt-4 flex items-center gap-2 text-xs text-purple-700 dark:text-purple-300 bg-purple-100 dark:bg-purple-900/20 px-3 py-2 rounded-lg">
              <InformationCircleIcon className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>Tip:</strong> Click &quot;Generate All Images&quot; to create header, thumbnail, and content images. They&apos;ll be automatically inserted into your post!
              </span>
            </div>
          )}
        </div>

        {/* Internal Links Section */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <ArrowsRightLeftIcon className="w-5 h-5 text-blue-600" />
                Internal Links
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Automatically insert internal links to your Webflow CMS content and static pages.
              </p>
            </div>
            <button
              onClick={handleInsertInternalLinks}
              disabled={linkAnalysis.analyzing || !formData.content}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors text-sm font-medium"
            >
              {linkAnalysis.analyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <ArrowsRightLeftIcon className="w-4 h-4" />
                  Insert Internal Links
                </>
              )}
            </button>
          </div>

          {/* Link Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
              <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{linkAnalysis.currentLinks}</div>
              <div className="text-xs text-blue-700 dark:text-blue-300">Current Links</div>
            </div>
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3">
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{linkAnalysis.insertedLinks.length}</div>
              <div className="text-xs text-green-700 dark:text-green-300">Links Inserted</div>
            </div>
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
              <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                {linkAnalysis.insertedLinks.filter(l => l.type === 'CMS').length}
              </div>
              <div className="text-xs text-purple-700 dark:text-purple-300">CMS Links</div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
              <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                {linkAnalysis.insertedLinks.filter(l => l.type === 'Static').length}
              </div>
              <div className="text-xs text-amber-700 dark:text-amber-300">Static Links</div>
            </div>
          </div>

          {/* Inserted Links Preview */}
          {linkAnalysis.insertedLinks.length > 0 && (
            <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
              <div className="bg-gray-50 dark:bg-gray-900/50 px-4 py-2 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">Recently Inserted Links</h3>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-48 overflow-y-auto">
                {linkAnalysis.insertedLinks.map((link, idx) => (
                  <div key={idx} className="px-4 py-2 flex items-center justify-between gap-4 hover:bg-gray-50 dark:hover:bg-gray-900/30">
                    <div className="flex-1 min-w-0">
                      <span className="text-sm font-medium text-gray-900 dark:text-white truncate block">
                        &quot;{link.anchor}&quot;
                      </span>
                      <a 
                        href={link.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 hover:underline truncate block"
                      >
                        {link.url.length > 60 ? link.url.substring(0, 60) + '...' : link.url}
                      </a>
                    </div>
                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
                      link.type === 'CMS' 
                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300'
                    }`}>
                      {link.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Help text */}
          {linkAnalysis.currentLinks === 0 && !linkAnalysis.analyzing && (
            <div className="mt-4 flex items-center gap-2 text-xs text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/20 px-3 py-2 rounded-lg">
              <InformationCircleIcon className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>Tip:</strong> Internal links help with SEO and keep readers engaged. Click &quot;Insert Internal Links&quot; to automatically find and add relevant links from your Webflow site.
              </span>
            </div>
          )}

          {linkAnalysis.lastAnalyzed && (
            <div className="mt-3 text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
              <CheckCircleIcon className="w-3 h-3 text-green-500" />
              Last analyzed: {new Date(linkAnalysis.lastAnalyzed).toLocaleString()}
            </div>
          )}
        </div>

        {/* Publish Button */}
        {orgId && userId && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Publish</h2>
            <PublishButton
              orgId={orgId}
              userId={userId}
              userRole={userRole}
              blogId={draftId}
              currentTarget={publishingTarget}
              onPublished={() => {
                refetch(); // reload draft to get updated publish status
              }}
            />
          </div>
        )}

        {/* Publishing Target Selection */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Publishing Target</h2>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Choose the CMS, site, and collection where this blog will be published.
              </p>
            </div>
          </div>
          {orgId && userId ? (
            <PublishingTargetSelector
              orgId={orgId}
              userId={userId}
              userRole={userRole}
              value={publishingTarget}
              onChange={(target) => {
                // Store target selection in state - will be used when publishing
                setPublishingTarget(target);
              }}
            />
          ) : (
            <div className="text-sm text-gray-500">Loading user/org...</div>
          )}
        </div>

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
              {/* Featured Image Preview */}
              {formData.featuredImage && (
                <div className="mt-3">
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-2">Featured Image Preview:</p>
                  <div className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                    <img
                      src={formData.featuredImage}
                      alt={formData.featuredImageAlt || 'Featured image'}
                      className="w-full h-auto max-h-64 object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
            {/* Content Images Section */}
            {contentImages.length > 0 && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Content Images (Phase 2)
                  <span className="ml-2 inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 rounded">
                    <PhotoIcon className="w-3 h-3" />
                    {contentImages.length} image{contentImages.length !== 1 ? 's' : ''}
                  </span>
                </label>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-2">
                  {contentImages.map((image, index) => (
                    <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                      <img
                        src={image.url}
                        alt={image.alt || `Content image ${index + 1}`}
                        className="w-full h-48 object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                      <div className="p-2 bg-gray-50 dark:bg-gray-800">
                        <p className="text-xs text-gray-600 dark:text-gray-400 truncate" title={image.alt}>
                          {image.alt || `Image ${index + 1}`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <span className="flex items-center gap-2">
                  Thumbnail Image URL
                  <button
                    onClick={handleGenerateThumbnail}
                    disabled={aiGenerating || !formData.title}
                    className="ml-auto px-3 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                  >
                    <SparklesIcon className="w-3 h-3" />
                    {aiGenerating ? 'Generating...' : 'Generate Thumbnail'}
                  </button>
                </span>
              </label>
              <input
                type="url"
                value={formData.thumbnailImage}
                onChange={(e) => handleInputChange('thumbnailImage', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                placeholder="https://example.com/thumbnail.jpg"
              />
              {formData.thumbnailImage && (
                <div className="mt-2">
                  <img
                    src={formData.thumbnailImage}
                    alt={formData.thumbnailImageAlt || 'Thumbnail'}
                    className="w-32 h-32 object-cover rounded border border-gray-200 dark:border-gray-700"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = 'none';
                    }}
                  />
                </div>
              )}
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
                  Author
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
              {authorsLoading ? (
                <div className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-500">
                  Loading authors...
                </div>
              ) : (
                <select
                  value={selectedAuthorId || 'custom'}
                  onChange={(e) => handleAuthorSelect(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select an author...</option>
                  {authors.map((author) => (
                    <option key={author.id} value={author.id}>
                      {author.name} {author.role ? `(${author.role})` : ''}
                    </option>
                  ))}
                  <option value="custom">+ Enter custom author</option>
                </select>
              )}
              {/* Show custom input if "custom" is selected */}
              {selectedAuthorId === 'custom' && (
                <input
                  type="text"
                  value={formData.authorName}
                  onChange={(e) => handleInputChange('authorName', e.target.value)}
                  className="w-full px-3 py-2 mt-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-white"
                  placeholder="Enter author name"
                />
              )}
              {/* Show selected author preview */}
              {selectedAuthorId && selectedAuthorId !== 'custom' && formData.authorName && (
                <div className="mt-2 flex items-center gap-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  {formData.authorImage && (
                    <img
                      src={formData.authorImage}
                      alt={formData.authorName}
                      className="w-10 h-10 rounded-full object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {formData.authorName}
                    </p>
                    {formData.authorBio && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {formData.authorBio}
                      </p>
                    )}
                  </div>
                </div>
              )}
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
