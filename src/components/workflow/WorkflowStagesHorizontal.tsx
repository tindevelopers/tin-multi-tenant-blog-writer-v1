"use client";

import { 
  DocumentTextIcon, 
  PhotoIcon, 
  SparklesIcon, 
  CheckCircleIcon,
  ArrowRightIcon
} from "@heroicons/react/24/outline";
import type { WorkflowPhase } from "@/lib/workflow-phase-manager";

interface WorkflowStagesHorizontalProps {
  currentPhase: WorkflowPhase | null;
  className?: string;
}

interface StageInfo {
  id: WorkflowPhase;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  bgColor: string;
}

const STAGES: StageInfo[] = [
  {
    id: 'phase_1_content',
    label: 'Content Generation',
    icon: DocumentTextIcon,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
  },
  {
    id: 'phase_2_images',
    label: 'Image Generation',
    icon: PhotoIcon,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
  },
  {
    id: 'phase_3_enhancement',
    label: 'Content Enhancement',
    icon: SparklesIcon,
    color: 'text-indigo-600',
    bgColor: 'bg-indigo-100',
  },
];

export default function WorkflowStagesHorizontal({
  currentPhase,
  className = "",
}: WorkflowStagesHorizontalProps) {
  const getStageStatus = (stageId: WorkflowPhase): 'pending' | 'completed' | 'current' => {
    if (!currentPhase) return 'pending';
    
    if (currentPhase === 'completed') {
      return 'completed';
    }
    
    const currentIndex = STAGES.findIndex(s => s.id === currentPhase);
    const stageIndex = STAGES.findIndex(s => s.id === stageId);
    
    if (stageIndex < currentIndex) return 'completed';
    if (stageIndex === currentIndex) return 'current';
    return 'pending';
  };

  return (
    <div className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6 ${className}`}>
      <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">
        Workflow Progress
      </h3>
      <div className="flex items-center justify-between">
        {STAGES.map((stage, index) => {
          const status = getStageStatus(stage.id);
          const Icon = stage.icon;
          
          return (
            <div key={stage.id} className="flex items-center flex-1">
              {/* Stage */}
              <div className="flex flex-col items-center flex-1">
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
                    status === 'completed'
                      ? 'bg-green-500 text-white'
                      : status === 'current'
                      ? 'bg-blue-500 text-white ring-4 ring-blue-200 dark:ring-blue-800'
                      : 'bg-gray-200 dark:bg-gray-700 text-gray-400'
                  }`}
                >
                  {status === 'completed' ? (
                    <CheckCircleIcon className="w-6 h-6" />
                  ) : (
                    <Icon className="w-6 h-6" />
                  )}
                </div>
                <span
                  className={`mt-2 text-xs font-medium text-center ${
                    status === 'completed'
                      ? 'text-green-600 dark:text-green-400'
                      : status === 'current'
                      ? 'text-blue-600 dark:text-blue-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {stage.label}
                </span>
                {status === 'current' && (
                  <span className="mt-1 text-xs text-blue-600 dark:text-blue-400 font-semibold">
                    In Progress
                  </span>
                )}
              </div>
              
              {/* Connector Arrow */}
              {index < STAGES.length - 1 && (
                <div className="flex-1 flex items-center justify-center px-2">
                  <div
                    className={`h-0.5 flex-1 ${
                      status === 'completed' || getStageStatus(STAGES[index + 1].id) === 'completed'
                        ? 'bg-green-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                  <ArrowRightIcon
                    className={`w-5 h-5 mx-1 ${
                      status === 'completed' || getStageStatus(STAGES[index + 1].id) === 'completed'
                        ? 'text-green-500'
                        : 'text-gray-400'
                    }`}
                  />
                  <div
                    className={`h-0.5 flex-1 ${
                      getStageStatus(STAGES[index + 1].id) === 'completed'
                        ? 'bg-green-500'
                        : 'bg-gray-300 dark:bg-gray-600'
                    }`}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

