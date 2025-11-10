"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Target,
  Search,
  Layers,
  Lightbulb,
  BookOpen,
  Settings,
  FileText,
  FolderOpen,
  CheckCircle2,
  Circle
} from 'lucide-react';

export type WorkflowStep = {
  id: string;
  name: string;
  path: string;
  icon: React.ReactNode;
  description: string;
};

export const workflowSteps: WorkflowStep[] = [
  {
    id: 'objective',
    name: 'Objective',
    path: '/admin/workflow/objective',
    icon: <Target className="w-5 h-5" />,
    description: 'Define your content goal'
  },
  {
    id: 'keywords',
    name: 'Keyword Research',
    path: '/admin/workflow/keywords',
    icon: <Search className="w-5 h-5" />,
    description: 'Discover high-value keywords'
  },
  {
    id: 'clusters',
    name: 'Clustering',
    path: '/admin/workflow/clusters',
    icon: <Layers className="w-5 h-5" />,
    description: 'Group by parent topics'
  },
  {
    id: 'ideas',
    name: 'Content Ideas',
    path: '/admin/workflow/ideas',
    icon: <Lightbulb className="w-5 h-5" />,
    description: 'Generate creative ideas'
  },
  {
    id: 'topics',
    name: 'Topic Suggestions',
    path: '/admin/workflow/topics',
    icon: <BookOpen className="w-5 h-5" />,
    description: 'Get specific topic angles'
  },
  {
    id: 'strategy',
    name: 'Strategy',
    path: '/admin/workflow/strategy',
    icon: <Settings className="w-5 h-5" />,
    description: 'Create content strategy'
  },
  {
    id: 'editor',
    name: 'Content Editor',
    path: '/admin/workflow/editor',
    icon: <FileText className="w-5 h-5" />,
    description: 'Generate and edit content'
  },
  {
    id: 'posts',
    name: 'My Posts',
    path: '/admin/workflow/posts',
    icon: <FolderOpen className="w-5 h-5" />,
    description: 'Manage your blog posts'
  }
];

interface HorizontalWorkflowNavProps {
  currentStep: string;
  completedSteps?: string[];
  workflowSessionId?: string;
}

export default function HorizontalWorkflowNav({
  currentStep,
  completedSteps = [],
  workflowSessionId
}: HorizontalWorkflowNavProps) {
  const pathname = usePathname();
  
  const getStepStatus = (stepId: string) => {
    if (stepId === currentStep) return 'current';
    if (completedSteps.includes(stepId)) return 'completed';
    return 'pending';
  };

  const getStepIndex = (stepId: string) => {
    return workflowSteps.findIndex(s => s.id === stepId);
  };

  const currentIndex = getStepIndex(currentStep);
  const progress = ((currentIndex + 1) / workflowSteps.length) * 100;

  return (
    <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
      {/* Progress Bar */}
      <div className="h-1 bg-gray-200 dark:bg-gray-700">
        <div
          className="h-full bg-gradient-to-r from-blue-500 to-purple-600 transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Navigation */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center justify-between overflow-x-auto py-4 scrollbar-hide">
          {workflowSteps.map((step, index) => {
            const status = getStepStatus(step.id);
            const isCurrent = status === 'current';
            const isCompleted = status === 'completed';
            const isClickable = isCompleted || isCurrent || index <= currentIndex;

            return (
              <div key={step.id} className="flex items-center flex-shrink-0">
                {/* Step Link */}
                <Link
                  href={isClickable ? step.path : '#'}
                  className={`
                    flex flex-col items-center gap-2 px-4 py-2 rounded-lg transition-all
                    ${isCurrent 
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' 
                      : isCompleted
                      ? 'text-green-600 dark:text-green-400 hover:bg-gray-50 dark:hover:bg-gray-700'
                      : 'text-gray-400 dark:text-gray-500'
                    }
                    ${isClickable ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : 'cursor-not-allowed'}
                  `}
                >
                  <div className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2 transition-all
                    ${isCurrent 
                      ? 'border-blue-600 dark:border-blue-400 bg-blue-600 dark:bg-blue-500 text-white' 
                      : isCompleted
                      ? 'border-green-600 dark:border-green-400 bg-green-50 dark:bg-green-900/20'
                      : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700'
                    }
                  `}>
                    {isCompleted ? (
                      <CheckCircle2 className="w-5 h-5" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <div className="text-center">
                    <div className={`
                      text-sm font-medium
                      ${isCurrent ? 'text-blue-600 dark:text-blue-400' : ''}
                    `}>
                      {step.name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {step.description}
                    </div>
                  </div>
                </Link>

                {/* Connector Line */}
                {index < workflowSteps.length - 1 && (
                  <div className={`
                    w-8 h-0.5 mx-2 transition-colors
                    ${index < currentIndex 
                      ? 'bg-green-500 dark:bg-green-400' 
                      : 'bg-gray-300 dark:bg-gray-600'
                    }
                  `} />
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </div>
  );
}

