"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { useBlogPost } from "@/hooks/useBlogPosts";
import { useBlogPostMutations } from "@/hooks/useBlogPosts";
import { 
  ArrowLeftIcon,
  CheckIcon,
  ArrowsRightLeftIcon,
  SparklesIcon
} from "@heroicons/react/24/outline";
import TipTapEditor from "@/components/blog-writer/TipTapEditor";
import { extractBlogFields, generateSlug, calculateReadTime } from "@/lib/blog-field-validator";
import { dataForSEOContentGenerationClient } from "@/lib/dataforseo-content-generation-client";
import { logger } from "@/utils/logger";

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

  useEffect(() => {
    if (draft) {
      const metadata = (draft.metadata as Record<string, unknown>) || {};
      const seoData = (draft.seo_data as Record<string, unknown>) || {};
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
  }, [formData.content]);

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

    try {
      const plainText = stripHtml(formData.content).trim();
      const excerptFallback = formData.excerpt && formData.excerpt.trim().length > 0
        ? formData.excerpt
        : plainText.substring(0, 220).concat(plainText.length > 220 ? '…' : '');

      const meta = await dataForSEOContentGenerationClient.generateMetaTags(plainText || formData.title || '');

      setFormData(prev => ({
        ...prev,
        slug: prev.slug || generateSlug(prev.title || 'untitled'),
        seoTitle: meta.meta_title || prev.seoTitle || prev.title,
        metaDescription: meta.meta_description || prev.metaDescription || excerptFallback,
        excerpt: prev.excerpt || excerptFallback,
      }));
    } catch (error) {
      logger.logError(error instanceof Error ? error : new Error('Failed to auto-generate fields'), {
        context: 'edit-draft-generate-fields',
      });
      alert('Unable to generate fields automatically. Please try again.');
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
        router.push('/admin/drafts');
      } else {
        alert('Failed to save draft. Please try again.');
      }
    } catch (err) {
      console.error('Error saving draft:', err);
      alert('Error saving draft. Please try again.');
    } finally {
      setSaving(false);
    }
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
            Excerpt
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
            Content
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
                SEO Title
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
                Meta Description
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
                Featured Image URL
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
                Author Name
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
              onChange={(e) => handleInputChange('status', e.target.value)}
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
  );
}
