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
  BarChart3,
  Plus,
  Trash2,
  Link as LinkIcon,
  FileText,
  BookOpen,
  Sparkles
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import Alert from '@/components/ui/alert/Alert';
import { KeywordDifficultyAnalyzer } from '@/components/keyword-research/KeywordDifficultyAnalyzer';
import { Modal } from '@/components/ui/modal';

// Topic Cluster Model Types
interface PillarPage {
  pillar_id?: string;
  title: string;
  description: string;
  primary_keyword: string;
  target_word_count: number; // 3000-5000+ words
  keywords: Array<{
    keyword: string;
    search_volume?: number;
    difficulty?: string;
    competition?: number;
  }>;
  cluster_articles: string[]; // References to cluster_article IDs
  internal_links: Array<{
    anchor_text: string;
    target_cluster_id: string;
  }>;
  metrics?: {
    total_volume: number;
    avg_difficulty: number;
    avg_competition: number;
    cluster_score: number;
  };
}

interface ClusterArticle {
  cluster_id?: string;
  pillar_id?: string; // Links to pillar page
  title: string;
  description: string;
  primary_keyword: string;
  target_word_count: number; // 1500-2500 words
  keywords: Array<{
    keyword: string;
    search_volume?: number;
    difficulty?: string;
    competition?: number;
  }>;
  related_clusters: string[]; // Links to other cluster articles
  metrics?: {
    total_volume: number;
    avg_difficulty: number;
    avg_competition: number;
    cluster_score: number;
  };
}

interface TopicClusterModel {
  pillar_pages: PillarPage[];
  cluster_articles: ClusterArticle[];
}

