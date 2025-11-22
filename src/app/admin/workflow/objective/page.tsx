"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Target, ArrowRight, Save, Lightbulb } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Alert from '@/components/ui/alert/Alert';
import { useTopicRecommendations } from '@/hooks/useTopicRecommendations';

export default function ObjectivePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showTopicRecommendations, setShowTopicRecommendations] = useState(false);
  
  const { result: topicsResult, loading: topicsLoading, error: topicsError, recommend: recommendTopics } = useTopicRecommendations();
  const topics = topicsResult?.topics || [];
  
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

    // Store topic keywords if available from selected topic
    if (typeof window !== 'undefined') {
      const storedTopicKeywords = sessionStorage.getItem('topic_keywords');
      if (storedTopicKeywords) {
        try {
          const topicKeywords = JSON.parse(storedTopicKeywords);
          // Store in workflow_data for keyword research page
          const supabase = createClient();
          const sessionId = localStorage.getItem('workflow_session_id');
          if (sessionId) {
            const { data: session } = await supabase
              .from('workflow_sessions')
              .select('workflow_data')
              .eq('session_id', sessionId)
              .maybeSingle();
            
            const workflowData = (session?.workflow_data as Record<string, unknown>) || {};
            workflowData.topic_keywords = topicKeywords;
            workflowData.selected_topic = sessionStorage.getItem('selected_topic') || formData.objective;
            
            await supabase
              .from('workflow_sessions')
              .update({ workflow_data: workflowData })
              .eq('session_id', sessionId);
          }
        } catch (e) {
          console.error('Error storing topic keywords:', e);
        }
      }
    }

    await handleSave();
    router.push('/admin/workflow/keywords');
  };

  const handleGetTopicRecommendations = async () => {
    if (!formData.industry && !formData.objective) {
      setError('Please fill in industry or objective to get topic recommendations');
      return;
    }

    setShowTopicRecommendations(true);
    setError(null);
    
    try {
      // Extract keywords from objective if available
      let keywords: string[] | undefined = undefined;
      
      if (formData.objective) {
        // Extract meaningful phrases (2-3 words) from objective - preserve phrases, don't split
        const objectiveText = formData.objective.toLowerCase();
        
        // Common stop words to filter out
        const stopWords = new Set(['want', 'create', 'blogs', 'that', 'rank', 'for', 'are', 'looking', 'new', 'clients', 'about', 'with', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'from', 'of', 'a', 'an']);
        
        // Extract 2-3 word phrases
        const words = objectiveText
          .replace(/[^\w\s]/g, ' ')
          .split(/\s+/)
          .filter((word: string) => word.length > 2 && !stopWords.has(word));
        
        // Create 2-word and 3-word phrases
        const phrases: string[] = [];
        for (let i = 0; i < words.length - 1; i++) {
          const twoWord = `${words[i]} ${words[i + 1]}`;
          if (twoWord.length > 5) phrases.push(twoWord);
          
          if (i < words.length - 2) {
            const threeWord = `${words[i]} ${words[i + 1]} ${words[i + 2]}`;
            if (threeWord.length > 8) phrases.push(threeWord);
          }
        }
        
        // Also include single important words (longer ones)
        const importantWords = words.filter((word: string) => word.length > 4);
        
        keywords = [...phrases, ...importantWords].slice(0, 10);
      }
      
      // Add industry as a keyword if provided (preserve as phrase)
      if (formData.industry) {
        const industryKeyword = formData.industry.toLowerCase();
        if (keywords) {
          // Add industry if not already included
          if (!keywords.some(k => k.includes(industryKeyword) || industryKeyword.includes(k))) {
            keywords = [industryKeyword, ...keywords].slice(0, 10);
          }
        } else {
          keywords = [industryKeyword];
        }
      }

      await recommendTopics({
        industry: formData.industry || undefined,
        target_audience: formData.target_audience || undefined,
        objective: formData.objective || undefined,
        content_goal: formData.content_goal || undefined,
        keywords: keywords,
        count: 10
      });
    } catch (err: any) {
      setError(err.message || 'Failed to get topic recommendations');
      setShowTopicRecommendations(false);
    }
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

          {/* Topic Recommendations */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Topic Recommendations
                </label>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Get AI-powered topic suggestions based on your objective and industry
                </p>
              </div>
              <button
                type="button"
                onClick={handleGetTopicRecommendations}
                disabled={topicsLoading || !formData.industry && !formData.objective}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium disabled:cursor-not-allowed"
              >
                {topicsLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <Lightbulb className="w-4 h-4" />
                    Get Recommendations
                  </>
                )}
              </button>
            </div>

            {topicsError && (
              <div className="mb-4">
                <Alert
                  variant="error"
                  title="Error"
                  message={typeof topicsError === 'string' ? topicsError : 'Failed to load topic recommendations'}
                />
              </div>
            )}

            {showTopicRecommendations && topics && topics.length > 0 && (
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-gray-900 dark:text-white">
                    Recommended Topics ({topics.length})
                  </h4>
                  {topics.some(t => t.recommended) && (
                    <span className="text-xs text-green-600 dark:text-green-400 font-medium">
                      ⭐ {topics.filter(t => t.recommended).length} AI-optimized
                    </span>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-3 max-h-96 overflow-y-auto">
                  {topics.map((topic, index) => (
                    <div
                      key={index}
                      className={`p-4 rounded-lg border transition-colors cursor-pointer ${
                        topic.recommended
                          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 hover:border-green-300 dark:hover:border-green-700'
                          : 'bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 hover:border-purple-300 dark:hover:border-purple-600'
                      }`}
                      onClick={() => {
                        // Store topic keywords for use in keyword research
                        // Preserve keywords as phrases (not split)
                        const topicKeywords = topic.keywords || [topic.title];
                        
                        // Store in sessionStorage for keyword research page
                        if (typeof window !== 'undefined') {
                          sessionStorage.setItem('topic_keywords', JSON.stringify(topicKeywords));
                          sessionStorage.setItem('topic_ai_score', String(topic.aiScore || 0));
                          sessionStorage.setItem('selected_topic', topic.title);
                        }
                        
                        setFormData({ ...formData, objective: topic.title });
                        setShowTopicRecommendations(false);
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h5 className="font-medium text-gray-900 dark:text-white flex-1">
                          {topic.title}
                        </h5>
                        {topic.recommended && (
                          <span className="ml-2 px-2 py-0.5 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded text-xs font-medium">
                            ⭐ Recommended
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                        {topic.description}
                      </p>
                      
                      {/* AI Optimization Score */}
                      {topic.aiScore !== undefined && (
                        <div className="mb-3 p-2 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                              AI Optimization Score
                            </span>
                            <span className={`text-sm font-bold ${
                              topic.aiScore >= 70 ? 'text-green-600 dark:text-green-400' :
                              topic.aiScore >= 50 ? 'text-blue-600 dark:text-blue-400' :
                              topic.aiScore >= 30 ? 'text-amber-600 dark:text-amber-400' :
                              'text-red-600 dark:text-red-400'
                            }`}>
                              {topic.aiScore}/100
                            </span>
                          </div>
                          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                topic.aiScore >= 70 ? 'bg-green-500' :
                                topic.aiScore >= 50 ? 'bg-blue-500' :
                                topic.aiScore >= 30 ? 'bg-amber-500' :
                                'bg-red-500'
                              }`}
                              style={{ width: `${topic.aiScore}%` }}
                            />
                          </div>
                        </div>
                      )}
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs text-gray-500 dark:text-gray-400 mb-2">
                        <div>
                          <span className="font-medium">Volume:</span> {topic.search_volume?.toLocaleString() || 'N/A'}
                        </div>
                        {topic.aiSearchVolume !== undefined && (
                          <div>
                            <span className="font-medium">AI Volume:</span> {topic.aiSearchVolume.toLocaleString()}
                          </div>
                        )}
                        <div>
                          <span className="font-medium">Difficulty:</span> {topic.difficulty || 'N/A'}
                        </div>
                        {topic.estimated_traffic && (
                          <div>
                            <span className="font-medium">Traffic:</span> {topic.estimated_traffic.toLocaleString()}
                          </div>
                        )}
                      </div>
                      {topic.keywords && topic.keywords.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {topic.keywords.slice(0, 5).map((keyword, kwIndex) => (
                            <span
                              key={kwIndex}
                              className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 rounded text-xs"
                            >
                              {keyword}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            ) : (
            <Save className="w-4 h-4" />
            )}
            {loading ? 'Saving...' : 'Save Progress'}
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

