"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Layers, 
  ArrowRight, 
  ArrowLeft,
  Save,
  Edit,
  CheckCircle2,
  X,
  TrendingUp,
  Target,
  BarChart3
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Alert from '@/components/ui/alert/Alert';

interface KeywordCluster {
  cluster_id?: string;
  parent_topic: string;
  keywords: Array<{
    keyword: string;
    search_volume?: number;
    difficulty?: string;
    competition?: number;
  }>;
  cluster_metrics?: {
    total_volume: number;
    avg_difficulty: number;
    avg_competition: number;
    cluster_score: number;
  };
}

export default function ClustersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [workflowSession, setWorkflowSession] = useState<any>(null);
  const [keywordCollection, setKeywordCollection] = useState<any>(null);
  const [clusters, setClusters] = useState<KeywordCluster[]>([]);
  const [editingCluster, setEditingCluster] = useState<string | null>(null);
  const [editedTopicName, setEditedTopicName] = useState('');

  // Load workflow session and keyword collection
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        const supabase = createClient();
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        
        if (authError || !user) {
          setError('Please log in to access workflow data.');
          setLoading(false);
          return;
        }

        const sessionId = localStorage.getItem('workflow_session_id');
        if (!sessionId) {
          setError('No workflow session found. Please start a new workflow from the objective page.');
          setLoading(false);
          return;
        }

        console.log('🔍 Loading clusters for session:', sessionId);

        // Load workflow session with better error handling (use maybeSingle to avoid 406 errors)
        const { data: sessionData, error: sessionError } = await supabase
          .from('workflow_sessions')
          .select('*')
          .eq('session_id', sessionId)
          .maybeSingle();

        if (sessionError) {
          console.error('❌ Error loading session:', sessionError);
          
          // Handle specific error codes
          if (sessionError.code === 'PGRST116' || sessionError.code === '406') {
            // Session not found - clear localStorage and show helpful message
            localStorage.removeItem('workflow_session_id');
            setError('Workflow session not found. Please start a new workflow from the objective page.');
          } else if (sessionError.code === '42501' || sessionError.message?.includes('permission')) {
            setError('You do not have permission to access this workflow session. Please check your organization access.');
          } else if (sessionError.code === '42P01' || sessionError.message?.includes('does not exist')) {
            setError('Workflow tables are not set up. Please contact your administrator to run database migrations.');
          } else {
            setError(`Failed to load workflow session: ${sessionError.message || 'Unknown error'}. Please try refreshing the page.`);
          }
          setLoading(false);
          return;
        }

        if (!sessionData) {
          // Session doesn't exist - clear localStorage and show helpful message
          localStorage.removeItem('workflow_session_id');
          setError('Workflow session not found. Please start a new workflow from the objective page.');
          setLoading(false);
          return;
        }

        setWorkflowSession(sessionData);
        console.log('✅ Loaded workflow session:', sessionData.session_id);

        // Load keyword collection (without .single() to avoid error if none found)
        const { data: collectionData, error: collectionError } = await supabase
          .from('keyword_collections')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (collectionError) {
          // Handle specific error codes
          if (collectionError.code === 'PGRST116') {
            // No collection found - this is expected if user hasn't saved yet
            console.log('ℹ️ No keyword collection found yet - user needs to save keywords first');
            setKeywordCollection(null);
            setLoading(false);
            return;
          } else if (collectionError.code === '42501' || collectionError.message?.includes('permission')) {
            setError('You do not have permission to access keyword collections. Please check your organization access.');
            setLoading(false);
            return;
          } else if (collectionError.code === '42P01' || collectionError.message?.includes('does not exist')) {
            setError('Keyword collections table is not set up. Please contact your administrator to run database migrations.');
            setLoading(false);
            return;
          } else if (collectionError.code === '406' || collectionError.message?.includes('406')) {
            setError('Database configuration error (406). Please ensure keyword_collections table exists and RLS policies are configured.');
            setLoading(false);
            return;
          } else {
            console.error('❌ Unexpected error loading collection:', collectionError);
            setError(`Failed to load keyword collection: ${collectionError.message || 'Unknown error'}`);
            setLoading(false);
            return;
          }
        }

        const collection = collectionData && collectionData.length > 0 ? collectionData[0] : null;

        if (collection) {
          console.log('📋 Loaded keyword collection:', {
            collectionId: collection.collection_id,
            sessionId: collection.session_id,
            keywordCount: Array.isArray(collection.keywords) ? collection.keywords.length : 0,
            keywordsType: typeof collection.keywords,
            keywordsSample: Array.isArray(collection.keywords) ? collection.keywords.slice(0, 3) : collection.keywords
          });

          setKeywordCollection(collection);
          
          // Load existing clusters or generate from keywords
          const { data: existingClusters, error: clustersError } = await supabase
            .from('keyword_clusters')
            .select('*')
            .eq('session_id', sessionId)
            .order('created_at', { ascending: true });

          if (clustersError && clustersError.code !== 'PGRST116') {
            console.warn('⚠️ Error loading clusters (non-critical):', clustersError);
            // Don't fail completely - we can still generate clusters from keywords
          }

          if (existingClusters && existingClusters.length > 0) {
            console.log('✅ Loaded existing clusters:', existingClusters.length);
            setClusters(existingClusters.map(c => ({
              cluster_id: c.cluster_id,
              parent_topic: c.parent_topic,
              keywords: Array.isArray(c.keywords) ? c.keywords : [],
              cluster_metrics: c.cluster_metrics || {}
            })));
          } else if (collection.keywords) {
            // Ensure keywords is an array
            let keywordsArray: any[] = [];
            try {
              keywordsArray = Array.isArray(collection.keywords) 
                ? collection.keywords 
                : (typeof collection.keywords === 'string' ? JSON.parse(collection.keywords) : []);
            } catch (parseError) {
              console.error('❌ Error parsing keywords:', parseError);
              setError('Failed to parse keyword data. Please return to keyword research and save your keywords again.');
              setLoading(false);
              return;
            }
            
            if (keywordsArray.length > 0) {
              console.log('🔄 Generating clusters from keywords:', keywordsArray.length);
              generateClustersFromKeywords(keywordsArray);
            } else {
              console.warn('⚠️ Collection has no keywords array');
              setError('Keyword collection exists but contains no keywords. Please return to keyword research and save your keywords.');
            }
          } else {
            console.warn('⚠️ Collection has no keywords field');
            setError('Keyword collection exists but contains no keywords. Please return to keyword research and save your keywords.');
          }
        } else {
          console.log('ℹ️ No keyword collection found for session:', sessionId);
          // Don't set error here - let the empty state UI handle it
          setKeywordCollection(null);
        }
      } catch (error: any) {
        console.error('❌ Unexpected error loading data:', error);
        setError(`Failed to load clusters: ${error.message || 'Unknown error'}. Please try refreshing the page or contact support if the issue persists.`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Generate clusters from keywords
  const generateClustersFromKeywords = (keywords: any[]) => {
    if (!keywords || keywords.length === 0) {
      setClusters([]);
      return;
    }

    // Group keywords by parent topic
    const clusterMap = new Map<string, any[]>();
    
    keywords.forEach((kw: any) => {
      const keyword = typeof kw === 'string' ? kw : kw.keyword;
      const parentTopic = extractParentTopic(keyword);
      
      if (!clusterMap.has(parentTopic)) {
        clusterMap.set(parentTopic, []);
      }
      
      const keywordData = typeof kw === 'string' 
        ? { keyword, search_volume: 0, difficulty: 'medium', competition: 0.5 }
        : kw;
      
      clusterMap.get(parentTopic)!.push(keywordData);
    });

    // Convert to cluster objects with metrics
    const clusterArray: KeywordCluster[] = Array.from(clusterMap.entries()).map(([topic, kws]) => {
      const totalVolume = kws.reduce((sum: number, k: any) => sum + (k.search_volume || 0), 0);
      const avgDifficulty = kws.reduce((sum: number, k: any) => {
        const diff = k.difficulty === 'easy' ? 0.33 : k.difficulty === 'medium' ? 0.66 : 1.0;
        return sum + diff;
      }, 0) / kws.length;
      const avgCompetition = kws.reduce((sum: number, k: any) => sum + (k.competition || 0.5), 0) / kws.length;
      const clusterScore = calculateClusterScore(totalVolume, avgDifficulty, avgCompetition, kws.length);

      return {
        parent_topic: topic,
        keywords: kws,
        cluster_metrics: {
          total_volume: totalVolume,
          avg_difficulty: avgDifficulty,
          avg_competition: avgCompetition,
          cluster_score: clusterScore
        }
      };
    });

    // Sort by cluster score
    clusterArray.sort((a, b) => 
      (b.cluster_metrics?.cluster_score || 0) - (a.cluster_metrics?.cluster_score || 0)
    );
    
    setClusters(clusterArray);
  };

  // Extract parent topic from keyword
  const extractParentTopic = (keyword: string): string => {
    const words = keyword.toLowerCase().split(' ');
    const modifiers = ['near', 'me', 'best', 'top', 'how', 'to', 'what', 'is', 'the', 'a', 'an', 'for', 'with'];
    const meaningfulWords = words.filter(w => !modifiers.includes(w) && w.length > 2);
    
    if (meaningfulWords.length > 0) {
      return meaningfulWords[0].charAt(0).toUpperCase() + meaningfulWords[0].slice(1);
    }
    
    return keyword;
  };

  // Calculate cluster score
  const calculateClusterScore = (
    volume: number,
    difficulty: number,
    competition: number,
    keywordCount: number
  ): number => {
    const volumeScore = Math.min(volume / 100000, 1) * 40;
    const difficultyScore = (1 - difficulty) * 30;
    const competitionScore = (1 - competition) * 20;
    const countScore = Math.min(keywordCount / 20, 1) * 10;
    
    return volumeScore + difficultyScore + competitionScore + countScore;
  };

  // Save clusters
  const handleSaveClusters = async () => {
    if (clusters.length === 0) {
      setError('No clusters to save');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user || !workflowSession || !keywordCollection) {
        setError('Session not found');
        return;
      }

      const sessionId = workflowSession.session_id;
      const collectionId = keywordCollection.collection_id;

      // Delete existing clusters
      await supabase
        .from('keyword_clusters')
        .delete()
        .eq('session_id', sessionId);

      // Insert new clusters
      const clustersToInsert = clusters.map(cluster => ({
        session_id: sessionId,
        collection_id: collectionId,
        org_id: workflowSession.org_id,
        parent_topic: cluster.parent_topic,
        keywords: cluster.keywords,
        cluster_metrics: cluster.cluster_metrics
      }));

      const { error: insertError } = await supabase
        .from('keyword_clusters')
        .insert(clustersToInsert);

      if (insertError) throw insertError;

      // Update workflow session with clusters in workflow_data
      const workflowData = workflowSession.workflow_data || {};
      await supabase
        .from('workflow_sessions')
        .update({
          current_step: 'clusters',
          completed_steps: ['objective', 'keywords', 'clusters'],
          workflow_data: {
            ...workflowData,
            saved_clusters: clusters.map(c => ({
              parent_topic: c.parent_topic,
              keywords: c.keywords,
              cluster_metrics: c.cluster_metrics
            }))
          }
        })
        .eq('session_id', sessionId);

      setSuccess('Clusters saved successfully');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      console.error('Error saving clusters:', err);
      setError(err.message || 'Failed to save clusters');
    } finally {
      setLoading(false);
    }
  };

  // Edit cluster topic name
  const handleEditTopic = (clusterIndex: number) => {
    const cluster = clusters[clusterIndex];
    setEditingCluster(clusterIndex.toString());
    setEditedTopicName(cluster.parent_topic);
  };

  // Save edited topic name
  const handleSaveTopicEdit = () => {
    if (editingCluster === null) return;
    
    const index = parseInt(editingCluster);
    const updatedClusters = [...clusters];
    updatedClusters[index].parent_topic = editedTopicName;
    setClusters(updatedClusters);
    setEditingCluster(null);
    setEditedTopicName('');
  };

  // Cancel topic edit
  const handleCancelTopicEdit = () => {
    setEditingCluster(null);
    setEditedTopicName('');
  };

  // Remove keyword from cluster
  const handleRemoveKeyword = (clusterIndex: number, keywordIndex: number) => {
    const updatedClusters = [...clusters];
    updatedClusters[clusterIndex].keywords.splice(keywordIndex, 1);
    
    // Recalculate metrics
    const cluster = updatedClusters[clusterIndex];
    const kws = cluster.keywords;
    const totalVolume = kws.reduce((sum, k) => sum + (k.search_volume || 0), 0);
    const avgDifficulty = kws.reduce((sum, k) => {
      const diff = k.difficulty === 'easy' ? 0.33 : k.difficulty === 'medium' ? 0.66 : 1.0;
      return sum + diff;
    }, 0) / kws.length;
    const avgCompetition = kws.reduce((sum, k) => sum + (k.competition || 0.5), 0) / kws.length;
    const clusterScore = calculateClusterScore(totalVolume, avgDifficulty, avgCompetition, kws.length);
    
    cluster.cluster_metrics = {
      total_volume: totalVolume,
      avg_difficulty: avgDifficulty,
      avg_competition: avgCompetition,
      cluster_score: clusterScore
    };
    
    setClusters(updatedClusters);
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
            <Layers className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Keyword Clustering
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Group keywords from your saved research into semantic clusters for better content organization
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

      {/* Loading State */}
      {loading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading workflow data...</p>
        </div>
      )}

      {/* Empty State - No Collection */}
      {!loading && clusters.length === 0 && !keywordCollection && !error && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Layers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No keyword collection found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You need to search and save keywords first before clustering them.
          </p>
          <div className="text-left max-w-md mx-auto bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-6">
            <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 font-medium">Follow these steps:</p>
            <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <li>Go to <strong>Keyword Research</strong> tab</li>
              <li>Search for keywords in your niche</li>
              <li>Select keywords you want to use</li>
              <li>Click <strong>&quot;Save Collection&quot;</strong> button</li>
              <li>Return here to cluster them</li>
            </ol>
          </div>
          <button
            onClick={() => router.push('/admin/workflow/keywords')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            Go to Keyword Research
          </button>
        </div>
      )}

      {/* Empty State - Collection exists but no clusters */}
      {!loading && clusters.length === 0 && keywordCollection && !error && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Layers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            Ready to cluster keywords
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your keyword collection has been loaded. Clusters will be generated automatically.
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            If clusters don&apos;t appear, please refresh the page or return to keyword research to verify your keywords were saved correctly.
          </p>
        </div>
      )}

      {/* Clusters List */}
      {clusters.length > 0 && (
        <div className="space-y-6">
          {clusters.map((cluster, clusterIndex) => (
            <div
              key={clusterIndex}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              {/* Cluster Header */}
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  {editingCluster === clusterIndex.toString() ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editedTopicName}
                        onChange={(e) => setEditedTopicName(e.target.value)}
                        className="text-lg font-semibold px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        autoFocus
                      />
                      <button
                        onClick={handleSaveTopicEdit}
                        className="p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded"
                      >
                        <CheckCircle2 className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleCancelTopicEdit}
                        className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {cluster.parent_topic}
                      </h3>
                      <button
                        onClick={() => handleEditTopic(clusterIndex)}
                        className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {cluster.keywords.length} keywords
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Cluster Score</div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {cluster.cluster_metrics?.cluster_score.toFixed(1) || '0.0'}
                  </div>
                </div>
              </div>

              {/* Cluster Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4 p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Total Volume
                  </div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {cluster.cluster_metrics?.total_volume.toLocaleString() || 0}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    Avg Difficulty
                  </div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {cluster.cluster_metrics?.avg_difficulty 
                      ? (cluster.cluster_metrics.avg_difficulty < 0.4 
                          ? 'Easy' 
                          : cluster.cluster_metrics.avg_difficulty < 0.7 
                          ? 'Medium' 
                          : 'Hard')
                      : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                    <BarChart3 className="w-3 h-3" />
                    Avg Competition
                  </div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {cluster.cluster_metrics?.avg_competition 
                      ? `${(cluster.cluster_metrics.avg_competition * 100).toFixed(0)}%`
                      : '-'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Keywords</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {cluster.keywords.length}
                  </div>
                </div>
              </div>

              {/* Keywords List */}
              <div className="flex flex-wrap gap-2">
                {cluster.keywords.map((kw, kwIndex) => (
                  <div
                    key={kwIndex}
                    className="group relative px-3 py-2 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 flex items-center gap-2"
                  >
                    <span>
                      {typeof kw === 'string' ? kw : kw.keyword}
                      {typeof kw !== 'string' && kw.search_volume && (
                        <span className="ml-2 text-xs text-gray-500">
                          ({kw.search_volume.toLocaleString()})
                        </span>
                      )}
                    </span>
                    <button
                      onClick={() => handleRemoveKeyword(clusterIndex, kwIndex)}
                      className="opacity-0 group-hover:opacity-100 p-0.5 text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Actions */}
      {clusters.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-6">
          <div className="flex items-center justify-between">
            <button
              onClick={() => router.push('/admin/workflow/keywords')}
              className="flex items-center gap-2 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Keywords
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveClusters}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white rounded-lg transition-colors"
              >
                <Save className="w-4 h-4" />
                Save Clusters
              </button>
              <button
                onClick={() => router.push('/admin/workflow/ideas')}
                disabled={clusters.length === 0}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
              >
                Continue to Content Ideas
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

