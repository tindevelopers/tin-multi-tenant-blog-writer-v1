"use client";

import { useState, useEffect } from "react";
import {
  DocumentTextIcon,
  PhotoIcon,
  SparklesIcon,
  CheckCircleIcon,
  ArrowPathIcon,
  ExclamationCircleIcon,
} from "@heroicons/react/24/outline";
import { logger } from "@/utils/logger";

export type WorkflowPhase = 'phase_1_content' | 'phase_2_images' | 'phase_3_enhancement' | 'completed';

interface WorkflowPhaseManagerProps {
  queueId: string;
  currentPhase?: WorkflowPhase | null;
  postId?: string | null;
  onPhaseComplete?: (phase: WorkflowPhase, postId: string) => void;
  onResumePhase?: (phase: WorkflowPhase) => void;
  className?: string;
}

interface PhaseInfo {
  id: WorkflowPhase;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

const PHASES: PhaseInfo[] = [
  {
    id: 'phase_1_content',
    label: 'Phase 1: Content Generation',
    description: 'Generate blog content',
    icon: DocumentTextIcon,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    id: 'phase_2_images',
    label: 'Phase 2: Image Generation',
    description: 'Generate featured and content images',
    icon: PhotoIcon,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    id: 'phase_3_enhancement',
    label: 'Phase 3: Content Enhancement',
    description: 'Enhance SEO metadata and structured data',
    icon: SparklesIcon,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
  },
];

export default function WorkflowPhaseManager({
  queueId,
  currentPhase,
  postId,
  onPhaseComplete,
  onResumePhase,
  className = "",
}: WorkflowPhaseManagerProps) {
  const [loadingPhase, setLoadingPhase] = useState<WorkflowPhase | null>(null);
  const [phaseStatuses, setPhaseStatuses] = useState<Record<WorkflowPhase, 'pending' | 'completed' | 'current'>>({
    phase_1_content: 'pending',
    phase_2_images: 'pending',
    phase_3_enhancement: 'pending',
    completed: 'pending',
  });

  // Update phase statuses based on current phase
  useEffect(() => {
    if (!currentPhase) return;

    const statuses: Record<WorkflowPhase, 'pending' | 'completed' | 'current'> = {
      phase_1_content: 'pending',
      phase_2_images: 'pending',
      phase_3_enhancement: 'pending',
      completed: 'pending',
    };

    if (currentPhase === 'completed') {
      statuses.phase_1_content = 'completed';
      statuses.phase_2_images = 'completed';
      statuses.phase_3_enhancement = 'completed';
      statuses.completed = 'completed';
    } else if (currentPhase === 'phase_3_enhancement') {
      statuses.phase_1_content = 'completed';
      statuses.phase_2_images = 'completed';
      statuses.phase_3_enhancement = 'current';
    } else if (currentPhase === 'phase_2_images') {
      statuses.phase_1_content = 'completed';
      statuses.phase_2_images = 'current';
    } else if (currentPhase === 'phase_1_content') {
      statuses.phase_1_content = 'current';
    }

    setPhaseStatuses(statuses);
  }, [currentPhase]);

  const handleResumePhase = async (phase: WorkflowPhase) => {
    if (loadingPhase) return;

    setLoadingPhase(phase);
    try {
      logger.info('Resuming workflow phase', { queueId, phase });

      if (onResumePhase) {
        onResumePhase(phase);
      } else {
        // Default behavior: call appropriate API endpoint
        if (phase === 'phase_2_images') {
          const response = await fetch('/api/workflow/generate-images', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              queue_id: queueId,
              generate_featured: true,
              generate_content_images: false,
              style: 'photographic',
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to start Phase 2');
          }

          const result = await response.json();
          if (result.post_id && onPhaseComplete) {
            onPhaseComplete(phase, result.post_id);
          }
        } else if (phase === 'phase_3_enhancement') {
          // Phase 3: Content Enhancement with Enhanced Interlinking
          // - Uses InterlinkingEngine for sophisticated link analysis
          // - org_id will be auto-detected from authenticated user
          const response = await fetch('/api/workflow/enhance-content', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              queue_id: queueId,
              generate_structured_data: true,
              improve_formatting: true,
              insert_hyperlinks: true, // Enable enhanced interlinking
              deep_interlinking: false, // Phase 2 lazy-loading (off by default for speed)
            }),
          });

          if (!response.ok) {
            throw new Error('Failed to start Phase 3');
          }

          const result = await response.json();
          if (result.post_id && onPhaseComplete) {
            onPhaseComplete(phase, result.post_id);
          }
        }
      }
    } catch (error) {
      logger.error('Failed to resume phase', { error, phase });
      alert(`Failed to resume ${phase}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setLoadingPhase(null);
    }
  };

  const getPhaseStatus = (phaseId: WorkflowPhase): 'pending' | 'completed' | 'current' => {
    return phaseStatuses[phaseId] || 'pending';
  };

  const canResumePhase = (phaseId: WorkflowPhase): boolean => {
    if (phaseId === 'phase_1_content') return false; // Phase 1 is always first
    if (phaseId === 'phase_2_images') return phaseStatuses.phase_1_content === 'completed';
    if (phaseId === 'phase_3_enhancement') return phaseStatuses.phase_2_images === 'completed';
    return false;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-6 ${className}`}>
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Workflow Progress
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
          Track and manage your multi-phase blog generation workflow
        </p>
      </div>

      <div className="space-y-4">
        {PHASES.map((phase, index) => {
          const status = getPhaseStatus(phase.id);
          const canResume = canResumePhase(phase.id);
          const isLoading = loadingPhase === phase.id;
          const Icon = phase.icon;

          return (
            <div
              key={phase.id}
              className={`relative flex items-start gap-4 p-4 rounded-lg border-2 transition-all ${
                status === 'current'
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : status === 'completed'
                  ? 'border-green-500 bg-green-50 dark:bg-green-900/20'
                  : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50'
              }`}
            >
              {/* Phase Number */}
              <div
                className={`flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center font-semibold ${
                  status === 'current'
                    ? 'bg-blue-500 text-white'
                    : status === 'completed'
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-300 dark:bg-gray-600 text-gray-600 dark:text-gray-300'
                }`}
              >
                {status === 'completed' ? (
                  <CheckCircleIcon className="w-6 h-6" />
                ) : (
                  <span>{index + 1}</span>
                )}
              </div>

              {/* Phase Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon
                      className={`w-5 h-5 ${
                        status === 'current'
                          ? phase.color
                          : status === 'completed'
                          ? 'text-green-600'
                          : 'text-gray-400'
                      }`}
                    />
                    <h4
                      className={`font-medium ${
                        status === 'current'
                          ? 'text-blue-900 dark:text-blue-100'
                          : status === 'completed'
                          ? 'text-green-900 dark:text-green-100'
                          : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      {phase.label}
                    </h4>
                  </div>

                  {/* Status Badge */}
                  <div className="flex items-center gap-2">
                    {status === 'current' && (
                      <span className="px-2 py-1 text-xs font-medium bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                        In Progress
                      </span>
                    )}
                    {status === 'completed' && (
                      <span className="px-2 py-1 text-xs font-medium bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                        Completed
                      </span>
                    )}
                    {status === 'pending' && canResume && (
                      <button
                        onClick={() => handleResumePhase(phase.id)}
                        disabled={isLoading}
                        className="px-3 py-1 text-xs font-medium bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded hover:bg-purple-200 dark:hover:bg-purple-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                      >
                        {isLoading ? (
                          <>
                            <ArrowPathIcon className="w-3 h-3 animate-spin" />
                            Starting...
                          </>
                        ) : (
                          <>
                            <ArrowPathIcon className="w-3 h-3" />
                            Resume
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>

                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                  {phase.description}
                </p>

                {/* Phase-specific actions */}
                {status === 'completed' && phase.id === 'phase_1_content' && postId && (
                  <div className="mt-2">
                    <a
                      href={`/contentmanagement/drafts/edit/${postId}`}
                      className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      View draft →
                    </a>
                  </div>
                )}
              </div>

              {/* Connector Line */}
              {index < PHASES.length - 1 && (
                <div
                  className={`absolute left-5 top-14 w-0.5 h-8 ${
                    status === 'completed' && getPhaseStatus(PHASES[index + 1]?.id) !== 'pending'
                      ? 'bg-green-500'
                      : 'bg-gray-300 dark:bg-gray-600'
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-600 dark:text-gray-400">
            Current Phase:{" "}
            <span className="font-medium text-gray-900 dark:text-white">
              {currentPhase
                ? PHASES.find((p) => p.id === currentPhase)?.label || currentPhase
                : "Not started"}
            </span>
          </span>
          {postId && (
            <a
              href={`/contentmanagement/drafts/edit/${postId}`}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              Edit Draft →
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

