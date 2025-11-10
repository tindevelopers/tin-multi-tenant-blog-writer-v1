"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Lightbulb, 
  ArrowRight, 
  ArrowLeft,
  Bookmark,
  Sparkles,
  TrendingUp,
  Target,
  Star
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Alert from '@/components/ui/alert/Alert';

interface ContentIdea {
  id: string;
  title: string;
  cluster_topic: string;
  content_angle: string;
  target_keywords: string[];
  estimated_traffic: 'low' | 'medium' | 'high';
  seo_score: number;
  content_type: 'blog_post' | 'guide' | 'list' | 'tutorial' | 'comparison';
  word_count_estimate: number;
  saved?: boolean;
}

export default function ContentIdeasPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [workflowSession, setWorkflowSession] = useState<any>(null);
  const [clusters, setClusters] = useState<any[]>([]);
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [savedIdeas, setSavedIdeas] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<string>('all');
  const [filterTraffic, setFilterTraffic] = useState<string>('all');

  // Load workflow session and clusters
  useEffect(() => {
    const loadData = async () => {
      try {
        const supabase = createClient();
        const sessionId = localStorage.getItem('workflow_session_id');
        
        if (sessionId) {
          // Load workflow session
          const { data: session } = await supabase
            .from('workflow_sessions')
            .select('*')
            .eq('session_id', sessionId)
            .single();

          if (session) {
            setWorkflowSession(session);
          }

          // Load clusters
          const { data: clusterData } = await supabase
            .from('keyword_clusters')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

          if (clusterData && clusterData.length > 0) {
            setClusters(clusterData);
            // Auto-generate ideas if none exist
            generateContentIdeas(clusterData);
          } else {
            setError('No keyword clusters found. Please complete clustering first.');
          }
        }
      } catch (error) {
        console.error('Error loading data:', error);
        setError('Failed to load content ideas');
      }
    };

    loadData();
  }, []);

  // Generate content ideas from clusters
  const generateContentIdeas = async (clusterList: any[]) => {
    setGenerating(true);
    try {
      const generatedIdeas: ContentIdea[] = [];

      clusterList.forEach((cluster, index) => {
        const topic = cluster.parent_topic;
        const keywords = Array.isArray(cluster.keywords) 
          ? cluster.keywords.map((k: any) => typeof k === 'string' ? k : k.keyword)
          : [];
        
        const primaryKeyword = keywords[0] || topic.toLowerCase();

        // Generate multiple ideas per cluster
        const ideasForCluster = [
          {
            id: `idea-${index}-1`,
            title: `The Ultimate Guide to ${topic}`,
            cluster_topic: topic,
            content_angle: 'Comprehensive guide covering all aspects',
            target_keywords: keywords.slice(0, 5),
            estimated_traffic: 'high' as const,
            seo_score: 85,
            content_type: 'guide' as const,
            word_count_estimate: 3000
          },
          {
            id: `idea-${index}-2`,
            title: `10 Best ${topic} Tips for Beginners`,
            cluster_topic: topic,
            content_angle: 'Listicle format for easy consumption',
            target_keywords: keywords.slice(0, 3),
            estimated_traffic: 'medium' as const,
            seo_score: 75,
            content_type: 'list' as const,
            word_count_estimate: 1500
          },
          {
            id: `idea-${index}-3`,
            title: `How to ${primaryKeyword}: Step-by-Step Tutorial`,
            cluster_topic: topic,
            content_angle: 'Tutorial format with actionable steps',
            target_keywords: keywords.slice(0, 4),
            estimated_traffic: 'high' as const,
            seo_score: 80,
            content_type: 'tutorial' as const,
            word_count_estimate: 2000
          },
          {
            id: `idea-${index}-4`,
            title: `${topic} vs Alternatives: Complete Comparison`,
            cluster_topic: topic,
            content_angle: 'Comparison format to help decision-making',
            target_keywords: keywords.slice(0, 3),
            estimated_traffic: 'medium' as const,
            seo_score: 70,
            content_type: 'comparison' as const,
            word_count_estimate: 2500
          }
        ];

        generatedIdeas.push(...ideasForCluster);
      });

      setIdeas(generatedIdeas);
      setSuccess(`Generated ${generatedIdeas.length} content ideas`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error generating ideas:', err);
      setError(err.message || 'Failed to generate content ideas');
    } finally {
      setGenerating(false);
    }
  };

  // Toggle idea save status
  const toggleIdeaSave = (ideaId: string) => {
    const newSaved = new Set(savedIdeas);
    if (newSaved.has(ideaId)) {
      newSaved.delete(ideaId);
    } else {
      newSaved.add(ideaId);
    }
    setSavedIdeas(newSaved);
  };

  // Save ideas to workflow
  const handleSaveIdeas = async () => {
    if (savedIdeas.size === 0) {
      setError('Please select at least one idea to save');
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

      const savedIdeasList = ideas.filter(i => savedIdeas.has(i.id));

      // Update workflow session with saved ideas
      await supabase
        .from('workflow_sessions')
        .update({
          current_step: 'ideas',
          completed_steps: ['objective', 'keywords', 'clusters', 'ideas'],
          workflow_data: {
            ...workflowSession.workflow_data,
            saved_content_ideas: savedIdeasList
          }
        })
        .eq('session_id', sessionId);

      setSuccess('Content ideas saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving ideas:', err);
      setError(err.message || 'Failed to save content ideas');
    } finally {
      setLoading(false);
    }
  };

  // Filter ideas
  const filteredIdeas = ideas.filter(idea => {
    if (filterType !== 'all' && idea.content_type !== filterType) return false;
    if (filterTraffic !== 'all' && idea.estimated_traffic !== filterTraffic) return false;
    return true;
  });

  const getContentTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      blog_post: 'Blog Post',
      guide: 'Guide',
      list: 'List',
      tutorial: 'Tutorial',
      comparison: 'Comparison'
    };
    return labels[type] || type;
  };

  const getTrafficColor = (traffic: string) => {
    const colors: Record<string, string> = {
      high: 'text-green-600 dark:text-green-400',
      medium: 'text-yellow-600 dark:text-yellow-400',
      low: 'text-gray-600 dark:text-gray-400'
    };
    return colors[traffic] || '';
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/20 rounded-lg flex items-center justify-center">
            <Lightbulb className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Content Ideas Generator
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Generate creative content ideas based on your saved keyword research and target audience
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
      {clusters.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Lightbulb className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No keyword sets found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You need saved keyword sets to generate content ideas.
          </p>
          <div className="text-left max-w-md mx-auto bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2">Follow these steps:</p>
            <ol className="list-decimal list-inside space-y-1 text-sm text-gray-600 dark:text-gray-400">
              <li>Go to <strong>Keyword Research</strong> tab</li>
              <li>Search and save keyword sets</li>
              <li>Complete <strong>Clustering</strong> step</li>
              <li>Return here to generate content ideas</li>
            </ol>
          </div>
          <button
            onClick={() => router.push('/admin/workflow/clusters')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Go to Clustering
          </button>
        </div>
      )}

      {/* Filters */}
      {ideas.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-4 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Types</option>
              <option value="guide">Guides</option>
              <option value="list">Lists</option>
              <option value="tutorial">Tutorials</option>
              <option value="comparison">Comparisons</option>
              <option value="blog_post">Blog Posts</option>
            </select>

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

            <div className="ml-auto text-sm text-gray-600 dark:text-gray-400">
              {savedIdeas.size} ideas selected
            </div>
          </div>
        </div>
      )}

      {/* Generating State */}
      {generating && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Generating content ideas...</p>
        </div>
      )}

      {/* Ideas Grid */}
      {ideas.length > 0 && !generating && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredIdeas.map((idea) => (
            <div
              key={idea.id}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border-2 p-6 transition-all ${
                savedIdeas.has(idea.id)
                  ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                    {idea.title}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
                    {idea.content_angle}
                  </p>
                </div>
                <button
                  onClick={() => toggleIdeaSave(idea.id)}
                  className={`p-2 rounded-lg transition-colors ${
                    savedIdeas.has(idea.id)
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'
                  }`}
                >
                  <Bookmark className={`w-5 h-5 ${savedIdeas.has(idea.id) ? 'fill-current' : ''}`} />
                </button>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-4 text-sm">
                  <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 rounded">
                    {getContentTypeLabel(idea.content_type)}
                  </span>
                  <span className={`font-medium ${getTrafficColor(idea.estimated_traffic)}`}>
                    {idea.estimated_traffic.toUpperCase()} Traffic
                  </span>
                  <span className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                    <Star className="w-4 h-4" />
                    SEO: {idea.seo_score}
                  </span>
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-400">
                  <div className="font-medium mb-1">Target Keywords:</div>
                  <div className="flex flex-wrap gap-2">
                    {idea.target_keywords.map((kw, idx) => (
                      <span
                        key={idx}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs"
                      >
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="text-sm text-gray-600 dark:text-gray-400">
                  Estimated word count: <strong>{idea.word_count_estimate.toLocaleString()}</strong>
                </div>

                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Cluster: {idea.cluster_topic}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {ideas.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/admin/workflow/clusters')}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Clusters
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveIdeas}
                disabled={loading || savedIdeas.size === 0}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                <Bookmark className="w-4 h-4" />
                Save Selected Ideas ({savedIdeas.size})
              </button>
              <button
                onClick={() => router.push('/admin/workflow/topics')}
                disabled={savedIdeas.size === 0}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
              >
                Continue to Topic Suggestions
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

