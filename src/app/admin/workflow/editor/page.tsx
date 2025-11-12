"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
import Alert from '@/components/ui/alert/Alert';

export default function EditorPage() {
  const router = useRouter();
  const { createDraft, loading: creatingPost } = useBlogPostMutations();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [workflowSession, setWorkflowSession] = useState<any>(null);
  const [strategy, setStrategy] = useState<any>(null);
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
    preset_id: '' // Content preset ID from database
  });

  const [qualityLevels, setQualityLevels] = useState<Array<{ value: string; label: string; description?: string }>>([]);
  const [presets, setPresets] = useState<Array<{ value: string; label: string; description?: string }>>([]);
  const [loadingOptions, setLoadingOptions] = useState(false);
  const [brandVoice, setBrandVoice] = useState<any>(null);
  const [selectedPreset, setSelectedPreset] = useState<any>(null);
  const [savedPostId, setSavedPostId] = useState<string | null>(null);

  const tones = [
    { value: 'professional', label: 'Professional' },
    { value: 'casual', label: 'Casual' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'authoritative', label: 'Authoritative' },
    { value: 'conversational', label: 'Conversational' }
  ];

  // Load workflow session and strategy
  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
        }

        const sessionId = localStorage.getItem('workflow_session_id');
        if (sessionId) {
          const { data: session, error: sessionError } = await supabase
            .from('workflow_sessions')
            .select('*')
            .eq('session_id', sessionId)
            .maybeSingle();

          if (sessionError && sessionError.code !== 'PGRST116') {
            console.error('Error loading session:', sessionError);
          }

          if (session) {
            setWorkflowSession(session);
            const workflowData = session.workflow_data || {};
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
        console.error('Error loading data:', error);
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
          setQualityLevels(qualityLevelsData.map((level: any) => ({
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
          setPresets(presetsData.map((preset: any) => ({
            value: preset.id || preset.value || preset.name || String(preset),
            label: preset.label || preset.name || preset.description || String(preset),
            description: preset.description
          })));
        }
      } catch (error) {
        console.error('Error loading quality options:', error);
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
  const handleGenerateContent = async () => {
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
        backlink_count: formData.include_backlinks ? formData.backlink_count : undefined
      });

      if (result && typeof result === 'object') {
        const content = result.content || result.html || JSON.stringify(result, null, 2);
        const title = result.title || formData.title || formData.topic;
        const excerpt = result.excerpt || result.description || '';
        const featuredImage = result.featured_image as { image_url?: string; alt_text?: string } | null | undefined;

        // If featured image exists, insert it into content after the first paragraph
        let finalContent = typeof content === 'string' ? content : JSON.stringify(content);
        if (featuredImage && typeof featuredImage === 'object' && 'image_url' in featuredImage && featuredImage.image_url) {
          const imageHtml = `<figure class="featured-image"><img src="${featuredImage.image_url}" alt="${featuredImage.alt_text || title}" class="w-full h-auto rounded-lg shadow-xl my-8 object-contain" /></figure>`;
          
          // Try to insert after first paragraph or at the beginning
          if (finalContent.includes('</p>')) {
            // Replace only the first occurrence
            finalContent = finalContent.replace('</p>', `</p>${imageHtml}`);
          } else if (finalContent.includes('<p>')) {
            // Replace only the first occurrence
            finalContent = finalContent.replace('<p>', `${imageHtml}<p>`);
          } else {
            // If no paragraphs, prepend the image
            finalContent = imageHtml + finalContent;
          }
        }

        setFormData(prev => ({
          ...prev,
          content: finalContent,
          title: typeof title === 'string' ? title : (title ? String(title) : prev.title),
          excerpt: typeof excerpt === 'string' ? excerpt : (excerpt ? String(excerpt) : prev.excerpt)
        }));

        setSuccess('Content generated successfully');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError('Failed to generate content. Please try again.');
      }
    } catch (err: any) {
      console.error('Error generating content:', err);
      setError(err.message || 'Failed to generate content');
    } finally {
      setGenerating(false);
    }
  };

  // Save as draft
  const handleSaveDraft = async () => {
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
        }
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
          const postId = (draftResult as any).post_id || (draftResult as any).id;
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
            console.error('❌ Error updating workflow session:', workflowError);
            // Don't throw - draft was saved successfully, workflow update is secondary
          } else {
            console.log('✅ Draft saved successfully:', {
              postId,
              title: formData.title,
              sessionId,
              savedToBlogPosts: true,
              savedToWorkflowData: true
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
    } catch (err: any) {
      console.error('Error saving draft:', err);
      setError(err.message || 'Failed to save draft');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-green-100 dark:bg-green-900/20 rounded-lg flex items-center justify-center">
            <FileText className="w-6 h-6 text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              AI Content Editor
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Generate and edit high-quality blog content with AI assistance
            </p>
          </div>
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
                    const selectedTopic = savedTopics.find((t: any) => t.title === e.target.value);
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
                  {(workflowSession?.workflow_data?.selected_topics || []).map((topic: any, index: number) => (
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
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  Higher quality uses more advanced AI models for better content
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

        {/* Right Column - Content Preview */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <Eye className="w-5 h-5" />
              Content Preview
            </h2>
            
            {formData.content ? (
              <div className="prose dark:prose-invert max-w-none">
                <div 
                  className="text-gray-900 dark:text-white leading-relaxed"
                  dangerouslySetInnerHTML={{ 
                    __html: formData.content.includes('<') 
                      ? formData.content
                      : formData.content.replace(/\n/g, '<br>')
                  }}
                />
              </div>
            ) : (
              <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Generated content will appear here</p>
              </div>
            )}
          </div>

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
    </div>
  );
}

