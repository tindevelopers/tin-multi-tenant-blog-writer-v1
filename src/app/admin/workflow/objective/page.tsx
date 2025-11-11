"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Target, ArrowRight, Save } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Alert from '@/components/ui/alert/Alert';

export default function ObjectivePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  
  const [formData, setFormData] = useState({
    objective: '',
    target_audience: '',
    industry: '',
    content_goal: 'seo' as 'seo' | 'engagement' | 'conversions' | 'brand_awareness'
  });

  const contentGoals: Array<{ value: 'seo' | 'engagement' | 'conversions' | 'brand_awareness'; label: string; description: string }> = [
    { value: 'seo', label: 'SEO & Rankings', description: 'Rank high in search results' },
    { value: 'engagement', label: 'Engagement', description: 'Increase shares and comments' },
    { value: 'conversions', label: 'Conversions', description: 'Drive sales and sign-ups' },
    { value: 'brand_awareness', label: 'Brand Awareness', description: 'Build brand recognition' }
  ];

  // Load existing workflow session
  useEffect(() => {
    const loadSession = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const sessionId = localStorage.getItem('workflow_session_id');
        if (sessionId) {
          const { data: session, error: sessionError } = await supabase
            .from('workflow_sessions')
            .select('objective, target_audience, industry, workflow_data')
            .eq('session_id', sessionId)
            .maybeSingle();

          if (sessionError && sessionError.code !== 'PGRST116') {
            console.error('Error loading session:', sessionError);
          }

          if (session) {
            setFormData({
              objective: session.objective || '',
              target_audience: session.target_audience || '',
              industry: session.industry || '',
              content_goal: (session.workflow_data as any)?.content_goal || 'seo'
            });
          } else if (sessionError?.code === 'PGRST116') {
            // Session doesn't exist - clear localStorage
            localStorage.removeItem('workflow_session_id');
          }
        }
      } catch (error) {
        console.error('Error loading session:', error);
      }
    };

    loadSession();
  }, []);

  const handleSave = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Please log in to continue');
        return;
      }

      // Get user's org_id
      const { data: userData } = await supabase
        .from('users')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

      if (!userData?.org_id) {
        setError('Organization not found');
        return;
      }

      let sessionId = localStorage.getItem('workflow_session_id');

      // Create or update workflow session
      if (sessionId) {
        const { error: updateError } = await supabase
          .from('workflow_sessions')
          .update({
            objective: formData.objective,
            target_audience: formData.target_audience,
            industry: formData.industry,
            workflow_data: { content_goal: formData.content_goal },
            updated_at: new Date().toISOString()
          })
          .eq('session_id', sessionId as string);

        if (updateError) throw updateError;
      } else {
        const { data: newSession, error: createError } = await supabase
          .from('workflow_sessions')
          .insert({
            org_id: userData.org_id,
            created_by: user.id,
            objective: formData.objective,
            target_audience: formData.target_audience,
            industry: formData.industry,
            current_step: 'objective',
            completed_steps: [],
            workflow_data: { content_goal: formData.content_goal }
          })
          .select('session_id')
          .single();

        if (createError) throw createError;
        if (newSession && newSession.session_id) {
          const newSessionId = newSession.session_id;
          sessionId = newSessionId;
          localStorage.setItem('workflow_session_id', newSessionId);
        }
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err: any) {
      console.error('Error saving objective:', err);
      setError(err.message || 'Failed to save objective');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = async () => {
    if (!formData.objective || !formData.target_audience) {
      setError('Please fill in all required fields');
      return;
    }

    await handleSave();
    router.push('/admin/workflow/keywords');
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
            <Target className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Define Your Content Objective
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Start by clearly defining what you want to achieve with your content
            </p>
          </div>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="mb-6">
          <Alert
            variant="error"
            title="Error"
            message={error}
          />
        </div>
      )}

      {/* Success Message */}
      {saved && (
        <div className="mb-6">
          <Alert
            variant="success"
            title="Saved"
            message="Your objective has been saved"
          />
        </div>
      )}

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 lg:p-8">
        <div className="space-y-6">
          {/* Objective */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Content Objective <span className="text-red-500">*</span>
            </label>
            <textarea
              value={formData.objective}
              onChange={(e) => setFormData({ ...formData, objective: e.target.value })}
              placeholder="e.g., I want to create blogs that rank for Pet Groomers that are looking for new clients"
              rows={4}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Describe your goal clearly. What do you want your content to achieve?
            </p>
          </div>

          {/* Target Audience */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Target Audience <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.target_audience}
              onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
              placeholder="e.g., Pet groomers looking for new clients, small business owners, etc."
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Who is your ideal reader? Be specific about their needs and interests.
            </p>
          </div>

          {/* Industry */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Industry / Niche
            </label>
            <input
              type="text"
              value={formData.industry}
              onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
              placeholder="e.g., Pet grooming, Digital marketing, E-commerce"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>

          {/* Content Goal */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Primary Content Goal
            </label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contentGoals.map((goal) => (
                <button
                  key={goal.value}
                  type="button"
                  onClick={() => setFormData({ ...formData, content_goal: goal.value })}
                  className={`
                    p-4 rounded-lg border-2 text-left transition-all
                    ${formData.content_goal === goal.value
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }
                  `}
                >
                  <div className="font-medium text-gray-900 dark:text-white">
                    {goal.label}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {goal.description}
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <Save className="w-4 h-4" />
            Save Progress
          </button>
          
          <button
            onClick={handleContinue}
            disabled={loading || !formData.objective || !formData.target_audience}
            className="flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
          >
            Continue to Keyword Research
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

