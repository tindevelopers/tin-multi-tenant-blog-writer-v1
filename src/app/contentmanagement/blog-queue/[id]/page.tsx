"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeftIcon,
  ClockIcon,
  XCircleIcon,
  ArrowPathIcon,
  XMarkIcon,
  DocumentCheckIcon,
  PencilIcon,
  ChevronDownIcon,
  ChevronUpIcon,
  CheckCircleIcon,
  PhotoIcon,
  SparklesIcon,
} from "@heroicons/react/24/outline";
import { BlogGenerationQueueItem, type ProgressUpdate } from "@/types/blog-queue";
import { getQueueStatusMetadata, QueueStatus } from "@/lib/blog-queue-state-machine";
import { useQueueStatusSSE } from "@/hooks/useQueueStatusSSE";
import { logger } from "@/utils/logger";
import { normalizeBlogContent } from "@/lib/content-sanitizer";
import HeadingStructure from "@/components/blog-writer/HeadingStructure";
import WorkflowPhaseManager from "@/components/workflow/WorkflowPhaseManager";
import { getWorkflowPhase } from "@/lib/workflow-phase-manager";
import type { WorkflowPhase } from "@/lib/workflow-phase-manager";

export default function QueueItemDetailPage() {
  const router = useRouter();
  const params = useParams();
  const queueId = params.id as string;
  
  const [item, setItem] = useState<BlogGenerationQueueItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    status: true,
    metadata: false,
    content: false,
  });
  const [normalizedContent, setNormalizedContent] = useState<ReturnType<typeof normalizeBlogContent> | null>(null);
  const [phase2Loading, setPhase2Loading] = useState(false);
  const [phase3Loading, setPhase3Loading] = useState(false);
  const [workflowPhase, setWorkflowPhase] = useState<WorkflowPhase | null>(null);

  // Use SSE for real-time updates
  const { status, progress, stage } = useQueueStatusSSE(queueId);

  const fetchQueueItem = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/blog-queue/${queueId}`);
      if (!response.ok) {
        throw new Error("Failed to fetch queue item");
      }
      const data = await response.json();
      // API returns { queue_item: ... } but we need the item directly
      setItem(data.queue_item || data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load queue item");
      console.error("Error fetching queue item:", err);
    } finally {
      setLoading(false);
    }
  }, [queueId]);

  useEffect(() => {
    fetchQueueItem();
  }, [fetchQueueItem]);

  useEffect(() => {
    if (status && item) {
      // If status changed to "generated", refetch the full item to get generated_content
      if (status === "generated" && item.status !== "generated") {
        fetchQueueItem();
      } else {
        // Otherwise, just update the status/progress/stage
        setItem((prevItem) => prevItem ? { ...prevItem, status: status as QueueStatus, progress_percentage: progress, current_stage: stage } : null);
      }
    }
  }, [status, progress, stage, item, fetchQueueItem]);

  // Normalize content when item changes
  useEffect(() => {
    if (item && item.status === "generated" && item.generated_content) {
      try {
        const normalized = normalizeBlogContent({
          title: item.generated_title || item.topic,
          content: item.generated_content,
          excerpt: item.generation_metadata?.excerpt,
          word_count: item.generation_metadata?.word_count,
          ...item.generation_metadata,
        });
        setNormalizedContent(normalized);
      } catch (error) {
        logger.error("Error normalizing content", { error });
      }
    }
  }, [item]);

  // Fetch workflow phase
  useEffect(() => {
    const fetchWorkflowPhase = async () => {
      if (queueId) {
        try {
          const phase = await getWorkflowPhase(queueId);
          setWorkflowPhase(phase);
        } catch (error) {
          logger.error("Error fetching workflow phase", { error });
        }
      }
    };
    fetchWorkflowPhase();
  }, [queueId, item]);


  const handleCancel = async () => {
    if (!confirm("Are you sure you want to cancel this queue item?")) return;
    
    try {
      const response = await fetch(`/api/blog-queue/${queueId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to cancel");
      router.push("/contentmanagement/blog-queue");
    } catch (err) {
      console.error("Error cancelling:", err);
      alert("Failed to cancel queue item");
    }
  };

  const handleRetry = async () => {
    try {
      const response = await fetch(`/api/blog-queue/${queueId}/retry`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to retry");
      await fetchQueueItem();
    } catch (err) {
      console.error("Error retrying:", err);
      alert("Failed to retry queue item");
    }
  };

  const handleRequestApproval = async () => {
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
      await fetchQueueItem();
      alert("Approval requested successfully");
    } catch (err) {
      console.error("Error requesting approval:", err);
      alert(err instanceof Error ? err.message : "Failed to request approval");
    }
  };

  const handleRegenerate = async () => {
    if (!item) return;
    
    if (!confirm(`Are you sure you want to regenerate "${item.generated_title || item.topic}"?`)) {
      return;
    }
    
    try {
      // Create a new queue entry with the same parameters
      const response = await fetch('/api/blog-writer/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          topic: item.topic,
          keywords: item.keywords || [],
          target_audience: item.target_audience,
          tone: item.tone,
          word_count: item.word_count,
          quality_level: item.quality_level,
          template_type: item.template_type,
          custom_instructions: item.custom_instructions,
        }),
      });
      
      if (!response.ok) throw new Error("Failed to regenerate");
      
      const result = await response.json();
      if (result.queue_id) {
        router.push(`/contentmanagement/blog-queue/${result.queue_id}`);
      } else {
        alert("Blog regeneration started!");
      }
    } catch (err) {
      console.error("Error regenerating blog:", err);
      alert("Failed to regenerate blog. Please try again.");
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const postId = item?.post_id || (item?.metadata as Record<string, unknown>)?.post_id as string | undefined;
  const hasGeneratedContent = item?.status === "generated" && (item?.generated_content || postId);

  const handleCreateDraft = async () => {
    if (!item) return;
    
    try {
      // If draft already exists, redirect to edit
      if (postId) {
        router.push(`/contentmanagement/drafts/edit/${postId}`);
        return;
      }
      
      // Use normalized content if available, otherwise fallback to raw
      const contentToSave = normalizedContent?.sanitizedContent || item.generated_content;
      
      // Create draft using save-content endpoint (which will auto-extract fields)
      const response = await fetch(`/api/blog-queue/${queueId}/save-content`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: contentToSave,
          title: normalizedContent?.title || item.generated_title || item.topic,
          excerpt: normalizedContent?.excerpt || item.generation_metadata?.excerpt || '',
          queue_item_id: queueId,
        }),
      });
      
      if (response.ok) {
        const result = await response.json();
        if (result.post_id) {
          router.push(`/contentmanagement/drafts/edit/${result.post_id}`);
        }
      } else {
        const errorData = await response.json().catch(() => ({ error: 'Failed to create draft' }));
        alert(errorData.error || "Failed to create draft. Please try again.");
      }
    } catch (err) {
      logger.error("Error creating draft:", err);
      alert("Failed to create draft. Please try again.");
    }
  };

  const handlePhase2ImageGeneration = async () => {
    if (!item) return;
    
    setPhase2Loading(true);
    try {
      const response = await fetch('/api/workflow/generate-images', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queue_id: queueId, // Pass queue_id for draft updates
          topic: item.topic,
          content: normalizedContent?.sanitizedContent || item.generated_content,
          title: normalizedContent?.title || item.generated_title || item.topic,
          excerpt: normalizedContent?.excerpt || item.generation_metadata?.excerpt,
          generate_featured: true,
          generate_content_images: item.metadata?.generate_content_images || false,
          style: item.metadata?.image_style || 'photographic',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to generate images');
      }

      const result = await response.json();
      
      // If draft was updated, redirect to edit screen
      if (result.post_id) {
        alert('✅ Phase 2 (Image Generation) completed! Draft updated with images. Redirecting to edit screen...');
        router.push(`/contentmanagement/drafts/edit/${result.post_id}`);
        return;
      }
      
      alert('✅ Phase 2 (Image Generation) started! Images will be generated and added to your content.');
      
      // Refresh the queue item to see updated status
      await fetchQueueItem();
    } catch (error) {
      logger.error('Phase 2 error', { error });
      alert(`Failed to start Phase 2: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setPhase2Loading(false);
    }
  };

  const handlePhase3ContentEnhancement = async () => {
    if (!item) return;
    
    setPhase3Loading(true);
    try {
      const response = await fetch('/api/workflow/enhance-content', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          queue_id: queueId, // Pass queue_id for draft updates
          content: normalizedContent?.sanitizedContent || item.generated_content,
          title: normalizedContent?.title || item.generated_title || item.topic,
          topic: item.topic,
          keywords: item.keywords || [],
          generate_structured_data: item.metadata?.generate_structured_data !== false,
          improve_formatting: true,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to enhance content');
      }

      const result = await response.json();
      
      // If draft was updated, redirect to edit screen
      if (result.post_id) {
        alert('✅ Phase 3 (Content Enhancement) completed! Draft updated with enhanced metadata. Redirecting to edit screen...');
        router.push(`/contentmanagement/drafts/edit/${result.post_id}`);
        return;
      }
      
      alert('✅ Phase 3 (Content Enhancement) completed! Content has been enhanced with SEO optimization and structured data.');
      
      // Refresh the queue item to see updated content
      await fetchQueueItem();
    } catch (error) {
      logger.error('Phase 3 error', { error });
      alert(`Failed to start Phase 3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setPhase3Loading(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-500"></div>
        </div>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="p-6">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <p className="text-red-800 dark:text-red-200">
            {error || "Queue item not found"}
          </p>
        </div>
      </div>
    );
  }

  const statusMeta = getQueueStatusMetadata(item?.status);

  return (
    <div className="p-6 space-y-6">
      {/* Header Section */}
      <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
        {/* Title and back button */}
        <div className="flex items-start gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors shrink-0"
          >
            <ArrowLeftIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
              {item.generated_title || item.topic}
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Queue ID: {item.queue_id}
            </p>
          </div>
        </div>
        
        {/* Action Buttons - completely rebuilt */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Primary Action: Edit in Drafts */}
          {hasGeneratedContent && postId && (
            <a
              href={`/contentmanagement/drafts/edit/${postId}`}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium no-underline"
            >
              <PencilIcon className="w-5 h-5" />
              Edit in Drafts
            </a>
          )}
          
          {/* Primary Action: Create & Edit Draft */}
          {hasGeneratedContent && !postId && (
            <button
              type="button"
              onClick={handleCreateDraft}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
            >
              <PencilIcon className="w-5 h-5" />
              Create & Edit Draft
            </button>
          )}

          {/* Phase 2: Image Generation */}
          {hasGeneratedContent && (
            <button
              type="button"
              onClick={handlePhase2ImageGeneration}
              disabled={phase2Loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <PhotoIcon className="w-5 h-5" />
              {phase2Loading ? 'Generating Images...' : 'Phase 2: Generate Images'}
            </button>
          )}

          {/* Phase 3: Content Enhancement */}
          {hasGeneratedContent && (
            <button
              type="button"
              onClick={handlePhase3ContentEnhancement}
              disabled={phase3Loading}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <SparklesIcon className="w-5 h-5" />
              {phase3Loading ? 'Enhancing Content...' : 'Phase 3: Enhance & Add Schema'}
            </button>
          )}
          
          {/* Regenerate */}
          {item.status === "generated" && (
            <button
              type="button"
              onClick={handleRegenerate}
              className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 transition-colors font-medium"
            >
              <ArrowPathIcon className="w-5 h-5" />
              Regenerate
            </button>
          )}
          
          {/* Request Approval */}
          {item.status === "generated" && (
            <button
              type="button"
              onClick={handleRequestApproval}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
            >
              <DocumentCheckIcon className="w-5 h-5" />
              Request Approval
            </button>
          )}
          
          {/* Retry */}
          {item.status === "failed" && (
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors font-medium"
            >
              <ArrowPathIcon className="w-5 h-5" />
              Retry
            </button>
          )}
          
          {/* Cancel */}
          {!["published", "cancelled"].includes(item.status) && (
            <button
              type="button"
              onClick={handleCancel}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors font-medium"
            >
              <XMarkIcon className="w-5 h-5" />
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Status Card */}
      <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection('status')}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <div className="flex items-center gap-4">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Status
            </h2>
            <StatusBadge status={item.status} />
          </div>
          {expandedSections.status ? (
            <ChevronUpIcon className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 text-gray-500" />
          )}
        </button>
        
        {expandedSections.status && (
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          {item.status === "generating" && (
            <ProgressIndicator
              percentage={item.progress_percentage || 0}
              stage={item.current_stage || "Starting..."}
            />
          )}

          {/* Stages Timeline */}
          {item.progress_updates && Array.isArray(item.progress_updates) && item.progress_updates.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4">
                Generation Stages
              </h3>
              <StagesTimeline
                progressUpdates={item.progress_updates}
                currentStage={item.current_stage || ""}
                currentProgress={item.progress_percentage || 0}
              />
            </div>
          )}

          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoItem label="Status" value={statusMeta?.label || "N/A"} />
            <InfoItem
              label="Priority"
              value={item.priority?.toString() || "5"}
            />
            <InfoItem
              label="Queued At"
              value={formatDate(item.queued_at)}
            />
            {item.generation_started_at && (
              <InfoItem
                label="Started At"
                value={formatDate(item.generation_started_at)}
              />
            )}
            {item.generation_completed_at && (
              <InfoItem
                label="Completed At"
                value={formatDate(item.generation_completed_at)}
              />
            )}
          </div>
        </div>
        )}
      </div>

      {/* Workflow Phase Manager */}
      {item.metadata?.workflow_type === 'multi_phase' && (
        <WorkflowPhaseManager
          queueId={queueId}
          currentPhase={workflowPhase}
          postId={postId || null}
          onPhaseComplete={(phase, postId) => {
            logger.info('Phase completed', { phase, postId });
            router.push(`/contentmanagement/drafts/edit/${postId}`);
          }}
          onResumePhase={(phase) => {
            if (phase === 'phase_2_images') {
              handlePhase2ImageGeneration();
            } else if (phase === 'phase_3_enhancement') {
              handlePhase3ContentEnhancement();
            }
          }}
          className="mb-6"
        />
      )}

      {/* Generation Details */}
      <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection('metadata')}
          className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
        >
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Generation Details
          </h2>
          {expandedSections.metadata ? (
            <ChevronUpIcon className="w-5 h-5 text-gray-500" />
          ) : (
            <ChevronDownIcon className="w-5 h-5 text-gray-500" />
          )}
        </button>
        
        {expandedSections.metadata && (
        <div className="p-6 border-t border-gray-200 dark:border-gray-700">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoItem label="Topic" value={item.topic} />
          <InfoItem
            label="Target Audience"
            value={item.target_audience || "N/A"}
          />
          <InfoItem label="Tone" value={item.tone || "N/A"} />
          <InfoItem
            label="Word Count"
            value={item.word_count?.toString() || "N/A"}
          />
          <InfoItem
            label="Quality Level"
            value={item.quality_level || "N/A"}
          />
          <InfoItem
            label="Template Type"
            value={item.template_type || "N/A"}
          />
        </div>
            {item.keywords && item.keywords.length > 0 && (
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Keywords
                </label>
                <div className="flex flex-wrap gap-2">
                  {item.keywords.map((keyword, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-sm"
                    >
                      {keyword}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Success Message - shown when draft is created */}
      {hasGeneratedContent && postId && (
        <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
          <p className="text-sm text-green-800 dark:text-green-200">
            ✅ Draft created successfully. All fields have been auto-populated from the generated content.
          </p>
        </div>
      )}

      {/* Error Message */}
      {item.generation_error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-6">
          <div className="flex items-start gap-3">
            <XCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
            <div>
              <h3 className="font-semibold text-red-800 dark:text-red-200 mb-1">
                Generation Error
              </h3>
              <p className="text-red-700 dark:text-red-300 text-sm">
                {item.generation_error}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Content Preview Section */}
      {hasGeneratedContent && normalizedContent && (
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg overflow-hidden">
          <button
            onClick={() => toggleSection('content')}
            className="w-full flex items-center justify-between p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
          >
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              Generated Content Preview
            </h2>
            {expandedSections.content ? (
              <ChevronUpIcon className="w-5 h-5 text-gray-500" />
            ) : (
              <ChevronDownIcon className="w-5 h-5 text-gray-500" />
            )}
          </button>

          {expandedSections.content && (
            <div className="p-6 border-t border-gray-200 dark:border-gray-700 space-y-6">
              {/* Heading Structure */}
              {normalizedContent.headings.length > 0 && (
                <HeadingStructure headings={normalizedContent.headings} />
              )}

              {/* Content Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <InfoItem label="Word Count" value={normalizedContent.wordCount.toLocaleString()} />
                <InfoItem label="Headings" value={`${normalizedContent.headings.length} total`} />
                <InfoItem 
                  label="H1 Headings" 
                  value={normalizedContent.headings.filter(h => h.level === 1).length.toString()} 
                />
                <InfoItem 
                  label="H2 Headings" 
                  value={normalizedContent.headings.filter(h => h.level === 2).length.toString()} 
                />
              </div>

              {/* Sanitized Content Preview */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Content Preview (Sanitized)
                </label>
                <div 
                  className="prose prose-lg dark:prose-invert max-w-none bg-gray-50 dark:bg-gray-900 rounded-lg p-6 max-h-96 overflow-y-auto border border-gray-200 dark:border-gray-700"
                  dangerouslySetInnerHTML={{ __html: normalizedContent.sanitizedContent }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Progress Updates */}
      {item.progress_updates && Array.isArray(item.progress_updates) && item.progress_updates.length > 0 && (
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Progress History
          </h2>
          <div className="space-y-3">
            {item.progress_updates.map((update: ProgressUpdate, idx: number) => (
              <div
                key={idx}
                className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
              >
                <ClockIcon className="w-4 h-4 text-gray-400 mt-0.5" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {update.stage || "Update"}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {update.details || "No details"}
                  </p>
                  {update.timestamp && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      {formatDate(new Date(update.timestamp).toISOString())}
                    </p>
                  )}
                </div>
                {update.progress_percentage !== undefined && (
                  <span className="text-sm font-medium text-gray-600 dark:text-gray-400">
                    {update.progress_percentage}%
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

function StatusBadge({ status }: { status: QueueStatus | string | null | undefined }) {
  const meta = getQueueStatusMetadata(status);
  
  if (!meta) {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
        <span>❓</span>
        Unknown
      </span>
    );
  }
  
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium"
      style={{
        backgroundColor: `${meta.color}20`,
        color: meta.color,
      }}
    >
      <span>{meta.icon}</span>
      {meta.label}
    </span>
  );
}

function ProgressIndicator({
  percentage,
  stage,
}: {
  percentage: number;
  stage: string;
}) {
  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {stage}
        </span>
        <span className="text-sm font-medium text-gray-900 dark:text-white">
          {percentage}%
        </span>
      </div>
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3">
        <div
          className="bg-brand-500 h-3 rounded-full transition-all duration-300"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
        {label}
      </label>
      <p className="text-sm text-gray-900 dark:text-white">{value}</p>
    </div>
  );
}

function formatDate(dateString: string | null) {
  if (!dateString) return "N/A";
  return new Date(dateString).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function StagesTimeline({
  progressUpdates,
  currentStage,
  currentProgress,
}: {
  progressUpdates: ProgressUpdate[];
  currentStage: string;
  currentProgress: number;
}) {
  // Get unique stages from progress updates, sorted by stage_number
  const stages = progressUpdates
    .filter((update) => update.stage_number !== undefined)
    .sort((a, b) => (a.stage_number || 0) - (b.stage_number || 0))
    .reduce((acc, update) => {
      const stageNum = update.stage_number || 0;
      if (!acc.find((s) => s.stage_number === stageNum)) {
        acc.push(update);
      }
      return acc;
    }, [] as ProgressUpdate[]);

  // If no stages with stage_number, use all unique stages
  const uniqueStages =
    stages.length > 0
      ? stages
      : progressUpdates
          .reduce((acc, update) => {
            if (!acc.find((s) => s.stage === update.stage)) {
              acc.push(update);
            }
            return acc;
          }, [] as ProgressUpdate[])
          .sort((a, b) => {
            // Sort by timestamp if available
            return (a.timestamp || 0) - (b.timestamp || 0);
          });

  if (uniqueStages.length === 0) {
    return (
      <div className="text-sm text-gray-500 dark:text-gray-400">
        No stage information available
      </div>
    );
  }

  // Determine which stage is current
  const currentStageIndex = uniqueStages.findIndex(
    (s) => s.stage === currentStage || s.stage.toLowerCase() === currentStage.toLowerCase()
  );

  return (
    <div className="relative">
      {/* Timeline line */}
      <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200 dark:bg-gray-700" />

      <div className="space-y-4">
        {uniqueStages.map((stage, index) => {
          const isCompleted = index < currentStageIndex || 
            (currentStageIndex === -1 && index < uniqueStages.length - 1) ||
            stage.progress_percentage === 100;
          const isCurrent = index === currentStageIndex || 
            (currentStageIndex === -1 && index === uniqueStages.length - 1);
          const isPending = !isCompleted && !isCurrent;

          // Get the latest update for this stage
          const latestUpdate = progressUpdates
            .filter((u) => u.stage === stage.stage)
            .sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0))[0];

          return (
            <div key={index} className="relative flex items-start gap-4">
              {/* Stage indicator */}
              <div className="relative z-10 flex items-center justify-center">
                {isCompleted ? (
                  <div className="w-8 h-8 rounded-full bg-green-500 flex items-center justify-center">
                    <CheckCircleIcon className="w-5 h-5 text-white" />
                  </div>
                ) : isCurrent ? (
                  <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center animate-pulse">
                    <ArrowPathIcon className="w-5 h-5 text-white animate-spin" />
                  </div>
                ) : (
                  <div className="w-8 h-8 rounded-full bg-gray-300 dark:bg-gray-600 flex items-center justify-center">
                    <div className="w-3 h-3 rounded-full bg-gray-500 dark:bg-gray-400" />
                  </div>
                )}
              </div>

              {/* Stage content */}
              <div className="flex-1 pt-1">
                <div className="flex items-center justify-between">
                  <div>
                    <h4
                      className={`text-sm font-medium ${
                        isCurrent
                          ? "text-blue-600 dark:text-blue-400"
                          : isCompleted
                          ? "text-green-600 dark:text-green-400"
                          : "text-gray-500 dark:text-gray-400"
                      }`}
                    >
                      {stage.stage || `Stage ${index + 1}`}
                    </h4>
                    {latestUpdate?.details && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                        {latestUpdate.details}
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    {latestUpdate?.progress_percentage !== undefined && (
                      <span
                        className={`text-xs font-medium ${
                          isCurrent
                            ? "text-blue-600 dark:text-blue-400"
                            : isCompleted
                            ? "text-green-600 dark:text-green-400"
                            : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {latestUpdate.progress_percentage}%
                      </span>
                    )}
                    {latestUpdate?.timestamp && (
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        {formatDate(
                          new Date(latestUpdate.timestamp * 1000).toISOString()
                        )}
                      </p>
                    )}
                  </div>
                </div>
                {isCurrent && latestUpdate?.progress_percentage !== undefined && (
                  <div className="mt-2 w-full bg-gray-200 dark:bg-gray-700 rounded-full h-1.5">
                    <div
                      className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                      style={{
                        width: `${latestUpdate.progress_percentage}%`,
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

