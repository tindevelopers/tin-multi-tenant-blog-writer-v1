"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  BookOpen, 
  ArrowRight, 
  ArrowLeft,
  Sparkles,
  Target,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Alert from '@/components/ui/alert/Alert';

interface TopicSuggestion {
  id: string;
  title: string;
  unique_angle: string;
  target_keywords: string[];
  seo_score: number;
  readability_score: number;
  estimated_traffic: 'low' | 'medium' | 'high';
  content_type: string;
  word_count_estimate: number;
  reasoning: string;
  selected?: boolean;
}

export default function TopicsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [workflowSession, setWorkflowSession] = useState<any>(null);
  const [savedIdeas, setSavedIdeas] = useState<any[]>([]);
  const [topics, setTopics] = useState<TopicSuggestion[]>([]);
  const [selectedTopics, setSelectedTopics] = useState<Set<string>>(new Set());
  const [filterTraffic, setFilterTraffic] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'seo_score' | 'traffic' | 'title'>('seo_score');

  // Load workflow session and saved ideas
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
            const ideas = workflowData.saved_content_ideas || [];
            
            if (ideas.length > 0) {
              setSavedIdeas(ideas);
              generateTopicSuggestions(ideas);
            } else {
              setError('No saved content ideas found. Please complete Content Ideas step first.');
            }
          } else if (sessionError?.code === 'PGRST116') {
            // Session doesn't exist - clear localStorage
            localStorage.removeItem('workflow_session_id');
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load topic suggestions');
      }
    };

    loadData();
  }, []);

  // Generate topic suggestions from saved ideas
  const generateTopicSuggestions = async (ideas: any[]) => {
    setGenerating(true);
    try {
      const generatedTopics: TopicSuggestion[] = [];

      ideas.forEach((idea, index) => {
        const baseTitle = idea.title;
        const keywords = idea.target_keywords || [];
        const primaryKeyword = keywords[0] || '';

        // Generate multiple topic variations with unique angles
        const topicVariations = [
          {
            id: `topic-${index}-1`,
            title: `${baseTitle}: Expert Insights and Best Practices`,
            unique_angle: 'Expert perspective with insider tips',
            target_keywords: keywords,
            seo_score: idea.seo_score + 5,
            readability_score: 90,
            estimated_traffic: idea.estimated_traffic,
            content_type: idea.content_type,
            word_count_estimate: idea.word_count_estimate,
            reasoning: 'Expert angle increases authority and shareability'
          },
          {
            id: `topic-${index}-2`,
            title: `${baseTitle} for ${workflowSession?.target_audience || 'Beginners'}`,
            unique_angle: 'Beginner-friendly approach with step-by-step guidance',
            target_keywords: [...keywords, 'for beginners', 'guide'],
            seo_score: idea.seo_score + 3,
            readability_score: 95,
            estimated_traffic: idea.estimated_traffic === 'high' ? 'high' : 'medium',
            content_type: idea.content_type,
            word_count_estimate: idea.word_count_estimate + 500,
            reasoning: 'Beginner-focused content has high search volume and low competition'
          },
          {
            id: `topic-${index}-3`,
            title: `2024 Guide: ${baseTitle}`,
            unique_angle: 'Current year relevance with latest trends',
            target_keywords: [...keywords, '2024', 'latest'],
            seo_score: idea.seo_score + 8,
            readability_score: 85,
            estimated_traffic: 'high',
            content_type: idea.content_type,
            word_count_estimate: idea.word_count_estimate,
            reasoning: 'Year-specific content ranks well and shows freshness'
          },
          {
            id: `topic-${index}-4`,
            title: `${baseTitle}: Common Mistakes to Avoid`,
            unique_angle: 'Negative angle highlighting pitfalls',
            target_keywords: [...keywords, 'mistakes', 'avoid'],
            seo_score: idea.seo_score + 2,
            readability_score: 88,
            estimated_traffic: 'medium',
            content_type: idea.content_type,
            word_count_estimate: idea.word_count_estimate - 500,
            reasoning: 'Mistake-focused content attracts readers seeking solutions'
          }
        ];

        generatedTopics.push(...topicVariations);
      });

      // Sort by SEO score
      generatedTopics.sort((a, b) => b.seo_score - a.seo_score);
      setTopics(generatedTopics);
      setSuccess(`Generated ${generatedTopics.length} topic suggestions`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error generating topics:', err);
      setError(err.message || 'Failed to generate topic suggestions');
    } finally {
      setGenerating(false);
    }
  };

  // Toggle topic selection
  const toggleTopicSelection = (topicId: string) => {
    const newSelected = new Set(selectedTopics);
    if (newSelected.has(topicId)) {
      newSelected.delete(topicId);
    } else {
      newSelected.add(topicId);
    }
    setSelectedTopics(newSelected);
  };

  // Save selected topics
  const handleSaveTopics = async () => {
    if (selectedTopics.size === 0) {
      setError('Please select at least one topic');
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

      const selectedTopicsList = topics.filter(t => selectedTopics.has(t.id));

      await supabase
        .from('workflow_sessions')
        .update({
          current_step: 'topics',
          completed_steps: ['objective', 'keywords', 'clusters', 'ideas', 'topics'],
          workflow_data: {
            ...workflowSession.workflow_data,
            selected_topics: selectedTopicsList
          }
        })
        .eq('session_id', sessionId);

      setSuccess('Topic suggestions saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving topics:', err);
      setError(err.message || 'Failed to save topic suggestions');
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort topics
  const filteredAndSortedTopics = topics
    .filter(topic => {
      if (filterTraffic !== 'all' && topic.estimated_traffic !== filterTraffic) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'seo_score':
          return b.seo_score - a.seo_score;
        case 'traffic':
          const trafficOrder = { high: 3, medium: 2, low: 1 };
          return trafficOrder[b.estimated_traffic] - trafficOrder[a.estimated_traffic];
        case 'title':
          return a.title.localeCompare(b.title);
        default:
          return 0;
      }
    });

  const getTrafficColor = (traffic: string) => {
    const colors: Record<string, string> = {
      high: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      low: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
    };
    return colors[traffic] || '';
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Topic Suggestions
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Get specific topic ideas with unique angles based on your saved keyword research
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
      {savedIdeas.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No keyword sets found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You need saved keyword sets to generate topic suggestions.
          </p>
          <button
            onClick={() => router.push('/admin/workflow/ideas')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Go to Content Ideas
          </button>
        </div>
      )}

      {/* Filters */}
      {topics.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <select
              value={filterTraffic}
              onChange={(e) => setFilterTraffic(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Traffic Levels</option>
              <option value="high">High Traffic</option>
              <option value="medium">Medium Traffic</option>
              <option value="low">Low Traffic</option>
            </select>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="seo_score">Sort by SEO Score</option>
              <option value="traffic">Sort by Traffic</option>
              <option value="title">Sort by Title</option>
            </select>

            <div className="ml-auto text-sm text-gray-600 dark:text-gray-400">
              {selectedTopics.size} topics selected
            </div>
          </div>
        </div>
      )}

      {/* Generating State */}
      {generating && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Generating topic suggestions...</p>
        </div>
      )}

      {/* Topics List */}
      {topics.length > 0 && !generating && (
        <div className="space-y-4">
          {filteredAndSortedTopics.map((topic) => (
            <div
              key={topic.id}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 p-6 transition-all cursor-pointer ${
                selectedTopics.has(topic.id)
                  ? 'border-purple-500 bg-purple-50 dark:bg-purple-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
              onClick={() => toggleTopicSelection(topic.id)}
            >
              <div className="flex items-start gap-4">
                <div className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center mt-1 ${
                  selectedTopics.has(topic.id)
                    ? 'border-purple-500 bg-purple-500'
                    : 'border-gray-300 dark:border-gray-600'
                }`}>
                  {selectedTopics.has(topic.id) && (
                    <CheckCircle2 className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between mb-2">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {topic.title}
                    </h3>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTrafficColor(topic.estimated_traffic)}`}>
                      {topic.estimated_traffic.toUpperCase()}
                    </span>
                  </div>
                  
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    <strong>Unique Angle:</strong> {topic.unique_angle}
                  </p>

                  <div className="flex flex-wrap items-center gap-4 text-sm mb-3">
                    <div className="flex items-center gap-1">
                      <Target className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">SEO Score: <strong>{topic.seo_score}</strong></span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600 dark:text-gray-400">Readability: <strong>{topic.readability_score}</strong></span>
                    </div>
                    <div className="text-gray-600 dark:text-gray-400">
                      Words: <strong>{topic.word_count_estimate.toLocaleString()}</strong>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Target Keywords:</div>
                    <div className="flex flex-wrap gap-2">
                      {topic.target_keywords.slice(0, 5).map((kw, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs"
                        >
                          {kw}
                        </span>
                      ))}
                      {topic.target_keywords.length > 5 && (
                        <span className="px-2 py-1 text-gray-500 text-xs">
                          +{topic.target_keywords.length - 5} more
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 dark:text-gray-400 italic">
                    {topic.reasoning}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {topics.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/admin/workflow/ideas')}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Content Ideas
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveTopics}
                disabled={loading || selectedTopics.size === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                Save Selected Topics ({selectedTopics.size})
              </button>
              <button
                onClick={() => router.push('/admin/workflow/strategy')}
                disabled={selectedTopics.size === 0}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
              >
                Continue to Strategy
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

