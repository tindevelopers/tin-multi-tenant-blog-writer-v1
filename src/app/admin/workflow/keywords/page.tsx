"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Search, 
  ArrowRight, 
  Save, 
  Filter,
  TrendingUp,
  Target,
  Layers,
  Bookmark,
  X,
  CheckCircle2,
  Loader2,
  AlertCircle
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import keywordResearchService from '@/lib/keyword-research';
import type { KeywordData, KeywordAnalysis } from '@/lib/keyword-research';
import Alert from '@/components/ui/alert/Alert';
import { Modal } from '@/components/ui/modal';
import { useCloudRunStatus } from '@/hooks/useCloudRunStatus';

interface KeywordWithMetrics extends KeywordData {
  keyword: string;
  parent_topic?: string;
  cluster_score?: number;
  category_type?: 'topic' | 'question' | 'action' | 'entity';
  selected?: boolean;
}

interface ParentTopicCluster {
  parent_topic: string;
  keywords: KeywordWithMetrics[];
  total_volume: number;
  avg_difficulty: number;
  avg_competition: number;
  cluster_score: number;
  category_type?: 'topic' | 'question' | 'action' | 'entity';
  keyword_count: number;
}

export default function KeywordResearchPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Cloud Run status tracking
  const cloudRunStatus = useCloudRunStatus();
  
  const [workflowSession, setWorkflowSession] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [niche, setNiche] = useState('');
  const [keywords, setKeywords] = useState<KeywordWithMetrics[]>([]);
  const [clusters, setClusters] = useState<ParentTopicCluster[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  
  // Filter and sort state
  const [viewMode, setViewMode] = useState<'keywords' | 'clusters'>('keywords');
  const [difficultyFilter, setDifficultyFilter] = useState<string>('all');
  const [intentFilter, setIntentFilter] = useState<string>('all');
  const [parentTopicFilter, setParentTopicFilter] = useState<string>('all');
  const [categoryTypeFilter, setCategoryTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'volume' | 'difficulty' | 'competition' | 'keyword'>('volume');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [minVolume, setMinVolume] = useState<number>(0);
  const [collectionName, setCollectionName] = useState('');
  const [location, setLocation] = useState<string>('United States');
  
  // Pagination for large keyword lists (150+)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [keywordsPerPage, setKeywordsPerPage] = useState<number>(50);

  // Load workflow session and objective
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
            .select('*')
            .eq('session_id', sessionId)
            .maybeSingle();

          if (sessionError && sessionError.code !== 'PGRST116') {
            console.error('Error loading session:', sessionError);
          }

          if (session) {
            setWorkflowSession(session);
            
            // Only set niche from session (industry), not search query
            // Search query should be empty or loaded from saved keyword research data
            setNiche(session.industry || '');
            
            // Load existing keyword collection if any
            const { data: collectionData, error: collectionError } = await supabase
              .from('keyword_collections')
              .select('*')
              .eq('session_id', sessionId)
              .order('created_at', { ascending: false })
              .limit(1);

            if (collectionError && collectionError.code !== 'PGRST116') {
              console.error('Error loading collection:', collectionError);
            }

            const collection = collectionData && collectionData.length > 0 ? collectionData[0] : null;

            if (collection && collection.keywords) {
              // Ensure keywords is an array
              const savedKeywords = Array.isArray(collection.keywords) 
                ? collection.keywords as KeywordWithMetrics[]
                : (typeof collection.keywords === 'string' ? JSON.parse(collection.keywords) : []);
              
              console.log('📋 Loaded existing collection:', {
                collectionId: collection.collection_id,
                keywordCount: savedKeywords.length,
                name: collection.name
              });

              setKeywords(savedKeywords);
              setCollectionName(collection.name || '');
              generateClusters(savedKeywords);
              
              // If there's a saved search query in workflow_data, use it
              const workflowData = session.workflow_data as Record<string, unknown> | null;
              if (workflowData?.search_query && typeof workflowData.search_query === 'string') {
                setSearchQuery(workflowData.search_query);
              }
            } else {
              // No saved collection - search query should be empty
              // Don't populate from objective as that's a different field
              setSearchQuery('');
            }
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

  // Generate parent topic clusters from keywords
  // Uses API-provided parent_topic if available, otherwise falls back to extraction
  const generateClusters = (keywordList: KeywordWithMetrics[]) => {
    if (keywordList.length === 0) {
      setClusters([]);
      return;
    }

    // Group keywords by parent topic from API (or fallback to extraction)
    const clusterMap = new Map<string, KeywordWithMetrics[]>();
    
    keywordList.forEach(kw => {
      // Use API-provided parent_topic if available, otherwise extract
      const parentTopic = kw.parent_topic || extractParentTopic(kw.keyword);
      
      if (!clusterMap.has(parentTopic)) {
        clusterMap.set(parentTopic, []);
      }
      // Ensure parent_topic is set on keyword
      clusterMap.get(parentTopic)!.push({ 
        ...kw, 
        parent_topic: parentTopic 
      });
    });

    // Convert to cluster objects with metrics
    const clusterArray: ParentTopicCluster[] = Array.from(clusterMap.entries()).map(([topic, kws]) => {
      const totalVolume = kws.reduce((sum, k) => sum + (k.search_volume || 0), 0);
      const avgDifficulty = kws.reduce((sum, k) => {
        const diff = k.difficulty === 'easy' ? 0.33 : k.difficulty === 'medium' ? 0.66 : 1.0;
        return sum + diff;
      }, 0) / kws.length;
      const avgCompetition = kws.reduce((sum, k) => sum + k.competition, 0) / kws.length;
      
      // Use API-provided cluster_score if available, otherwise calculate
      const apiClusterScore = kws[0]?.cluster_score;
      const clusterScore = apiClusterScore !== undefined 
        ? apiClusterScore 
        : calculateClusterScore(totalVolume, avgDifficulty, avgCompetition, kws.length);
      
      // Get category_type from first keyword (they should all be the same for a cluster)
      const categoryType = kws[0]?.category_type;

      return {
        parent_topic: topic,
        keywords: kws,
        total_volume: totalVolume,
        avg_difficulty: avgDifficulty,
        avg_competition: avgCompetition,
        cluster_score: clusterScore,
        category_type: categoryType,
        keyword_count: kws.length
      };
    });

    // Sort by cluster score (descending)
    clusterArray.sort((a, b) => b.cluster_score - a.cluster_score);
    setClusters(clusterArray);
  };

  // Extract parent topic from keyword (fallback - API should provide this)
  const extractParentTopic = (keyword: string): string => {
    // This is a fallback - API should provide parent_topic
    // Remove common modifiers to find parent topic
    const words = keyword.toLowerCase().split(' ');
    const modifiers = ['near', 'me', 'best', 'top', 'how', 'to', 'what', 'is', 'the', 'a', 'an', 'why', 'when', 'where'];
    const meaningfulWords = words.filter(w => !modifiers.includes(w) && w.length > 2);
    
    if (meaningfulWords.length > 0) {
      // Return first 2-3 meaningful words as parent topic
      return meaningfulWords.slice(0, 2).map(w => 
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(' ');
    }
    
    return keyword;
  };
  
  // Get category type icon/indicator
  const getCategoryIcon = (categoryType?: string): string => {
    switch (categoryType) {
      case 'question': return '?';
      case 'action': return '⚡';
      case 'entity': return '🏢';
      case 'topic': return '📁';
      default: return '📝';
    }
  };

  // Calculate cluster score (higher is better)
  const calculateClusterScore = (
    volume: number,
    difficulty: number,
    competition: number,
    keywordCount: number
  ): number => {
    // Normalize volume (assume max 100K)
    const volumeScore = Math.min(volume / 100000, 1) * 40;
    // Lower difficulty is better
    const difficultyScore = (1 - difficulty) * 30;
    // Lower competition is better
    const competitionScore = (1 - competition) * 20;
    // More keywords in cluster is better (up to 20)
    const countScore = Math.min(keywordCount / 20, 1) * 10;
    
    return volumeScore + difficultyScore + competitionScore + countScore;
  };

  // Search keywords
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search query');
      return;
    }

    try {
      setSearching(true);
      setError(null);

      // Perform keyword research
      const researchResults = await keywordResearchService.performBlogResearch(
        searchQuery,
        workflowSession?.target_audience || 'general',
        undefined, // userId
        location // Pass location parameter
      );

      // Extract keywords from research results
      const keywordAnalysis = researchResults.keyword_analysis?.keyword_analysis || {};
      
      // Filter out single-word keywords that don't make sense as standalone keywords
      // Keep only phrases (2+ words) or meaningful single words
      const filteredKeywordEntries = Object.entries(keywordAnalysis).filter(([keyword]) => {
        const wordCount = keyword.trim().split(/\s+/).length;
        // Keep phrases (2+ words) or single words that are meaningful (length > 5)
        return wordCount > 1 || keyword.trim().length > 5;
      });
      
      console.log('📋 Filtered keywords (phrases preserved):', filteredKeywordEntries.map(([kw]) => kw));
      
      const keywordList: KeywordWithMetrics[] = filteredKeywordEntries.map(([keyword, data]: [string, any]) => ({
        keyword,
        search_volume: data.search_volume || 0,
        difficulty: data.difficulty || 'medium',
        competition: data.competition || 0.5,
        cpc: data.cpc || 0,
        trend_score: data.trend_score || 0,
        recommended: data.recommended || false,
        reason: data.reason || '',
        related_keywords: data.related_keywords || [],
        long_tail_keywords: data.long_tail_keywords || [],
        // Include clustering data from API
        parent_topic: data.parent_topic,
        cluster_score: data.cluster_score,
        category_type: data.category_type
      }));

      setKeywords(keywordList);
      generateClusters(keywordList);
      
      // Save search query to workflow_data for future reference
      if (workflowSession?.session_id) {
        try {
          const supabase = createClient();
          const workflowData = (workflowSession.workflow_data as Record<string, unknown>) || {};
          
          await supabase
            .from('workflow_sessions')
            .update({
              workflow_data: {
                ...workflowData,
                search_query: searchQuery.trim(),
              },
              updated_at: new Date().toISOString(),
            })
            .eq('session_id', workflowSession.session_id);
        } catch (saveError) {
          // Non-critical error - just log it
          console.warn('Failed to save search query to workflow_data:', saveError);
        }
      }
      
      // Show success message with total count
      const totalCount = keywordList.length;
      const message = totalCount >= 150 
        ? `Found ${totalCount} keywords (comprehensive research)`
        : `Found ${totalCount} keywords`;
      setSuccess(message);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error('Error searching keywords:', err);
      setError(err.message || 'Failed to search keywords');
    } finally {
      setSearching(false);
    }
  };

  // Toggle keyword selection
  const toggleKeywordSelection = (keyword: string) => {
    const newSelected = new Set(selectedKeywords);
    if (newSelected.has(keyword)) {
      newSelected.delete(keyword);
    } else {
      newSelected.add(keyword);
    }
    setSelectedKeywords(newSelected);
  };

  // Select all keywords
  const selectAllKeywords = () => {
    const allKeywords = viewMode === 'keywords' 
      ? keywords.map(k => k.keyword)
      : clusters.flatMap(c => c.keywords.map(k => k.keyword));
    setSelectedKeywords(new Set(allKeywords));
  };

  // Deselect all keywords
  const deselectAllKeywords = () => {
    setSelectedKeywords(new Set());
  };

  // Save keyword collection
  const handleSaveCollection = async () => {
    if (keywords.length === 0) {
      setError('No keywords to save');
      return;
    }

    // Check if Cloud Run is available before saving
    if (!cloudRunStatus.isHealthy) {
      if (cloudRunStatus.isWakingUp) {
        setError('The API is starting up. Please wait a moment and try again.');
        return;
      }
      
      // Try to wake it up if not already waking up
      setError('Waking up the API...');
      const wakeStatus = await cloudRunStatus.wakeUpAndWait();
      
      if (!wakeStatus.isHealthy) {
        setError(wakeStatus.error || 'The API is still starting up. Please wait a moment and try again.');
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);

      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        setError('Please log in to save collections');
        return;
      }

      if (!workflowSession) {
        setError('Workflow session not found. Please start a new workflow.');
        return;
      }

      // Get user's org_id
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

      if (userError || !userProfile) {
        setError('User organization not found');
        return;
      }

      const sessionId = workflowSession.session_id || localStorage.getItem('workflow_session_id');
      if (!sessionId) {
        setError('Workflow session ID not found');
        return;
      }

      const name = collectionName || `Keywords for ${searchQuery}`;

      // Check if collection already exists (without .single() to avoid error if none found)
      const { data: existingData, error: checkError } = await supabase
        .from('keyword_collections')
        .select('collection_id')
        .eq('session_id', sessionId)
        .limit(1);

      if (checkError && checkError.code !== 'PGRST116') {
        // PGRST116 is "no rows returned" which is fine, other errors are not
        throw checkError;
      }

      const existing = existingData && existingData.length > 0 ? existingData[0] : null;

      const collectionData = {
        session_id: sessionId,
        org_id: workflowSession.org_id || userProfile.org_id,
        created_by: user.id,
        name,
        keywords: keywords, // Ensure keywords array is saved
        search_query: searchQuery,
        niche: niche
      };

      console.log('💾 Saving keyword collection:', {
        sessionId,
        orgId: workflowSession.org_id || userProfile.org_id,
        keywordCount: keywords.length,
        hasExisting: !!existing
      });

      let result;
      if (existing) {
        const { data, error } = await supabase
          .from('keyword_collections')
          .update(collectionData)
          .eq('collection_id', existing.collection_id)
          .select()
          .single();
        
        if (error) {
          console.error('❌ Update error:', error);
          throw error;
        }
        result = data;
        console.log('✅ Updated existing collection:', result?.collection_id);
      } else {
        const { data, error } = await supabase
          .from('keyword_collections')
          .insert(collectionData)
          .select()
          .single();
        
        if (error) {
          console.error('❌ Insert error:', error);
          throw error;
        }
        result = data;
        console.log('✅ Created new collection:', result?.collection_id);
      }

      // Verify the save was successful
      if (!result) {
        throw new Error('Collection save returned no data');
      }

      // Update workflow session
      const { error: sessionError } = await supabase
        .from('workflow_sessions')
        .update({
          current_step: 'keywords',
          completed_steps: ['objective', 'keywords']
        })
        .eq('session_id', sessionId);

      if (sessionError) {
        console.warn('Failed to update workflow session:', sessionError);
        // Don't throw - collection was saved successfully
      }

      // Verify the collection was saved by fetching it back
      const { data: verifyData, error: verifyError } = await supabase
        .from('keyword_collections')
        .select('collection_id, keywords')
        .eq('session_id', sessionId)
        .single();

      if (verifyError || !verifyData) {
        console.warn('⚠️ Could not verify collection save:', verifyError);
        // Don't throw - the save might have succeeded but verification failed
      } else {
        console.log('✅ Verified collection saved:', {
          collectionId: verifyData.collection_id,
          keywordCount: Array.isArray(verifyData.keywords) ? verifyData.keywords.length : 0
        });
      }

      // Clear any previous errors
      setError(null);
      
      // Show success modal
      setShowSuccessModal(true);
      console.log('✅ Success modal should be visible');
    } catch (err: any) {
      console.error('❌ Error saving collection:', err);
      const errorMessage = err.message || err.code || 'Failed to save keyword collection. Please check the console for details.';
      setError(errorMessage);
      setShowSuccessModal(false); // Ensure modal is closed on error
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort keywords
  const filteredKeywords = keywords
    .filter(kw => {
      if (difficultyFilter !== 'all') {
        if (difficultyFilter !== kw.difficulty) return false;
      }
      if (parentTopicFilter !== 'all') {
        const kwParentTopic = kw.parent_topic || extractParentTopic(kw.keyword);
        if (parentTopicFilter !== kwParentTopic) return false;
      }
      if (categoryTypeFilter !== 'all') {
        if (categoryTypeFilter !== kw.category_type) return false;
      }
      if (minVolume > 0 && (kw.search_volume || 0) < minVolume) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'volume':
          comparison = (a.search_volume || 0) - (b.search_volume || 0);
          break;
        case 'difficulty':
          const diffA = a.difficulty === 'easy' ? 0 : a.difficulty === 'medium' ? 1 : 2;
          const diffB = b.difficulty === 'easy' ? 0 : b.difficulty === 'medium' ? 1 : 2;
          comparison = diffA - diffB;
          break;
        case 'competition':
          comparison = a.competition - b.competition;
          break;
        case 'keyword':
          comparison = a.keyword.localeCompare(b.keyword);
          break;
      }
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  // Pagination for large lists (150+ keywords)
  const totalPages = Math.ceil(filteredKeywords.length / keywordsPerPage);
  const startIndex = (currentPage - 1) * keywordsPerPage;
  const endIndex = startIndex + keywordsPerPage;
  const paginatedKeywords = filteredKeywords.slice(startIndex, endIndex);
  
  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [difficultyFilter, parentTopicFilter, categoryTypeFilter, minVolume, sortBy, sortOrder]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
            <Search className="w-6 h-6 text-blue-600 dark:text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Keyword Research
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Discover high-value keywords for your content strategy
            </p>
          </div>
        </div>
      </div>

      {/* Cloud Run Status Banner */}
      {cloudRunStatus.isWakingUp && (
        <div className="mb-6 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-yellow-600 dark:text-yellow-400 animate-spin flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium text-yellow-800 dark:text-yellow-200">
                API is Starting Up
              </div>
              <div className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                {cloudRunStatus.error || 'Cloud Run is starting up. Please wait a moment...'}
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* API Active Status Banner */}
      {cloudRunStatus.isHealthy && !cloudRunStatus.isWakingUp && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
            <div className="flex-1">
              <div className="font-medium text-green-800 dark:text-green-200">
                API is Active
              </div>
              <div className="text-sm text-green-700 dark:text-green-300 mt-1">
                Cloud Run service is ready. You can now use all features.
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* Search Section */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search Query <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g., pet grooming services"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Niche / Industry
            </label>
            <input
              type="text"
              value={niche}
              onChange={(e) => setNiche(e.target.value)}
              placeholder="e.g., pet care, local services"
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
        <button
          onClick={handleSearch}
          disabled={searching || !searchQuery.trim()}
          className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
        >
          {searching ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              Searching...
            </>
          ) : (
            <>
              <Search className="w-4 h-4" />
              Search Keywords
            </>
          )}
        </button>
      </div>

      {/* Filters and View Toggle */}
      {keywords.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('keywords')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'keywords'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                Keywords ({keywords.length >= 150 ? '150+' : keywords.length})
              </button>
              <button
                onClick={() => setViewMode('clusters')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  viewMode === 'clusters'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                <Layers className="w-4 h-4 inline mr-2" />
                Clusters ({clusters.length})
              </button>
            </div>

            {/* Filters */}
            {viewMode === 'keywords' && (
              <>
                <select
                  value={parentTopicFilter}
                  onChange={(e) => setParentTopicFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Topics</option>
                  {Array.from(new Set(
                    keywords
                      .map(kw => kw.parent_topic || extractParentTopic(kw.keyword))
                      .filter(topic => topic && topic.trim() !== '')
                  )).sort().map(topic => (
                    <option key={topic} value={topic}>{topic}</option>
                  ))}
                </select>

                <select
                  value={categoryTypeFilter}
                  onChange={(e) => setCategoryTypeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Types</option>
                  <option value="topic">Topic</option>
                  <option value="question">Question</option>
                  <option value="action">Action</option>
                  <option value="entity">Entity</option>
                </select>

                <select
                  value={difficultyFilter}
                  onChange={(e) => setDifficultyFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All Difficulties</option>
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                </select>

                <input
                  type="number"
                  placeholder="Min Volume"
                  value={minVolume || ''}
                  onChange={(e) => setMinVolume(parseInt(e.target.value) || 0)}
                  className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />

                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="volume">Sort by Volume</option>
                  <option value="difficulty">Sort by Difficulty</option>
                  <option value="competition">Sort by Competition</option>
                  <option value="keyword">Sort by Keyword</option>
                </select>

                <button
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  {sortOrder === 'asc' ? '↑' : '↓'}
                </button>

                {/* Pagination controls for large lists */}
                {filteredKeywords.length > keywordsPerPage && (
                  <>
                    <select
                      value={keywordsPerPage}
                      onChange={(e) => {
                        setKeywordsPerPage(parseInt(e.target.value));
                        setCurrentPage(1);
                      }}
                      className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    >
                      <option value="25">25 per page</option>
                      <option value="50">50 per page</option>
                      <option value="100">100 per page</option>
                      <option value="150">150 per page</option>
                    </select>
                    <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <span>
                        Page {currentPage} of {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Previous
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="px-2 py-1 border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Next
                      </button>
                    </div>
                  </>
                )}
              </>
            )}

            {/* Selection Actions */}
            <div className="ml-auto flex items-center gap-2">
              <button
                onClick={selectAllKeywords}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                Select All
              </button>
              <button
                onClick={deselectAllKeywords}
                className="text-sm text-gray-600 dark:text-gray-400 hover:underline"
              >
                Deselect All
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {selectedKeywords.size} selected
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Keywords Table */}
      {viewMode === 'keywords' && keywords.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    <input
                      type="checkbox"
                      checked={paginatedKeywords.length > 0 && paginatedKeywords.every(k => selectedKeywords.has(k.keyword))}
                      onChange={(e) => {
                        if (e.target.checked) {
                          // Select all keywords on current page
                          const newSelected = new Set(selectedKeywords);
                          paginatedKeywords.forEach(k => newSelected.add(k.keyword));
                          setSelectedKeywords(newSelected);
                        } else {
                          // Deselect all keywords on current page
                          const newSelected = new Set(selectedKeywords);
                          paginatedKeywords.forEach(k => newSelected.delete(k.keyword));
                          setSelectedKeywords(newSelected);
                        }
                      }}
                      className="rounded"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Keyword
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Search Volume
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Difficulty
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Competition
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    CPC
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Parent Topic
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedKeywords.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      No keywords match your filters
                    </td>
                  </tr>
                ) : (
                  paginatedKeywords.map((kw) => (
                  <tr
                    key={kw.keyword}
                    className={`hover:bg-gray-50 dark:hover:bg-gray-700 ${
                      selectedKeywords.has(kw.keyword) ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                    }`}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedKeywords.has(kw.keyword)}
                        onChange={() => toggleKeywordSelection(kw.keyword)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-900 dark:text-white">
                        {kw.keyword}
                      </div>
                      {kw.recommended && (
                        <span className="text-xs text-green-600 dark:text-green-400">Recommended</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {kw.search_volume ? kw.search_volume.toLocaleString() : '-'}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        kw.difficulty === 'easy'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : kw.difficulty === 'medium'
                          ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                          : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                      }`}>
                        {kw.difficulty}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      {(kw.competition * 100).toFixed(0)}%
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      ${kw.cpc?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {kw.category_type && (
                          <span className="text-xs" title={kw.category_type}>
                            {getCategoryIcon(kw.category_type)}
                          </span>
                        )}
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          {kw.parent_topic || extractParentTopic(kw.keyword)}
                        </span>
                        {kw.cluster_score !== undefined && (
                          <span className="text-xs text-gray-500 dark:text-gray-500">
                            ({(kw.cluster_score * 100).toFixed(0)}%)
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {/* Pagination footer */}
          {filteredKeywords.length > keywordsPerPage && (
            <div className="px-4 py-3 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <div className="text-sm text-gray-600 dark:text-gray-400">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredKeywords.length)} of {filteredKeywords.length} keywords
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Clusters View */}
      {viewMode === 'clusters' && clusters.length > 0 && (
        <div className="space-y-4">
          {clusters.map((cluster) => (
            <div
              key={cluster.parent_topic}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                    <Layers className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                    {cluster.category_type && (
                      <span className="text-lg" title={cluster.category_type}>
                        {getCategoryIcon(cluster.category_type)}
                      </span>
                    )}
                    {cluster.parent_topic}
                  </h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {cluster.keyword_count || cluster.keywords.length} keywords
                    {cluster.category_type && (
                      <span className="ml-2 px-2 py-0.5 bg-gray-100 dark:bg-gray-700 rounded text-xs">
                        {cluster.category_type}
                      </span>
                    )}
                  </p>
                </div>
                <div className="text-right">
                  <div className="text-sm text-gray-600 dark:text-gray-400">Cluster Score</div>
                  <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                    {cluster.cluster_score.toFixed(1)}
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Total Volume</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {cluster.total_volume.toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Avg Difficulty</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {cluster.avg_difficulty < 0.4 ? 'Easy' : cluster.avg_difficulty < 0.7 ? 'Medium' : 'Hard'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Avg Competition</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {(cluster.avg_competition * 100).toFixed(0)}%
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Keywords</div>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    {cluster.keywords.length}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {cluster.keywords.slice(0, 10).map((kw) => (
                  <span
                    key={kw.keyword}
                    className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300"
                  >
                    {kw.keyword} ({kw.search_volume?.toLocaleString() || 0})
                  </span>
                ))}
                {cluster.keywords.length > 10 && (
                  <span className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300">
                    +{cluster.keywords.length - 10} more
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Empty State */}
      {keywords.length === 0 && !searching && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <Search className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No keywords found
          </h3>
          <p className="text-gray-600 dark:text-gray-400">
            Enter a search query above to discover high-value keywords for your content strategy
          </p>
        </div>
      )}

      {/* Save and Continue */}
      {keywords.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 mt-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Collection Name
              </label>
              <input
                type="text"
                value={collectionName}
                onChange={(e) => setCollectionName(e.target.value)}
                placeholder="e.g., Pet Grooming Keywords"
                className="w-full md:w-64 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white"
              />
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={handleSaveCollection}
                disabled={loading || cloudRunStatus.isWakingUp || (!cloudRunStatus.isHealthy && cloudRunStatus.isChecking)}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                title={cloudRunStatus.isWakingUp ? 'API is starting up. Please wait...' : cloudRunStatus.isChecking ? 'Checking API status...' : undefined}
              >
                {cloudRunStatus.isWakingUp || cloudRunStatus.isChecking ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    {cloudRunStatus.isWakingUp ? 'Starting Up...' : 'Checking...'}
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Save Collection
                  </>
                )}
              </button>
              <button
                onClick={() => router.push('/admin/workflow/clusters')}
                disabled={keywords.length === 0}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
              >
                Continue to Clustering
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      <Modal
        isOpen={showSuccessModal}
        onClose={() => {
          console.log('Closing success modal');
          setShowSuccessModal(false);
        }}
        className="max-w-md"
        showCloseButton={true}
      >
        <div className="p-8">
          <div className="flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mb-4">
              <CheckCircle2 className="w-10 h-10 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
              Collection Saved Successfully!
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Your keyword collection has been saved and is ready to use in the next steps of your workflow.
            </p>
            <button
              onClick={() => setShowSuccessModal(false)}
              className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
            >
              Continue
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

