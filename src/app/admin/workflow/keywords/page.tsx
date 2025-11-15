"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Save, ArrowRight, History, Loader2, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { AdvancedSearchForm } from '@/components/keyword-research/AdvancedSearchForm';
import { KeywordOverviewCards } from '@/components/keyword-research/KeywordOverviewCards';
import { KeywordDetailTabs } from '@/components/keyword-research/KeywordDetailTabs';
import { SavedSearchesPanel } from '@/components/keyword-research/SavedSearchesPanel';
import { BulkActionsToolbar } from '@/components/keyword-research/BulkActionsToolbar';
import { useCloudRunStatus } from '@/hooks/useCloudRunStatus';
import Alert from '@/components/ui/alert/Alert';
import { Modal } from '@/components/ui/modal';

interface KeywordWithMetrics {
  keyword: string;
  search_volume?: number;
  global_search_volume?: number;
  difficulty?: 'easy' | 'medium' | 'hard';
  competition?: number;
  cpc?: number;
  trend_score?: number;
  recommended?: boolean;
  reason?: string;
  related_keywords?: string[];
  long_tail_keywords?: string[];
  parent_topic?: string;
  cluster_score?: number;
  category_type?: 'topic' | 'question' | 'action' | 'entity';
  primary_intent?: string;
  intent_probabilities?: Record<string, number>;
  monthly_searches?: Array<{ month: string; volume: number }>;
  also_rank_for?: string[];
  also_talk_about?: string[];
  selected?: boolean;
}

interface ClusterData {
  parent_topic: string;
  keywords: string[];
  cluster_score: number;
  keyword_count: number;
}

interface EnhancedAnalysis {
  [keyword: string]: {
    search_volume?: number;
    global_search_volume?: number;
    difficulty?: 'easy' | 'medium' | 'hard';
    competition?: number;
    cpc?: number;
    trend_score?: number;
    recommended?: boolean;
    reason?: string;
    related_keywords?: string[];
    long_tail_keywords?: string[];
    parent_topic?: string;
    cluster_score?: number;
    primary_intent?: string;
    intent_probabilities?: Record<string, number>;
    monthly_searches?: Array<{ month: string; volume: number }>;
    also_rank_for?: string[];
    also_talk_about?: string[];
  };
}

