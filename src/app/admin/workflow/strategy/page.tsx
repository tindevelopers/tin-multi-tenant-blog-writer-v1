"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Settings, 
  ArrowRight, 
  ArrowLeft,
  Save,
  Target,
  TrendingUp,
  BarChart3,
  FileText,
  CheckCircle2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Alert from '@/components/ui/alert/Alert';

export default function StrategyPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [workflowSession, setWorkflowSession] = useState<any>(null);
  const [selectedTopics, setSelectedTopics] = useState<any[]>([]);
  
  const [formData, setFormData] = useState({
    main_keyword: '',
    secondary_keywords: '',
    content_type: 'blog_post',
    target_audience: '',
    seo_recommendations: [] as string[],
    content_calendar: [] as any[]
  });

  const contentTypes = [
    { value: 'blog_post', label: 'Blog Post' },
    { value: 'guide', label: 'Comprehensive Guide' },
    { value: 'list', label: 'List Article' },
    { value: 'tutorial', label: 'Tutorial' },
    { value: 'comparison', label: 'Comparison' }
  ];

  // Load workflow session and selected topics
  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createClient();
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
            const topics = workflowData.selected_topics || [];
            
            if (topics.length > 0) {
              setSelectedTopics(topics);
              // Pre-populate form with topic data
              const firstTopic = topics[0];
              setFormData({
                main_keyword: firstTopic.target_keywords?.[0] || '',
                secondary_keywords: firstTopic.target_keywords?.slice(1).join(', ') || '',
                content_type: firstTopic.content_type || 'blog_post',
                target_audience: session.target_audience || '',
                seo_recommendations: [],
                content_calendar: []
              });
              
              generateStrategy(topics, session);
            } else {
              setError('No selected topics found. Please complete Topic Suggestions step first.');
            }
          } else if (sessionError?.code === 'PGRST116') {
            // Session doesn't exist - clear localStorage
            localStorage.removeItem('workflow_session_id');
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load strategy');
      }
    };

    loadData();
  }, []);

  // Generate content strategy
  const generateStrategy = async (topics: any[], session: any) => {
    setGenerating(true);
    try {
      const recommendations: string[] = [];
      const calendar: any[] = [];

      // Analyze topics to generate recommendations
      const avgSeoScore = topics.reduce((sum, t) => sum + (t.seo_score || 0), 0) / topics.length;
      const avgWordCount = topics.reduce((sum, t) => sum + (t.word_count_estimate || 0), 0) / topics.length;

      if (avgSeoScore > 80) {
        recommendations.push('High SEO potential - focus on comprehensive, in-depth content');
      }
      if (avgWordCount > 2000) {
        recommendations.push('Target long-form content (2000+ words) for better rankings');
      }
      recommendations.push('Include internal linking opportunities between related topics');
      recommendations.push('Optimize for featured snippets with clear, concise answers');
      recommendations.push('Add visual content (images, infographics) to improve engagement');

      // Generate content calendar suggestions
      topics.forEach((topic, index) => {
        const publishDate = new Date();
        publishDate.setDate(publishDate.getDate() + (index * 7)); // Weekly publishing

        calendar.push({
          topic: topic.title,
          publish_date: publishDate.toISOString().split('T')[0],
          priority: index < 3 ? 'high' : 'medium',
          estimated_traffic: topic.estimated_traffic
        });
      });

      setFormData(prev => ({
        ...prev,
        seo_recommendations: recommendations,
        content_calendar: calendar
      }));

      setSuccess('Content strategy generated successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error generating strategy:', err);
      setError(err.message || 'Failed to generate content strategy');
    } finally {
      setGenerating(false);
    }
  };

  // Save strategy
  const handleSaveStrategy = async () => {
    if (!formData.main_keyword) {
      setError('Please enter a main keyword');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const sessionId = workflowSession?.session_id;
      
      if (!sessionId) {
        setError('Session not found');
        return;
      }

      await supabase
        .from('workflow_sessions')
        .update({
          current_step: 'strategy',
          completed_steps: ['objective', 'keywords', 'clusters', 'ideas', 'topics', 'strategy'],
          workflow_data: {
            ...workflowSession.workflow_data,
            content_strategy: formData
          }
        })
        .eq('session_id', sessionId);

      setSuccess('Content strategy saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving strategy:', err);
      setError(err.message || 'Failed to save content strategy');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
            <Settings className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Content Strategy Generator
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Create comprehensive content strategies with SEO recommendations
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

      {/* Empty State */}
      {selectedTopics.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No topics found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You need selected topics to generate a content strategy.
          </p>
          <button
            onClick={() => router.push('/admin/workflow/topics')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Go to Topic Suggestions
          </button>
        </div>
      )}

      {/* Strategy Form */}
      {selectedTopics.length > 0 && (
        <div className="space-y-6">
          {/* Main Form */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-6">
              Strategy Parameters
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Select Saved Topic <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.main_keyword}
                  onChange={(e) => {
                    const selectedTopic = selectedTopics.find(t => t.title === e.target.value);
                    if (selectedTopic) {
                      setFormData({
                        ...formData,
                        main_keyword: selectedTopic.target_keywords?.[0] || '',
                        secondary_keywords: selectedTopic.target_keywords?.slice(1).join(', ') || '',
                        content_type: selectedTopic.content_type || 'blog_post',
                        target_audience: workflowSession?.target_audience || ''
                      });
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">Select a saved topic...</option>
                  {selectedTopics.map((topic, index) => (
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
                  Main Keyword <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.main_keyword}
                  onChange={(e) => setFormData({ ...formData, main_keyword: e.target.value })}
                  placeholder="e.g., digital marketing strategy"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Content Type
                </label>
                <select
                  value={formData.content_type}
                  onChange={(e) => setFormData({ ...formData, content_type: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  {contentTypes.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Secondary Keywords
                </label>
                <input
                  type="text"
                  value={formData.secondary_keywords}
                  onChange={(e) => setFormData({ ...formData, secondary_keywords: e.target.value })}
                  placeholder="e.g., SEO, social media, content marketing"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Target Audience
                </label>
                <input
                  type="text"
                  value={formData.target_audience}
                  onChange={(e) => setFormData({ ...formData, target_audience: e.target.value })}
                  placeholder="e.g., small business owners, marketers"
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>

          {/* SEO Recommendations */}
          {formData.seo_recommendations.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <Target className="w-5 h-5" />
                SEO Recommendations
              </h2>
              <ul className="space-y-2">
                {formData.seo_recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2 text-gray-700 dark:text-gray-300">
                    <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0 mt-0.5" />
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Content Calendar */}
          {formData.content_calendar.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Content Calendar Suggestions
              </h2>
              <div className="space-y-3">
                {formData.content_calendar.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="font-medium text-gray-900 dark:text-white mb-1">
                        {item.topic}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        Publish: {new Date(item.publish_date).toLocaleDateString()} • 
                        Priority: <span className="font-medium">{item.priority}</span> • 
                        Traffic: <span className="font-medium">{item.estimated_traffic}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Generating State */}
          {generating && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Generating content strategy...</p>
            </div>
          )}

          {/* Actions */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <button
                onClick={() => router.push('/admin/workflow/topics')}
                className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Topics
              </button>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleSaveStrategy}
                  disabled={loading || !formData.main_keyword}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
                >
                  <Save className="w-4 h-4" />
                  Save Strategy
                </button>
                <button
                  onClick={() => router.push('/admin/workflow/editor')}
                  disabled={!formData.main_keyword}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
                >
                  Continue to Content Editor
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

