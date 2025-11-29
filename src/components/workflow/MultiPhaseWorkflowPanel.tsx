'use client';

/**
 * Multi-Phase Workflow Panel
 * 
 * UI component for the 5-phase blog creation workflow
 */

import React, { useState, useCallback } from 'react';
import { useMultiPhaseWorkflow, type WorkflowConfig } from '@/hooks/useMultiPhaseWorkflow';
import {
  DocumentTextIcon,
  PhotoIcon,
  SparklesIcon,
  LinkIcon,
  CloudArrowUpIcon,
  CheckCircleIcon,
  ExclamationCircleIcon,
  PlayIcon,
  StopIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';

interface Phase {
  id: string;
  name: string;
  icon: typeof DocumentTextIcon;
  description: string;
}

const PHASES: Phase[] = [
  {
    id: 'content_generation',
    name: 'Content Generation',
    icon: DocumentTextIcon,
    description: 'Generate blog content using AI',
  },
  {
    id: 'image_generation',
    name: 'Image Generation',
    icon: PhotoIcon,
    description: 'Create featured and content images',
  },
  {
    id: 'content_enhancement',
    name: 'Content Enhancement',
    icon: SparklesIcon,
    description: 'Optimize SEO and structure',
  },
  {
    id: 'interlinking',
    name: 'Advanced Interlinking',
    icon: LinkIcon,
    description: 'Analyze website and add links',
  },
  {
    id: 'publishing_preparation',
    name: 'Publishing Preparation',
    icon: CloudArrowUpIcon,
    description: 'Validate and prepare for Webflow',
  },
];

interface MultiPhaseWorkflowPanelProps {
  onWorkflowComplete?: (state: any) => void;
  defaultConfig?: Partial<WorkflowConfig>;
}

export function MultiPhaseWorkflowPanel({
  onWorkflowComplete,
  defaultConfig = {},
}: MultiPhaseWorkflowPanelProps) {
  const {
    state,
    isRunning,
    progress,
    currentPhase,
    error,
    startWorkflow,
    cancelWorkflow,
    refreshStatus,
    contentResult,
    imageResult,
    enhancementResult,
    interlinkingResult,
    publishingResult,
  } = useMultiPhaseWorkflow();

  // Form state
  const [config, setConfig] = useState<WorkflowConfig>({
    topic: '',
    keywords: [],
    targetAudience: '',
    tone: 'professional',
    wordCount: 1500,
    qualityLevel: 'high',
    generateFeaturedImage: true,
    generateContentImages: false,
    imageStyle: 'photographic',
    optimizeForSeo: true,
    generateStructuredData: true,
    crawlWebsite: true,
    maxInternalLinks: 5,
    maxExternalLinks: 3,
    includeClusterLinks: true,
    targetPlatform: 'webflow',
    isDraft: true,
    ...defaultConfig,
  });

  const [keywordsInput, setKeywordsInput] = useState(defaultConfig.keywords?.join(', ') || '');
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update config
  const updateConfig = useCallback((updates: Partial<WorkflowConfig>) => {
    setConfig(prev => ({ ...prev, ...updates }));
  }, []);

  // Handle start
  const handleStart = useCallback(async () => {
    const keywords = keywordsInput.split(',').map(k => k.trim()).filter(k => k);
    await startWorkflow({ ...config, keywords });
  }, [config, keywordsInput, startWorkflow]);

  // Get phase status
  const getPhaseStatus = (phaseId: string): 'pending' | 'active' | 'completed' | 'failed' => {
    if (!state) return 'pending';
    
    const phaseOrder = ['content_generation', 'image_generation', 'content_enhancement', 'interlinking', 'publishing_preparation'];
    const currentIndex = phaseOrder.indexOf(state.phase);
    const phaseIndex = phaseOrder.indexOf(phaseId);
    
    if (state.phase === 'failed') {
      if (phaseIndex <= currentIndex) return 'failed';
      return 'pending';
    }
    
    if (state.phase === 'completed') return 'completed';
    
    if (phaseIndex < currentIndex) return 'completed';
    if (phaseIndex === currentIndex) return 'active';
    return 'pending';
  };

  // Check if workflow completed successfully
  React.useEffect(() => {
    if (state?.phase === 'completed' && onWorkflowComplete) {
      onWorkflowComplete(state);
    }
  }, [state, onWorkflowComplete]);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Multi-Phase Blog Creation
        </h2>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Create optimized blog posts through a 5-phase workflow
        </p>
      </div>

      {/* Phase Progress */}
      <div className="p-6 border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
        <div className="flex items-center justify-between mb-4">
          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
            {currentPhase}
          </span>
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {progress}% complete
          </span>
        </div>
        
        {/* Progress bar */}
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-500 ${
              error ? 'bg-red-500' : 'bg-brand-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Phase indicators */}
        <div className="mt-4 flex justify-between">
          {PHASES.map((phase, index) => {
            const status = getPhaseStatus(phase.id);
            const Icon = phase.icon;
            
            return (
              <div
                key={phase.id}
                className="flex flex-col items-center"
                title={phase.description}
              >
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                    status === 'completed'
                      ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                      : status === 'active'
                      ? 'bg-brand-100 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 animate-pulse'
                      : status === 'failed'
                      ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-400 dark:text-gray-500'
                  }`}
                >
                  {status === 'completed' ? (
                    <CheckCircleIcon className="w-5 h-5" />
                  ) : status === 'failed' ? (
                    <ExclamationCircleIcon className="w-5 h-5" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>
                <span className="mt-1 text-xs text-gray-500 dark:text-gray-400 text-center max-w-[80px]">
                  {phase.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border-b border-red-200 dark:border-red-800">
          <div className="flex items-center gap-2">
            <ExclamationCircleIcon className="w-5 h-5 text-red-600 dark:text-red-400" />
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      )}

      {/* Configuration Form */}
      {!isRunning && state?.phase !== 'completed' && (
        <div className="p-6 space-y-4">
          {/* Topic */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Topic *
            </label>
            <input
              type="text"
              value={config.topic}
              onChange={(e) => updateConfig({ topic: e.target.value })}
              placeholder="Enter blog topic..."
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          {/* Keywords */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Keywords (comma-separated)
            </label>
            <input
              type="text"
              value={keywordsInput}
              onChange={(e) => setKeywordsInput(e.target.value)}
              placeholder="e.g., seo, content marketing, blog writing"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Target Audience
            </label>
            <input
              type="text"
              value={config.targetAudience}
              onChange={(e) => updateConfig({ targetAudience: e.target.value })}
              placeholder="e.g., small business owners, marketers"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-brand-500 focus:border-transparent"
            />
          </div>

          {/* Quick Options */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Word Count
              </label>
              <select
                value={config.wordCount}
                onChange={(e) => updateConfig({ wordCount: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                <option value={800}>Short (~800 words)</option>
                <option value={1500}>Medium (~1500 words)</option>
                <option value={2500}>Long (~2500 words)</option>
                <option value={4000}>Very Long (~4000 words)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Quality Level
              </label>
              <select
                value={config.qualityLevel}
                onChange={(e) => updateConfig({ qualityLevel: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
              >
                <option value="standard">Standard</option>
                <option value="high">High</option>
                <option value="premium">Premium</option>
              </select>
            </div>
          </div>

          {/* Advanced Options Toggle */}
          <button
            type="button"
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-brand-600 dark:text-brand-400 hover:underline"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced Options
          </button>

          {/* Advanced Options */}
          {showAdvanced && (
            <div className="space-y-4 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              {/* Image Options */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.generateFeaturedImage}
                    onChange={(e) => updateConfig({ generateFeaturedImage: e.target.checked })}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Generate Featured Image
                  </span>
                </label>
              </div>

              {/* Interlinking Options */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.crawlWebsite}
                    onChange={(e) => updateConfig({ crawlWebsite: e.target.checked })}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Enable Website Crawling & Interlinking
                  </span>
                </label>
              </div>

              {config.crawlWebsite && (
                <div className="grid grid-cols-2 gap-4 ml-6">
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Max Internal Links
                    </label>
                    <input
                      type="number"
                      value={config.maxInternalLinks}
                      onChange={(e) => updateConfig({ maxInternalLinks: parseInt(e.target.value) })}
                      min={0}
                      max={10}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 dark:text-gray-400 mb-1">
                      Max External Links
                    </label>
                    <input
                      type="number"
                      value={config.maxExternalLinks}
                      onChange={(e) => updateConfig({ maxExternalLinks: parseInt(e.target.value) })}
                      min={0}
                      max={10}
                      className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>
              )}

              {/* Publishing Options */}
              <div className="flex items-center gap-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.isDraft}
                    onChange={(e) => updateConfig({ isDraft: e.target.checked })}
                    className="rounded border-gray-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Save as Draft (don't publish immediately)
                  </span>
                </label>
              </div>
            </div>
          )}

          {/* Start Button */}
          <button
            onClick={handleStart}
            disabled={!config.topic}
            className="w-full py-3 px-4 bg-brand-600 hover:bg-brand-700 disabled:bg-gray-400 text-white font-medium rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <PlayIcon className="w-5 h-5" />
            Start Multi-Phase Workflow
          </button>
        </div>
      )}

      {/* Running State */}
      {isRunning && (
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-brand-600" />
              <span className="text-gray-700 dark:text-gray-300">
                Processing {currentPhase}...
              </span>
            </div>
            <button
              onClick={cancelWorkflow}
              className="px-4 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg flex items-center gap-2 transition-colors"
            >
              <StopIcon className="w-4 h-4" />
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Results Summary */}
      {state?.phase === 'completed' && (
        <div className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
            <CheckCircleIcon className="w-6 h-6" />
            <span className="font-medium">Workflow Completed Successfully!</span>
          </div>

          {/* Content Result */}
          {contentResult?.status === 'completed' && (
            <div className="p-4 bg-gray-50 dark:bg-gray-900/50 rounded-lg">
              <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                {contentResult.title || 'Generated Content'}
              </h4>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {contentResult.wordCount?.toLocaleString()} words generated
              </p>
            </div>
          )}

          {/* Content Score */}
          {publishingResult?.contentScore && (
            <div className="grid grid-cols-5 gap-2">
              <ScoreCard label="Overall" score={publishingResult.contentScore.overall} />
              <ScoreCard label="SEO" score={publishingResult.contentScore.seo} />
              <ScoreCard label="Quality" score={publishingResult.contentScore.quality} />
              <ScoreCard label="Links" score={publishingResult.contentScore.interlinking} />
              <ScoreCard label="Images" score={publishingResult.contentScore.images} />
            </div>
          )}

          {/* Publishing Readiness */}
          {publishingResult?.publishingReadiness && (
            <div className={`p-4 rounded-lg ${
              publishingResult.publishingReadiness.isReady
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800'
            }`}>
              <p className={`font-medium ${
                publishingResult.publishingReadiness.isReady
                  ? 'text-green-700 dark:text-green-300'
                  : 'text-yellow-700 dark:text-yellow-300'
              }`}>
                {publishingResult.publishingReadiness.isReady
                  ? '✅ Ready to Publish'
                  : '⚠️ Review before publishing'
                }
              </p>
              
              {publishingResult.publishingReadiness.warnings.length > 0 && (
                <ul className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  {publishingResult.publishingReadiness.warnings.map((warning, i) => (
                    <li key={i}>• {warning}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={() => {
                // Reset for new workflow
                setKeywordsInput('');
                updateConfig({ topic: '' });
              }}
              className="flex-1 py-2 px-4 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg flex items-center justify-center gap-2 transition-colors"
            >
              <ArrowPathIcon className="w-4 h-4" />
              Start New
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// Score Card Component
function ScoreCard({ label, score }: { label: string; score: number }) {
  const getScoreColor = (s: number) => {
    if (s >= 80) return 'text-green-600 dark:text-green-400';
    if (s >= 60) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <div className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg text-center">
      <div className={`text-lg font-bold ${getScoreColor(score)}`}>
        {score}
      </div>
      <div className="text-xs text-gray-500 dark:text-gray-400">
        {label}
      </div>
    </div>
  );
}

export default MultiPhaseWorkflowPanel;