export default function KeywordResearchPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showSavedSearches, setShowSavedSearches] = useState(false);
  
  const cloudRunStatus = useCloudRunStatus();
  
  const [workflowSession, setWorkflowSession] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('United States');
  const [language, setLanguage] = useState('en');
  const [searchType, setSearchType] = useState('general');
  const [niche, setNiche] = useState('');
  const [searchMode, setSearchMode] = useState('keywords');
  
  const [primaryKeyword, setPrimaryKeyword] = useState<string>('');
  const [keywords, setKeywords] = useState<KeywordWithMetrics[]>([]);
  const [clusters, setClusters] = useState<ClusterData[]>([]);
  const [selectedKeywords, setSelectedKeywords] = useState<Set<string>>(new Set());
  const [enhancedAnalysis, setEnhancedAnalysis] = useState<EnhancedAnalysis>({});
  const [locationUsed, setLocationUsed] = useState<string>('');
  const [savedSearchId, setSavedSearchId] = useState<string | null>(null);
  
  const [collectionName, setCollectionName] = useState('');

  // Load workflow session
  useEffect(() => {
    const loadSession = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const sessionId = localStorage.getItem('workflow_session_id');
        if (sessionId) {
          const { data: session } = await supabase
            .from('workflow_sessions')
            .select('*')
            .eq('session_id', sessionId)
            .maybeSingle();

          if (session) {
            setWorkflowSession(session);
            setNiche(session.industry || '');
            
            // Load existing keyword collection if any
            const { data: collectionData } = await supabase
              .from('keyword_collections')
              .select('*')
              .eq('session_id', sessionId)
              .order('created_at', { ascending: false })
              .limit(1);

            const collection = collectionData && collectionData.length > 0 ? collectionData[0] : null;

            if (collection && collection.keywords) {
              const savedKeywords = Array.isArray(collection.keywords) 
                ? collection.keywords as KeywordWithMetrics[]
                : (typeof collection.keywords === 'string' ? JSON.parse(collection.keywords) : []);
              
              if (savedKeywords && savedKeywords.length > 0) {
                setKeywords(savedKeywords);
                setCollectionName(collection.name || '');
                generateClusters(savedKeywords);
                
                // Set primary keyword from first keyword
                if (savedKeywords.length > 0) {
                  setPrimaryKeyword(savedKeywords[0].keyword);
                }
              }
              
              const workflowData = session.workflow_data as Record<string, unknown> | null;
              if (workflowData?.search_query && typeof workflowData.search_query === 'string') {
                setSearchQuery(workflowData.search_query);
                setPrimaryKeyword(workflowData.search_query);
              }
            }
          }
        }
      } catch (error) {
        console.error('Error loading session:', error);
      }
    };

    loadSession();
  }, []);

  // Generate clusters from keywords
  const generateClusters = (keywordList: KeywordWithMetrics[]) => {
    if (keywordList.length === 0) {
      setClusters([]);
      return;
    }

    const clusterMap = new Map<string, KeywordWithMetrics[]>();
    
    keywordList.forEach(kw => {
      const parentTopic = kw.parent_topic || extractParentTopic(kw.keyword);
      if (!clusterMap.has(parentTopic)) {
        clusterMap.set(parentTopic, []);
      }
      clusterMap.get(parentTopic)!.push({ 
        ...kw, 
        parent_topic: parentTopic 
      });
    });

    const clusterArray: ClusterData[] = Array.from(clusterMap.entries()).map(([topic, kws]) => ({
      parent_topic: topic,
      keywords: kws.map(k => k.keyword),
      cluster_score: kws[0]?.cluster_score || 0.5,
      keyword_count: kws.length
    }));

    clusterArray.sort((a, b) => b.cluster_score - a.cluster_score);
    setClusters(clusterArray);
  };

  const extractParentTopic = (keyword: string): string => {
    const words = keyword.toLowerCase().split(' ');
    const modifiers = ['near', 'me', 'best', 'top', 'how', 'to', 'what', 'is', 'the', 'a', 'an', 'why', 'when', 'where'];
    const meaningfulWords = words.filter(w => !modifiers.includes(w) && w.length > 2);
    
    if (meaningfulWords.length > 0) {
      return meaningfulWords.slice(0, 2).map(w => 
        w.charAt(0).toUpperCase() + w.slice(1)
      ).join(' ');
    }
    
    return keyword;
  };

  // Handle advanced search
  const handleAdvancedSearch = async (params: {
    query: string;
    location: string;
    language: string;
    searchType: string;
    niche?: string;
    searchMode: string;
    saveSearch: boolean;
  }) => {
    if (!params.query.trim()) {
      setError('Please enter a search query');
      return;
    }

    try {
      setSearching(true);
      setError(null);
      setSuccess(null);
      setKeywords([]);
      setClusters([]);
      setSelectedKeywords(new Set());
      setPrimaryKeyword(params.query);
      setSearchQuery(params.query);
      setLocation(params.location);
      setLanguage(params.language);
      setSearchType(params.searchType);
      setNiche(params.niche || '');
      setSearchMode(params.searchMode);

      // Call the enhanced API endpoint
      const response = await fetch('/api/keywords/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          keywords: [params.query],
          location: params.location,
          language: params.language,
          search_type: params.searchType,
          niche: params.niche,
          search_mode: params.searchMode,
          save_search: params.saveSearch,
          search_query: params.query,
          include_search_volume: true,
          include_trends: true,
          include_serp: true,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      const data = await response.json();
      
      console.log('🔍 API Response:', {
        hasEnhancedAnalysis: !!data.enhanced_analysis,
        enhancedAnalysisKeys: data.enhanced_analysis ? Object.keys(data.enhanced_analysis) : [],
        hasClusters: !!data.clusters,
        clusterCount: data.clusters?.length || 0,
        location: data.location,
        fullData: data,
      });
      
      // Extract enhanced analysis
      const analysis = data.enhanced_analysis || {};
      setEnhancedAnalysis(analysis);
      
      // Extract location info
      if (data.location) {
        setLocationUsed(data.location.used || params.location);
      }
      
      // Extract saved search ID
      if (data.saved_search_id) {
        setSavedSearchId(data.saved_search_id);
      }

      // Check if we have any data
      if (Object.keys(analysis).length === 0) {
        console.warn('⚠️ No enhanced_analysis data in response');
        // Try to extract from keyword_analysis if available
        if (data.keyword_analysis?.keyword_analysis) {
          console.log('📋 Found keyword_analysis, converting...');
          const keywordAnalysis = data.keyword_analysis.keyword_analysis;
          const convertedAnalysis: EnhancedAnalysis = {};
          Object.entries(keywordAnalysis).forEach(([keyword, metrics]: [string, any]) => {
            convertedAnalysis[keyword] = {
              search_volume: metrics.search_volume,
              difficulty: metrics.difficulty,
              competition: metrics.competition,
              cpc: metrics.cpc,
              trend_score: metrics.trend_score,
              recommended: metrics.recommended,
              reason: metrics.reason,
              related_keywords: metrics.related_keywords,
              long_tail_keywords: metrics.long_tail_keywords,
              parent_topic: metrics.parent_topic,
              cluster_score: metrics.cluster_score,
            };
          });
          Object.assign(analysis, convertedAnalysis);
          setEnhancedAnalysis(analysis);
        } else {
          setError('No keyword data returned from API. Please try a different search query.');
          return;
        }
      }

      // Convert enhanced analysis to keyword list
      const keywordList: KeywordWithMetrics[] = Object.entries(analysis).map(([keyword, metrics]: [string, any]) => ({
        keyword,
        search_volume: metrics.search_volume,
        global_search_volume: metrics.global_search_volume,
        difficulty: metrics.difficulty,
        competition: metrics.competition,
        cpc: metrics.cpc,
        trend_score: metrics.trend_score,
        recommended: metrics.recommended,
        reason: metrics.reason,
        related_keywords: metrics.related_keywords,
        long_tail_keywords: metrics.long_tail_keywords,
        parent_topic: metrics.parent_topic,
        cluster_score: metrics.cluster_score,
        primary_intent: metrics.primary_intent,
        intent_probabilities: metrics.intent_probabilities,
        monthly_searches: metrics.monthly_searches,
        also_rank_for: metrics.also_rank_for,
        also_talk_about: metrics.also_talk_about,
      }));

      // Also include clusters if available
      if (data.clusters && Array.isArray(data.clusters)) {
        setClusters(data.clusters.map((c: any) => ({
          parent_topic: c.parent_topic,
          keywords: c.keywords || [],
          cluster_score: c.cluster_score || 0.5,
          keyword_count: c.keywords?.length || 0,
        })));
      } else {
        generateClusters(keywordList);
      }

      console.log('📊 Processed keywords:', {
        count: keywordList.length,
        sample: keywordList.slice(0, 3).map(k => ({
          keyword: k.keyword,
          volume: k.search_volume,
          difficulty: k.difficulty,
        })),
      });

      setKeywords(keywordList);
      
      // Save search query to workflow_data
      if (workflowSession?.session_id) {
        try {
          const supabase = createClient();
          const workflowData = (workflowSession.workflow_data as Record<string, unknown>) || {};
          
          await supabase
            .from('workflow_sessions')
            .update({
              workflow_data: {
                ...workflowData,
                search_query: params.query.trim(),
                search_type: params.searchType,
                location: params.location,
                language: params.language,
              },
              updated_at: new Date().toISOString(),
            })
            .eq('session_id', workflowSession.session_id);
        } catch (saveError) {
          console.warn('Failed to save search query:', saveError);
        }
      }
      
      setSuccess(`Found ${keywordList.length} keywords`);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error('❌ Error searching keywords:', {
        error: err,
        message: err.message,
        stack: err.stack,
        name: err.name,
      });
      
      // Provide more detailed error message
      let errorMessage = 'Failed to search keywords';
      if (err.message) {
        errorMessage = err.message;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err?.error) {
        errorMessage = String(err.error);
      }
      
      setError(errorMessage);
      setKeywords([]);
      setClusters([]);
      setEnhancedAnalysis({});
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
    setSelectedKeywords(new Set(keywords.map(k => k.keyword)));
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

    if (!cloudRunStatus.isHealthy) {
      if (cloudRunStatus.isWakingUp) {
        setError('The API is starting up. Please wait a moment and try again.');
        return;
      }
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
      setSuccess(null);

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

      const { data: userProfile } = await supabase
        .from('users')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

      if (!userProfile) {
        setError('User organization not found');
        return;
      }

      const sessionId = workflowSession.session_id || localStorage.getItem('workflow_session_id');
      if (!sessionId) {
        setError('Workflow session ID not found');
        return;
      }

      const name = collectionName || `Keywords for ${searchQuery}`;

      const { data: existingData } = await supabase
        .from('keyword_collections')
        .select('collection_id')
        .eq('session_id', sessionId)
        .limit(1);

      const existing = existingData && existingData.length > 0 ? existingData[0] : null;

      const collectionData = {
        session_id: sessionId,
        org_id: workflowSession.org_id || userProfile.org_id,
        created_by: user.id,
        name,
        keywords: keywords,
        search_query: searchQuery,
        niche: niche
      };

      let result;
      if (existing) {
        const { data, error } = await supabase
          .from('keyword_collections')
          .update(collectionData)
          .eq('collection_id', existing.collection_id)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      } else {
        const { data, error } = await supabase
          .from('keyword_collections')
          .insert(collectionData)
          .select()
          .single();
        
        if (error) throw error;
        result = data;
      }

      // Update workflow session
      const workflowData = workflowSession.workflow_data || {};
      await supabase
        .from('workflow_sessions')
        .update({
          current_step: 'keywords',
          completed_steps: ['objective', 'keywords'],
          workflow_data: {
            ...workflowData,
            saved_keywords: keywords.map(kw => ({
              keyword: kw.keyword,
              search_volume: kw.search_volume,
              difficulty: kw.difficulty,
              competition: kw.competition,
              cpc: kw.cpc,
              parent_topic: kw.parent_topic,
              cluster_score: kw.cluster_score,
            })),
            keyword_collection_id: result?.collection_id
          }
        })
        .eq('session_id', sessionId);

      setSuccess(`Collection "${name}" saved successfully!`);
      setShowSuccessModal(true);
      setTimeout(() => setSuccess(null), 5000);
    } catch (err: any) {
      console.error('Error saving collection:', err);
      setError(err.message || 'Failed to save keyword collection');
    } finally {
      setLoading(false);
    }
  };

  // Get primary keyword metrics
  const primaryMetrics = primaryKeyword && enhancedAnalysis[primaryKeyword] 
    ? enhancedAnalysis[primaryKeyword]
    : keywords.find(k => k.keyword === primaryKeyword);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
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
          <button
            onClick={() => setShowSavedSearches(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600"
          >
            <History className="h-4 w-4" />
            Saved Searches
          </button>
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
      
      {cloudRunStatus.isHealthy && !cloudRunStatus.isWakingUp && (
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 flex-shrink-0" />
              <div className="flex-1">
                <div className="font-medium text-green-800 dark:text-green-200">
                  API is Active
                </div>
                <div className="text-sm text-green-700 dark:text-green-300 mt-1">
                  Cloud Run service is ready. You can now use all features.
                </div>
                {cloudRunStatus.lastChecked && (
                  <div className="text-xs text-green-600 dark:text-green-400 mt-1">
                    Last checked: {cloudRunStatus.lastChecked.toLocaleTimeString()}
                  </div>
                )}
              </div>
            </div>
            {cloudRunStatus.isChecking && (
              <Loader2 className="h-4 w-4 text-green-600 dark:text-green-400 animate-spin" />
            )}
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
      {success && (
        <div className="mb-6">
          <Alert 
            variant="success" 
            title="Success!" 
            message={success}
          />
        </div>
      )}

      {/* Advanced Search Form */}
      <div className="mb-6">
        <AdvancedSearchForm
          onSearch={handleAdvancedSearch}
          loading={searching}
          defaultQuery={searchQuery}
          defaultLocation={location}
          defaultSearchType={searchType}
        />
      </div>

      {/* Overview Cards - Show when we have primary keyword data */}
      {primaryKeyword && primaryMetrics && (
        <div className="mb-6">
          <KeywordOverviewCards
            keyword={primaryKeyword}
            metrics={primaryMetrics}
            location={location}
            locationUsed={locationUsed}
          />
        </div>
      )}

      {/* Bulk Actions Toolbar */}
      {keywords.length > 0 && selectedKeywords.size > 0 && (
        <div className="mb-6">
          <BulkActionsToolbar
            selectedCount={selectedKeywords.size}
            totalCount={keywords.length}
            onSelectAll={selectAllKeywords}
            onClearSelection={deselectAllKeywords}
            onExportCSV={() => {
              // Export to CSV
              const csv = [
                ['Keyword', 'Search Volume', 'Difficulty', 'Competition', 'CPC'].join(','),
                ...keywords.filter(k => selectedKeywords.has(k.keyword)).map(k => [
                  k.keyword,
                  k.search_volume || 0,
                  k.difficulty || 'medium',
                  k.competition || 0,
                  k.cpc || 0,
                ].join(','))
              ].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `keywords-${Date.now()}.csv`;
              a.click();
            }}
            onSendToBrief={() => {
              // TODO: Implement send to brief
              setSuccess('Keywords sent to content brief generator');
            }}
            onAddToCluster={() => {
              // TODO: Implement add to cluster
              setSuccess('Keywords added to cluster');
            }}
            onCreateList={() => {
              // TODO: Implement create list
              setSuccess('Keyword list created');
            }}
          />
        </div>
      )}

      {/* Keyword Detail Tabs */}
      {keywords.length > 0 && primaryKeyword && (
        <div className="mb-6">
          <KeywordDetailTabs
            primaryKeyword={primaryKeyword}
            keywords={keywords}
            clusters={clusters}
            serpData={undefined}
            onSelectKeywords={(kwList) => {
              setSelectedKeywords(new Set(kwList));
            }}
            onCreateBlog={(keyword, st) => {
              router.push(`/admin/drafts/new?keyword=${encodeURIComponent(keyword)}&search_type=${st || searchType}&niche=${encodeURIComponent(niche)}`);
            }}
            searchType={searchType}
          />
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
                onClick={async () => {
                  if (keywords.length > 0) {
                    try {
                      await handleSaveCollection();
                      await new Promise(resolve => setTimeout(resolve, 500));
                      router.push('/admin/workflow/clusters');
                    } catch (err: any) {
                      console.error('Error saving collection before navigation:', err);
                    }
                  } else {
                    router.push('/admin/workflow/clusters');
                  }
                }}
                disabled={keywords.length === 0 || loading}
                className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Continue to Clustering
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
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
            Use the advanced search form above to discover high-value keywords for your content strategy
          </p>
        </div>
      )}

      {/* Saved Searches Panel */}
      {showSavedSearches && (
        <Modal
          isOpen={showSavedSearches}
          onClose={() => setShowSavedSearches(false)}
          className="max-w-6xl max-h-[90vh] overflow-y-auto"
        >
          <div className="p-6">
            <SavedSearchesPanel
              onRerunSearch={(searchParams) => {
                handleAdvancedSearch({
                  query: searchParams.search_query || '',
                  location: searchParams.location || 'United States',
                  language: searchParams.language || 'en',
                  searchType: searchParams.search_type || 'general',
                  niche: searchParams.niche || '',
                  searchMode: 'keywords',
                  saveSearch: false,
                });
                setShowSavedSearches(false);
              }}
            />
          </div>
        </Modal>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <Modal
          isOpen={showSuccessModal}
          onClose={() => {
            setShowSuccessModal(false);
            setSuccess(null);
          }}
          className="max-w-md"
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
                onClick={() => {
                  setShowSuccessModal(false);
                  setSuccess(null);
                }}
                className="px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors font-medium"
              >
                Continue
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
