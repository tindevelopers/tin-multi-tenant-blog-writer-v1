"use client";

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import HorizontalWorkflowNav, { workflowSteps } from '@/components/workflow/HorizontalWorkflowNav';
import { createClient } from '@/lib/supabase/client';

export default function WorkflowLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [workflowSessionId, setWorkflowSessionId] = useState<string | undefined>();
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

  // Determine current step from pathname
  const currentStep = workflowSteps.find(step => pathname?.startsWith(step.path))?.id || 'objective';

  // Load workflow session data
  useEffect(() => {
    const loadWorkflowSession = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) return;

        // Check for active workflow session in localStorage
        const savedSessionId = localStorage.getItem('workflow_session_id');
        if (savedSessionId) {
          setWorkflowSessionId(savedSessionId);
          
          // Load completed steps from session (use maybeSingle to avoid 406 errors)
          const { data: session, error: sessionError } = await supabase
            .from('workflow_sessions')
            .select('completed_steps')
            .eq('session_id', savedSessionId)
            .maybeSingle();
          
          if (sessionError && sessionError.code !== 'PGRST116') {
            console.error('Error loading workflow session:', sessionError);
          }
          
          if (session?.completed_steps) {
            setCompletedSteps(session.completed_steps);
          } else if (sessionError?.code === 'PGRST116') {
            // Session doesn't exist - clear localStorage
            localStorage.removeItem('workflow_session_id');
            setWorkflowSessionId(undefined);
          }
        }
      } catch (error) {
        console.error('Error loading workflow session:', error);
      }
    };

    loadWorkflowSession();
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <HorizontalWorkflowNav
        currentStep={currentStep}
        completedSteps={completedSteps}
        workflowSessionId={workflowSessionId}
      />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

