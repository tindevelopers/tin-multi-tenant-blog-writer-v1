"use client";

import { useState } from "react";
import WorkflowPhaseManager from "@/components/workflow/WorkflowPhaseManager";
import type { WorkflowPhase } from "@/lib/workflow-phase-manager";

export default function WorkflowPhasesDemoPage() {
  const [currentPhase, setCurrentPhase] = useState<WorkflowPhase | null>(null);
  const [postId, setPostId] = useState<string | null>(null);
  const [testQueueId] = useState<string>("demo-queue-123");

  const phases: WorkflowPhase[] = [
    'phase_1_content',
    'phase_2_images',
    'phase_3_enhancement',
    'completed',
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Workflow Phase Manager - Demo Page
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Test and preview the Workflow Phase Manager component
          </p>
        </div>

        {/* Controls */}
        <div className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Test Controls
          </h2>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Phase
              </label>
              <div className="flex gap-2 flex-wrap">
                {phases.map((phase) => (
                  <button
                    key={phase}
                    onClick={() => setCurrentPhase(phase)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      currentPhase === phase
                        ? 'bg-blue-500 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {phase.replace('phase_', '').replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPhase(null)}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
                >
                  Clear
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Post ID (for draft link)
              </label>
              <input
                type="text"
                value={postId || ''}
                onChange={(e) => setPostId(e.target.value || null)}
                placeholder="Enter post ID or leave empty"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>

            <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                <strong>Queue ID:</strong> {testQueueId}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                <strong>Current Phase:</strong> {currentPhase || 'None'}
              </p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                <strong>Post ID:</strong> {postId || 'None'}
              </p>
            </div>
          </div>
        </div>

        {/* Workflow Phase Manager Component */}
        <WorkflowPhaseManager
          queueId={testQueueId}
          currentPhase={currentPhase}
          postId={postId}
          onPhaseComplete={(phase, postId) => {
            alert(`Phase ${phase} completed! Post ID: ${postId}`);
            setPostId(postId);
            setCurrentPhase(phase);
          }}
          onResumePhase={(phase) => {
            alert(`Resuming phase: ${phase}`);
            setCurrentPhase(phase);
          }}
        />

        {/* Usage Instructions */}
        <div className="mt-8 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3">
            How to Use
          </h3>
          <ul className="space-y-2 text-sm text-blue-800 dark:text-blue-200">
            <li>
              <strong>1. Select a Phase:</strong> Click on any phase button above to simulate that phase being active
            </li>
            <li>
              <strong>2. Set Post ID:</strong> Enter a post ID to enable the "Edit Draft" link
            </li>
            <li>
              <strong>3. Test Resume:</strong> Click "Resume" buttons on pending phases to test the resume functionality
            </li>
            <li>
              <strong>4. View States:</strong> The component shows different visual states for pending, current, and completed phases
            </li>
          </ul>
        </div>

        {/* Component Info */}
        <div className="mt-6 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
            Component Information
          </h3>
          <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
            <p>
              <strong>File Location:</strong> <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">src/components/workflow/WorkflowPhaseManager.tsx</code>
            </p>
            <p>
              <strong>Used In:</strong> <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">src/app/contentmanagement/blog-queue/[id]/page.tsx</code>
            </p>
            <p>
              <strong>Access URL:</strong> <code className="bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">/test/workflow-phases</code>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