export default function ClustersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [workflowSession, setWorkflowSession] = useState<any>(null);
  const [keywordCollection, setKeywordCollection] = useState<any>(null);
  const [topicClusters, setTopicClusters] = useState<TopicClusterModel>({
    pillar_pages: [],
    cluster_articles: []
  });
  
  // UI State
  const [showCreatePillarModal, setShowCreatePillarModal] = useState(false);
  const [showCreateClusterModal, setShowCreateClusterModal] = useState(false);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [editingPillar, setEditingPillar] = useState<string | null>(null);
  const [editingCluster, setEditingCluster] = useState<string | null>(null);
  const [selectedPillarForCluster, setSelectedPillarForCluster] = useState<string | null>(null);
  
  // Form state for creating/editing
  const [pillarForm, setPillarForm] = useState({
    title: '',
    description: '',
    primary_keyword: '',
    target_word_count: 3000,
    selectedKeywords: [] as string[]
  });
  
  const [clusterForm, setClusterForm] = useState({
    title: '',
    description: '',
    primary_keyword: '',
    target_word_count: 2000,
    pillar_id: '',
    selectedKeywords: [] as string[]
  });

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

        // Load workflow session
        const { data: sessionData, error: sessionError } = await supabase
          .from('workflow_sessions')
          .select('*')
          .eq('session_id', sessionId)
          .maybeSingle();

        if (sessionError || !sessionData) {
          setError('Workflow session not found. Please start a new workflow.');
          setLoading(false);
          return;
        }

        setWorkflowSession(sessionData);

        // Load keyword collection
        const { data: collectionData, error: collectionError } = await supabase
          .from('keyword_collections')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false })
          .limit(1);

        if (collectionError || !collectionData || collectionData.length === 0) {
          setError('No keyword collection found. Please save keywords first.');
          setLoading(false);
          return;
        }

        const collection = collectionData[0];
        setKeywordCollection(collection);

        // Load existing clusters (convert to Topic Cluster Model)
        const { data: existingClusters, error: clustersError } = await supabase
          .from('keyword_clusters')
          .select('*')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: true });

        if (clustersError && clustersError.code !== 'PGRST116') {
          console.warn('Error loading clusters:', clustersError);
        }

        if (existingClusters && existingClusters.length > 0) {
          // Convert existing clusters to Topic Cluster Model
          const pillars: PillarPage[] = [];
          const clusters: ClusterArticle[] = [];
          
          existingClusters.forEach((c: any) => {
            // Extract cluster type from cluster_metrics or default
            const clusterMetrics = c.cluster_metrics || {};
            const clusterType = clusterMetrics.cluster_type || 'supporting';
            const title = c.parent_topic || 'Untitled';
            
            if (clusterType === 'pillar') {
              pillars.push({
                pillar_id: c.cluster_id,
                title: title,
                description: clusterMetrics.description || '',
                primary_keyword: clusterMetrics.primary_keyword || title,
                target_word_count: clusterMetrics.target_word_count || 3000,
                keywords: Array.isArray(c.keywords) ? c.keywords : [],
                cluster_articles: clusterMetrics.cluster_articles || [],
                internal_links: clusterMetrics.internal_links || [],
                metrics: {
                  total_volume: clusterMetrics.total_volume || 0,
                  avg_difficulty: clusterMetrics.avg_difficulty || 0.5,
                  avg_competition: clusterMetrics.avg_competition || 0.5,
                  cluster_score: clusterMetrics.cluster_score || 0
                }
              });
            } else {
              clusters.push({
                cluster_id: c.cluster_id,
                pillar_id: clusterMetrics.pillar_id || null,
                title: title,
                description: clusterMetrics.description || '',
                primary_keyword: clusterMetrics.primary_keyword || title,
                target_word_count: clusterMetrics.target_word_count || 2000,
                keywords: Array.isArray(c.keywords) ? c.keywords : [],
                related_clusters: clusterMetrics.related_clusters || [],
                metrics: {
                  total_volume: clusterMetrics.total_volume || 0,
                  avg_difficulty: clusterMetrics.avg_difficulty || 0.5,
                  avg_competition: clusterMetrics.avg_competition || 0.5,
                  cluster_score: clusterMetrics.cluster_score || 0
                }
              });
            }
          });
          
          setTopicClusters({ pillar_pages: pillars, cluster_articles: clusters });
        } else if (collection.keywords) {
          // Generate initial clusters from keywords
          let keywordsArray: any[] = [];
          try {
            keywordsArray = Array.isArray(collection.keywords) 
              ? collection.keywords 
              : (typeof collection.keywords === 'string' ? JSON.parse(collection.keywords) : []);
          } catch (parseError) {
            console.error('Error parsing keywords:', parseError);
            setError('Failed to parse keyword data.');
            setLoading(false);
            return;
          }
          
          if (keywordsArray.length > 0) {
            // Auto-generate clusters (user can convert to pillars later)
            generateInitialClusters(keywordsArray);
          }
        }
      } catch (error: any) {
        console.error('Error loading data:', error);
        setError(`Failed to load clusters: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Generate initial clusters from keywords
  // Use API-provided parent_topic if available, otherwise use full keyword phrase as title
  const generateInitialClusters = (keywords: any[]) => {
    const clusterMap = new Map<string, any[]>();
    
    keywords.forEach((kw: any) => {
      const keyword = typeof kw === 'string' ? kw : kw.keyword;
      // Use API-provided parent_topic if available, otherwise use the full keyword phrase
      // This ensures we preserve the full ranking phrase instead of parsing to single words
      const parentTopic = (typeof kw === 'object' && kw.parent_topic) 
        ? kw.parent_topic 
        : keyword; // Use full keyword phrase as cluster title
      
      if (!clusterMap.has(parentTopic)) {
        clusterMap.set(parentTopic, []);
      }
      
      const keywordData = typeof kw === 'string' 
        ? { keyword, search_volume: 0, difficulty: 'medium', competition: 0.5 }
        : kw;
      
      clusterMap.get(parentTopic)!.push(keywordData);
    });

    const clusterArticles: ClusterArticle[] = Array.from(clusterMap.entries()).map(([topic, kws]) => {
      const totalVolume = kws.reduce((sum: number, k: any) => sum + (k.search_volume || 0), 0);
      const avgDifficulty = kws.reduce((sum: number, k: any) => {
        const diff = k.difficulty === 'easy' ? 0.33 : k.difficulty === 'medium' ? 0.66 : 1.0;
        return sum + diff;
      }, 0) / kws.length;
      const avgCompetition = kws.reduce((sum: number, k: any) => sum + (k.competition || 0.5), 0) / kws.length;
      const clusterScore = calculateClusterScore(totalVolume, avgDifficulty, avgCompetition, kws.length);
      
      // Use the primary keyword (first keyword in cluster) as the title
      // This ensures we show the full ranking phrase
      const primaryKeyword = kws[0]?.keyword || topic;
      const clusterTitle = primaryKeyword; // Use full keyword phrase as title

      return {
        title: clusterTitle, // Full keyword phrase, not parsed single word
        description: `Content cluster for ${primaryKeyword}`,
        primary_keyword: primaryKeyword,
        target_word_count: 2000,
        keywords: kws,
        related_clusters: [],
        metrics: {
          total_volume: totalVolume,
          avg_difficulty: avgDifficulty,
          avg_competition: avgCompetition,
          cluster_score: clusterScore
        }
      };
    });

    setTopicClusters({
      pillar_pages: [],
      cluster_articles: clusterArticles.sort((a, b) => 
        (b.metrics?.cluster_score || 0) - (a.metrics?.cluster_score || 0)
      )
    });
  };

  const extractParentTopic = (keyword: string): string => {
    const words = keyword.toLowerCase().split(' ');
    const modifiers = ['near', 'me', 'best', 'top', 'how', 'to', 'what', 'is', 'the', 'a', 'an', 'for', 'with'];
    const meaningfulWords = words.filter(w => !modifiers.includes(w) && w.length > 2);
    
    if (meaningfulWords.length > 0) {
      return meaningfulWords[0].charAt(0).toUpperCase() + meaningfulWords[0].slice(1);
    }
    
    return keyword;
  };

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

  // Create Pillar Page
  const handleCreatePillar = () => {
    if (!pillarForm.title || !pillarForm.primary_keyword) {
      setError('Title and primary keyword are required');
      return;
    }

    const newPillar: PillarPage = {
      title: pillarForm.title,
      description: pillarForm.description,
      primary_keyword: pillarForm.primary_keyword,
      target_word_count: pillarForm.target_word_count,
      keywords: pillarForm.selectedKeywords.map(kw => {
        // Find keyword data from collection
        const kwData = findKeywordData(kw);
        return kwData || { keyword: kw, search_volume: 0, difficulty: 'medium', competition: 0.5 };
      }),
      cluster_articles: [],
      internal_links: [],
      metrics: calculatePillarMetrics(pillarForm.selectedKeywords)
    };

    setTopicClusters(prev => ({
      ...prev,
      pillar_pages: [...prev.pillar_pages, newPillar]
    }));

    setShowCreatePillarModal(false);
    setPillarForm({
      title: '',
      description: '',
      primary_keyword: '',
      target_word_count: 3000,
      selectedKeywords: []
    });
  };

  // Create Cluster Article
  const handleCreateCluster = () => {
    // Use primary_keyword as title if title is empty, or use title if provided
    const clusterTitle = clusterForm.title || clusterForm.primary_keyword;
    const clusterPrimaryKeyword = clusterForm.primary_keyword || clusterForm.selectedKeywords[0] || '';
    
    if (!clusterTitle || !clusterPrimaryKeyword) {
      setError('Title and primary keyword are required');
      return;
    }

    const newCluster: ClusterArticle = {
      pillar_id: clusterForm.pillar_id || undefined,
      title: clusterTitle,
      description: clusterForm.description,
      primary_keyword: clusterPrimaryKeyword,
      target_word_count: clusterForm.target_word_count,
      keywords: clusterForm.selectedKeywords.map(kw => {
        const kwData = findKeywordData(kw);
        return kwData || { keyword: kw, search_volume: 0, difficulty: 'medium', competition: 0.5 };
      }),
      related_clusters: [],
      metrics: calculateClusterMetrics(clusterForm.selectedKeywords)
    };

    setTopicClusters(prev => ({
      ...prev,
      cluster_articles: [...prev.cluster_articles, newCluster]
    }));

    // Link cluster to pillar if selected
    if (clusterForm.pillar_id) {
      setTopicClusters(prev => ({
        ...prev,
        pillar_pages: prev.pillar_pages.map(p => 
          p.pillar_id === clusterForm.pillar_id
            ? { ...p, cluster_articles: [...(p.cluster_articles || []), newCluster.cluster_id || 'temp'] }
            : p
        )
      }));
    }

    setShowCreateClusterModal(false);
    setClusterForm({
      title: '',
      description: '',
      primary_keyword: '',
      target_word_count: 2000,
      pillar_id: '',
      selectedKeywords: []
    });
  };

  const findKeywordData = (keyword: string): any => {
    if (!keywordCollection?.keywords) return null;
    const keywords = Array.isArray(keywordCollection.keywords) 
      ? keywordCollection.keywords 
      : [];
    return keywords.find((kw: any) => 
      (typeof kw === 'string' ? kw : kw.keyword) === keyword
    );
  };

  const calculatePillarMetrics = (keywords: string[]) => {
    const kwData = keywords.map(findKeywordData).filter(Boolean);
    const totalVolume = kwData.reduce((sum: number, k: any) => sum + (k.search_volume || 0), 0);
    const avgDifficulty = kwData.reduce((sum: number, k: any) => {
      const diff = k.difficulty === 'easy' ? 0.33 : k.difficulty === 'medium' ? 0.66 : 1.0;
      return sum + diff;
    }, 0) / (kwData.length || 1);
    const avgCompetition = kwData.reduce((sum: number, k: any) => sum + (k.competition || 0.5), 0) / (kwData.length || 1);
    
    return {
      total_volume: totalVolume,
      avg_difficulty: avgDifficulty,
      avg_competition: avgCompetition,
      cluster_score: calculateClusterScore(totalVolume, avgDifficulty, avgCompetition, keywords.length)
    };
  };

  const calculateClusterMetrics = (keywords: string[]) => {
    return calculatePillarMetrics(keywords);
  };

  // Convert Cluster Article to Pillar Page
  const handleConvertToPillar = (clusterIndex: number) => {
    const cluster = topicClusters.cluster_articles[clusterIndex];
    const newPillar: PillarPage = {
      title: cluster.title,
      description: cluster.description,
      primary_keyword: cluster.primary_keyword,
      target_word_count: 3000, // Pillars need more words
      keywords: cluster.keywords,
      cluster_articles: [],
      internal_links: [],
      metrics: cluster.metrics
    };

    setTopicClusters(prev => ({
      pillar_pages: [...prev.pillar_pages, newPillar],
      cluster_articles: prev.cluster_articles.filter((_, i) => i !== clusterIndex)
    }));
  };

  // Save clusters
  const handleSaveClusters = async () => {
    if (topicClusters.pillar_pages.length === 0 && topicClusters.cluster_articles.length === 0) {
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

          // Insert pillar pages
          // Note: Using cluster_name for newer schema, parent_topic for older schema compatibility
          const pillarsToInsert = topicClusters.pillar_pages.map((pillar, index) => ({
            session_id: sessionId,
            collection_id: collectionId,
            org_id: workflowSession.org_id,
            cluster_type: 'pillar',
            cluster_name: pillar.title, // New schema
            parent_topic: pillar.title, // Old schema compatibility
            primary_keyword: pillar.primary_keyword,
            description: pillar.description,
            target_word_count: pillar.target_word_count,
            keywords: pillar.keywords,
            cluster_articles: pillar.cluster_articles,
            internal_links: pillar.internal_links,
            cluster_metrics: pillar.metrics,
            keyword_count: pillar.keywords.length,
            total_search_volume: pillar.metrics?.total_volume || 0,
            avg_difficulty: pillar.metrics?.avg_difficulty ? Math.round(pillar.metrics.avg_difficulty * 100) : null,
            authority_potential: pillar.metrics?.cluster_score ? Math.round(pillar.metrics.cluster_score) : null
          }));

          // Insert cluster articles
          const clustersToInsert = topicClusters.cluster_articles.map((cluster) => ({
            session_id: sessionId,
            collection_id: collectionId,
            org_id: workflowSession.org_id,
            cluster_type: 'supporting', // Use 'supporting' for cluster articles
            cluster_name: cluster.title, // New schema
            parent_topic: cluster.title, // Old schema compatibility
            primary_keyword: cluster.primary_keyword,
            description: cluster.description,
            target_word_count: cluster.target_word_count,
            pillar_id: cluster.pillar_id || null,
            keywords: cluster.keywords,
            related_clusters: cluster.related_clusters,
            cluster_metrics: cluster.metrics,
            keyword_count: cluster.keywords.length,
            total_search_volume: cluster.metrics?.total_volume || 0,
            avg_difficulty: cluster.metrics?.avg_difficulty ? Math.round(cluster.metrics.avg_difficulty * 100) : null,
            authority_potential: cluster.metrics?.cluster_score ? Math.round(cluster.metrics.cluster_score) : null
          }));

      const { error: insertError } = await supabase
        .from('keyword_clusters')
        .insert([...pillarsToInsert, ...clustersToInsert]);

      if (insertError) throw insertError;

      // Update workflow session
      const workflowData = workflowSession.workflow_data || {};
      await supabase
        .from('workflow_sessions')
        .update({
          current_step: 'clusters',
          completed_steps: ['objective', 'keywords', 'clusters'],
          workflow_data: {
            ...workflowData,
            topic_cluster_model: {
              pillar_pages: topicClusters.pillar_pages,
              cluster_articles: topicClusters.cluster_articles
            }
          },
          updated_at: new Date().toISOString()
        })
        .eq('session_id', sessionId);

      setSuccess('Topic clusters saved successfully');
      setShowSaveModal(true);
      setTimeout(() => {
        setSuccess(null);
        setShowSaveModal(false);
      }, 3000);
    } catch (err: any) {
      console.error('Error saving clusters:', err);
      setError(err.message || 'Failed to save clusters');
    } finally {
      setLoading(false);
    }
  };

  // Get available keywords for selection
  const getAvailableKeywords = (): string[] => {
    if (!keywordCollection?.keywords) return [];
    const keywords = Array.isArray(keywordCollection.keywords) 
      ? keywordCollection.keywords 
      : [];
    return keywords.map((kw: any) => typeof kw === 'string' ? kw : kw.keyword);
  };

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/20 rounded-lg flex items-center justify-center">
            <Layers className="w-6 h-6 text-purple-600 dark:text-purple-400" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Topic Cluster Model
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Build a pillar-cluster content strategy: Create comprehensive pillar pages and supporting cluster articles
            </p>
          </div>
        </div>

        {/* Info Box */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Topic Cluster Model Strategy
              </h3>
              <ul className="text-sm text-blue-800 dark:text-blue-200 space-y-1 list-disc list-inside">
                <li><strong>Pillar Pages:</strong> Comprehensive guides (3,000-5,000+ words) targeting high-volume keywords</li>
                <li><strong>Cluster Articles:</strong> Specific subtopics (1,500-2,500 words) targeting long-tail keywords</li>
                <li><strong>Internal Linking:</strong> Pillar links to clusters, clusters link back to pillar</li>
                <li><strong>Topic Authority:</strong> Establishes expertise on entire topic, not just individual keywords</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="mb-6">
          <Alert variant="error" title="Error" message={error} />
        </div>
      )}
      {success && (
        <div className="mb-6">
          <Alert variant="success" title="Success" message={success} />
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading workflow data...</p>
        </div>
      )}

      {/* Empty State */}
      {!loading && topicClusters.pillar_pages.length === 0 && topicClusters.cluster_articles.length === 0 && !keywordCollection && !error && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Layers className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No keyword collection found
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            You need to search and save keywords first before creating topic clusters.
          </p>
          <button
            onClick={() => router.push('/admin/workflow/keywords')}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
          >
            Go to Keyword Research
          </button>
        </div>
      )}

      {/* Action Buttons */}
      {keywordCollection && !loading && (
        <div className="flex gap-3 mb-6">
          <button
            onClick={() => setShowCreatePillarModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            <Sparkles className="w-4 h-4" />
            Create Pillar Page
          </button>
          <button
            onClick={() => setShowCreateClusterModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Cluster Article
          </button>
        </div>
      )}

      {/* Pillar Pages Section */}
      {topicClusters.pillar_pages.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Pillar Pages ({topicClusters.pillar_pages.length})
            </h2>
          </div>
          <div className="space-y-4">
            {topicClusters.pillar_pages.map((pillar, index) => (
              <div
                key={index}
                className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Sparkles className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                      <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                        {pillar.primary_keyword || pillar.title}
                      </h3>
                      <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-semibold rounded">
                        PILLAR
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      {pillar.description || `Comprehensive guide covering ${pillar.primary_keyword}`}
                    </p>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span><strong>Title:</strong> {pillar.title || pillar.primary_keyword}</span>
                      <span><strong>Primary Keyword:</strong> {pillar.primary_keyword}</span>
                      <span><strong>Target Words:</strong> {pillar.target_word_count.toLocaleString()}</span>
                      <span><strong>Linked Clusters:</strong> {pillar.cluster_articles.length}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-gray-600 dark:text-gray-400">Cluster Score</div>
                    <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                      {pillar.metrics?.cluster_score.toFixed(1) || '0.0'}
                    </div>
                  </div>
                </div>

                {/* Keywords */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {pillar.keywords.slice(0, 10).map((kw, kwIndex) => (
                    <span
                      key={kwIndex}
                      className="px-2 py-1 bg-white dark:bg-gray-800 rounded text-xs text-gray-700 dark:text-gray-300"
                    >
                      {typeof kw === 'string' ? kw : kw.keyword}
                    </span>
                  ))}
                  {pillar.keywords.length > 10 && (
                    <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400">
                      +{pillar.keywords.length - 10} more
                    </span>
                  )}
                </div>

                {/* Difficulty Analysis */}
                <div className="mt-4">
                  <KeywordDifficultyAnalyzer
                    keyword={pillar.primary_keyword}
                    searchVolume={pillar.metrics?.total_volume}
                    difficulty={pillar.metrics?.avg_difficulty ? pillar.metrics.avg_difficulty * 100 : undefined}
                    competition={pillar.metrics?.avg_competition}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Cluster Articles Section */}
      {topicClusters.cluster_articles.length > 0 && (
        <div className="mb-8">
          <div className="flex items-center gap-2 mb-4">
            <FileText className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Cluster Articles ({topicClusters.cluster_articles.length})
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {topicClusters.cluster_articles.map((cluster, index) => {
              const linkedPillar = cluster.pillar_id 
                ? topicClusters.pillar_pages.find(p => p.pillar_id === cluster.pillar_id)
                : null;

              return (
                <div
                  key={index}
                  className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6"
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <FileText className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {cluster.primary_keyword || cluster.title}
                        </h3>
                      </div>
                      {linkedPillar && (
                        <div className="flex items-center gap-1 mb-2">
                          <LinkIcon className="w-3 h-3 text-purple-600 dark:text-purple-400" />
                          <span className="text-xs text-purple-600 dark:text-purple-400">
                            Linked to: {linkedPillar.title}
                          </span>
                        </div>
                      )}
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                        {cluster.description || `Article about ${cluster.primary_keyword}`}
                      </p>
                      <div className="flex items-center gap-4 text-xs text-gray-600 dark:text-gray-400">
                        <span><strong>Primary Keyword:</strong> {cluster.primary_keyword}</span>
                        <span><strong>Words:</strong> {cluster.target_word_count.toLocaleString()}</span>
                        <span><strong>Keywords:</strong> {cluster.keywords.length}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-600 dark:text-gray-400">Score</div>
                      <div className="text-lg font-bold text-blue-600 dark:text-blue-400">
                        {cluster.metrics?.cluster_score.toFixed(1) || '0.0'}
                      </div>
                    </div>
                  </div>

                  {/* Keywords */}
                  <div className="flex flex-wrap gap-1 mb-3">
                    {cluster.keywords.slice(0, 5).map((kw, kwIndex) => (
                      <span
                        key={kwIndex}
                        className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-700 dark:text-gray-300"
                      >
                        {typeof kw === 'string' ? kw : kw.keyword}
                      </span>
                    ))}
                    {cluster.keywords.length > 5 && (
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs text-gray-600 dark:text-gray-400">
                        +{cluster.keywords.length - 5}
                      </span>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2">
                    {!cluster.pillar_id && (
                      <button
                        onClick={() => handleConvertToPillar(index)}
                        className="flex-1 px-3 py-1.5 text-xs bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/30 dark:hover:bg-purple-900/50 text-purple-700 dark:text-purple-300 rounded transition-colors"
                      >
                        Convert to Pillar
                      </button>
                    )}
                    <button
                      onClick={() => {
                        setEditingCluster(index.toString());
                        // Pre-fill form with cluster data - use primary_keyword as title if title is just a single word
                        const clusterTitle = cluster.title && cluster.title.split(' ').length > 1 
                          ? cluster.title 
                          : cluster.primary_keyword || cluster.title;
                        setClusterForm({
                          title: clusterTitle,
                          description: cluster.description,
                          primary_keyword: cluster.primary_keyword,
                          target_word_count: cluster.target_word_count,
                          pillar_id: cluster.pillar_id || '',
                          selectedKeywords: cluster.keywords.map(k => typeof k === 'string' ? k : k.keyword)
                        });
                        setShowCreateClusterModal(true);
                      }}
                      className="px-3 py-1.5 text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => {
                        setTopicClusters(prev => ({
                          ...prev,
                          cluster_articles: prev.cluster_articles.filter((_, i) => i !== index)
                        }));
                      }}
                      className="px-3 py-1.5 text-xs bg-red-100 hover:bg-red-200 dark:bg-red-900/30 dark:hover:bg-red-900/50 text-red-700 dark:text-red-300 rounded transition-colors"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Actions Footer */}
      {(topicClusters.pillar_pages.length > 0 || topicClusters.cluster_articles.length > 0) && (
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
                Save Topic Clusters
              </button>
              <button
                onClick={() => router.push('/admin/workflow/ideas')}
                disabled={topicClusters.pillar_pages.length === 0 && topicClusters.cluster_articles.length === 0}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
              >
                Continue to Content Ideas
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Pillar Modal */}
      {showCreatePillarModal && (
        <Modal
          isOpen={showCreatePillarModal}
          onClose={() => {
            setShowCreatePillarModal(false);
            setPillarForm({
              title: '',
              description: '',
              primary_keyword: '',
              target_word_count: 3000,
              selectedKeywords: []
            });
          }}
        >
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create Pillar Page</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Primary Keyword *
              </label>
              <input
                type="text"
                value={pillarForm.primary_keyword}
                onChange={(e) => {
                  const newKeyword = e.target.value;
                  setPillarForm({ 
                    ...pillarForm, 
                    primary_keyword: newKeyword,
                    // Auto-update title if it's empty or matches old keyword
                    title: pillarForm.title === pillarForm.primary_keyword || !pillarForm.title
                      ? newKeyword
                      : pillarForm.title
                  });
                }}
                placeholder="e.g., pet grooming services"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Use the full keyword phrase that ranks in search (e.g., "pet grooming services")
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={pillarForm.title}
                onChange={(e) => setPillarForm({ ...pillarForm, title: e.target.value })}
                placeholder={pillarForm.primary_keyword ? `e.g., Complete Guide to ${pillarForm.primary_keyword}` : "e.g., Complete Guide to Pet Grooming"}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Use the full keyword phrase as the title (e.g., "pet grooming services" not just "Pet")
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={pillarForm.description}
                onChange={(e) => setPillarForm({ ...pillarForm, description: e.target.value })}
                placeholder={pillarForm.primary_keyword ? `Comprehensive guide covering ${pillarForm.primary_keyword}` : "Brief description of what this pillar page will cover"}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Target Word Count
              </label>
              <input
                type="number"
                value={pillarForm.target_word_count}
                onChange={(e) => setPillarForm({ ...pillarForm, target_word_count: parseInt(e.target.value) || 3000 })}
                min={3000}
                max={10000}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Pillar pages should be 3,000-5,000+ words for comprehensive coverage
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select Keywords
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2">
                {getAvailableKeywords().map((kw) => (
                  <label key={kw} className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pillarForm.selectedKeywords.includes(kw)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setPillarForm({ ...pillarForm, selectedKeywords: [...pillarForm.selectedKeywords, kw] });
                        } else {
                          setPillarForm({ ...pillarForm, selectedKeywords: pillarForm.selectedKeywords.filter(k => k !== kw) });
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{kw}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleCreatePillar}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
              >
                Create Pillar Page
              </button>
              <button
                onClick={() => {
                  setShowCreatePillarModal(false);
                  setPillarForm({
                    title: '',
                    description: '',
                    primary_keyword: '',
                    target_word_count: 3000,
                    selectedKeywords: []
                  });
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
          </div>
        </Modal>
      )}

      {/* Create Cluster Modal */}
      {showCreateClusterModal && (
        <Modal
          isOpen={showCreateClusterModal}
          onClose={() => {
            setShowCreateClusterModal(false);
            setClusterForm({
              title: '',
              description: '',
              primary_keyword: '',
              target_word_count: 2000,
              pillar_id: '',
              selectedKeywords: []
            });
          }}
        >
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Create Cluster Article</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Link to Pillar Page (Optional)
              </label>
              <select
                value={clusterForm.pillar_id}
                onChange={(e) => setClusterForm({ ...clusterForm, pillar_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              >
                <option value="">None (Standalone Cluster)</option>
                {topicClusters.pillar_pages.map((pillar, index) => (
                  <option key={index} value={pillar.pillar_id || index.toString()}>
                    {pillar.title}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Primary Keyword *
              </label>
              <input
                type="text"
                value={clusterForm.primary_keyword}
                onChange={(e) => {
                  const newKeyword = e.target.value;
                  setClusterForm({ 
                    ...clusterForm, 
                    primary_keyword: newKeyword,
                    // Auto-update title if it's empty or matches old keyword
                    title: clusterForm.title === clusterForm.primary_keyword || !clusterForm.title
                      ? newKeyword
                      : clusterForm.title
                  });
                }}
                placeholder="e.g., ultimate pet grooming services"
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Use the full keyword phrase that ranks in search (e.g., "ultimate pet grooming services")
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Title *
              </label>
              <input
                type="text"
                value={clusterForm.title}
                onChange={(e) => setClusterForm({ ...clusterForm, title: e.target.value })}
                placeholder={clusterForm.primary_keyword || "e.g., ultimate pet grooming services"}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Use the full keyword phrase as the title (e.g., "ultimate pet grooming services" not just "Ultimate")
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Description
              </label>
              <textarea
                value={clusterForm.description}
                onChange={(e) => setClusterForm({ ...clusterForm, description: e.target.value })}
                placeholder={clusterForm.primary_keyword ? `Article about ${clusterForm.primary_keyword}` : "Brief description of this cluster article"}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Target Word Count
              </label>
              <input
                type="number"
                value={clusterForm.target_word_count}
                onChange={(e) => setClusterForm({ ...clusterForm, target_word_count: parseInt(e.target.value) || 2000 })}
                min={1500}
                max={3000}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Cluster articles should be 1,500-2,500 words for specific subtopics
              </p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Select Keywords
              </label>
              <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2">
                {getAvailableKeywords().map((kw) => (
                  <label key={kw} className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                    <input
                      type="checkbox"
                      checked={clusterForm.selectedKeywords.includes(kw)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setClusterForm({ ...clusterForm, selectedKeywords: [...clusterForm.selectedKeywords, kw] });
                        } else {
                          setClusterForm({ ...clusterForm, selectedKeywords: clusterForm.selectedKeywords.filter(k => k !== kw) });
                        }
                      }}
                      className="rounded"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{kw}</span>
                  </label>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                onClick={handleCreateCluster}
                className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Create Cluster Article
              </button>
              <button
                onClick={() => {
                  setShowCreateClusterModal(false);
                  setClusterForm({
                    title: '',
                    description: '',
                    primary_keyword: '',
                    target_word_count: 2000,
                    pillar_id: '',
                    selectedKeywords: []
                  });
                }}
                className="px-4 py-2 bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
          </div>
        </Modal>
      )}

      {/* Save Confirmation Modal */}
      {showSaveModal && (
        <Modal
          isOpen={showSaveModal}
          onClose={() => setShowSaveModal(false)}
        >
          <div className="p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4 text-center">Topic Clusters Saved!</h2>
            <div className="text-center py-4">
            <CheckCircle2 className="w-16 h-16 text-green-600 mx-auto mb-4" />
            <p className="text-gray-700 dark:text-gray-300 mb-2">
              Your topic cluster model has been saved successfully!
            </p>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {topicClusters.pillar_pages.length} pillar page(s) and {topicClusters.cluster_articles.length} cluster article(s) saved.
            </p>
          </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

