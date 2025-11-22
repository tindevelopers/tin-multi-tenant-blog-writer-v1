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
  // New enhanced fields
  global_search_volume?: number;
  related_keywords_enhanced?: Array<{
    keyword: string;
    search_volume: number;
    cpc: number;
    competition: number;
    difficulty_score: number;
  }>;
  questions?: Array<{
    keyword: string;
    search_volume: number;
    cpc: number;
    competition: number;
    difficulty_score: number;
  }>;
  topics?: Array<{
    keyword: string;
    search_volume: number;
    cpc: number;
    competition: number;
    difficulty_score: number;
  }>;
  // SERP data
  serp_features?: string[];
  serp_features_object?: {
    has_featured_snippet?: boolean;
    has_people_also_ask?: boolean;
    has_videos?: boolean;
    has_images?: boolean;
  };
  serp_feature_counts?: Record<string, number>;
  people_also_ask?: Array<{
    question: string;
    snippet?: string;
    url?: string;
    title?: string;
    description?: string;
  }>;
  featured_snippet?: {
    title: string;
    snippet: string;
    url: string;
  };
  organic_results?: Array<{
    title: string;
    url: string;
    domain: string;
    snippet: string;
    position: number;
  }>;
  video_results?: Array<{
    title: string;
    url: string;
    thumbnail: string;
    duration?: string;
  }>;
  image_results?: Array<{
    title: string;
    url: string;
    thumbnail: string;
  }>;
  related_searches?: string[];
  top_domains?: Array<{
    domain: string;
    rank?: number;
    count?: number;
    backlinks?: number;
  }>;
  content_gaps?: string[];
  competition_level?: string;
  // Intent data
  primary_intent?: string;
  intent_probabilities?: Record<string, number>;
  // Additional metrics
  traffic_potential?: number;
  clicks?: number;
  cps?: number;
  ai_search_volume?: number;
  ai_trend?: number;
  also_rank_for?: string[];
  also_talk_about?: string[];
  top_competitors?: string[];
  first_seen?: string;
  last_updated?: string;
  // Discovery data references (shared across keywords)
  discovery_matching_terms?: Array<{
    keyword: string;
    search_volume: number;
    keyword_difficulty: number;
    cpc: number;
    competition: number;
    parent_topic?: string;
    intent?: string;
  }>;
  discovery_questions?: Array<{
    keyword: string;
    search_volume: number;
    keyword_difficulty: number;
    cpc: number;
    competition: number;
    parent_topic?: string;
    intent?: string;
  }>;
  discovery_related_terms?: Array<{
    keyword: string;
    search_volume: number;
    keyword_difficulty: number;
    cpc: number;
    competition: number;
    parent_topic?: string;
    intent?: string;
  }>;
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
  
  // Streaming progress state
  const [streamingProgress, setStreamingProgress] = useState<{
    stage: string;
    progress: number;
    details?: string;
  } | null>(null);
  const [useStreaming, setUseStreaming] = useState<boolean>(true); // Enable streaming by default
  
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
  const [expandedKeywords, setExpandedKeywords] = useState<Set<string>>(new Set());
  
  // v1.3.3 Customization options
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);
  const [searchType, setSearchType] = useState<string>('enhanced_keyword_analysis');
  const [serpDepth, setSerpDepth] = useState<number>(20);
  const [serpAnalysisType, setSerpAnalysisType] = useState<'basic' | 'ai_summary' | 'both'>('both');
  const [relatedKeywordsDepth, setRelatedKeywordsDepth] = useState<number>(1);
  const [relatedKeywordsLimit, setRelatedKeywordsLimit] = useState<number>(20);
  const [keywordIdeasLimit, setKeywordIdeasLimit] = useState<number>(50);
  const [keywordIdeasType, setKeywordIdeasType] = useState<'all' | 'questions' | 'topics'>('all');
  const [includeAiVolume, setIncludeAiVolume] = useState<boolean>(true);
  
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

              // Only load saved keywords if they exist and are valid
              if (savedKeywords && savedKeywords.length > 0) {
              setKeywords(savedKeywords);
              setCollectionName(collection.name || '');
              generateClusters(savedKeywords);
              } else {
                // Clear if collection exists but has no valid keywords
                setKeywords([]);
                setClusters([]);
                setCollectionName('');
              }
              
              // If there's a saved search query in workflow_data, use it
              const workflowData = session.workflow_data as Record<string, unknown> | null;
              if (workflowData?.search_query && typeof workflowData.search_query === 'string') {
                setSearchQuery(workflowData.search_query);
              } else {
                // Clear search query if no saved query
                setSearchQuery('');
              }
            } else {
              // No saved collection - clear everything to avoid artifacts
              setKeywords([]);
              setClusters([]);
              setSelectedKeywords(new Set());
              setCollectionName('');
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
      const totalVolume = kws.reduce((sum, k) => sum + (k.search_volume ?? 0), 0);
      const avgDifficulty = kws.reduce((sum, k) => {
        const diff = k.difficulty === 'easy' ? 0.33 : k.difficulty === 'medium' ? 0.66 : 1.0;
        return sum + diff;
      }, 0) / kws.length;
      // Calculate average competition, excluding 0 values (which indicate no data)
      const validCompetitions = kws
        .map(k => k.competition)
        .filter((c): c is number => c !== null && c !== undefined && c > 0);
      const avgCompetition = validCompetitions.length > 0
        ? validCompetitions.reduce((sum, c) => sum + c, 0) / validCompetitions.length
        : 0;
      
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

  // Format competition percentage (handles 0.0 as "N/A")
  const formatCompetition = (competition: number | null | undefined): string => {
    if (competition === null || competition === undefined || competition === 0) {
      return 'N/A';
    }
    return `${(competition * 100).toFixed(0)}%`;
  };

  // Get competition level (Low/Medium/High)
  const getCompetitionLevel = (competition: number | null | undefined): 'Low' | 'Medium' | 'High' | 'N/A' => {
    if (competition === null || competition === undefined || competition === 0) {
      return 'N/A';
    }
    if (competition < 0.3) return 'Low';
    if (competition < 0.7) return 'Medium';
    return 'High';
  };

  // Get competition level color classes
  const getCompetitionColorClasses = (competition: number | null | undefined): string => {
    const level = getCompetitionLevel(competition);
    switch (level) {
      case 'Low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'Medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'High':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
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

  // Search keywords with streaming support
  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search query');
      return;
    }

    try {
      setSearching(true);
      setError(null);
      setSuccess(null);
      setStreamingProgress(null);
      
      // Clear old results when starting a new search
      setKeywords([]);
      setClusters([]);
      setSelectedKeywords(new Set());
      setCurrentPage(1); // Reset pagination
      setCollectionName(''); // Clear collection name

      // Build request with v1.3.3 customization options
      const analysisRequest: any = {
        keywords: [searchQuery],
        location: location,
        language: 'en',
        search_type: searchType,
        include_serp: searchType !== 'quick_analysis',
        max_suggestions_per_keyword: searchType === 'quick_analysis' ? 10 : searchType === 'comprehensive_analysis' ? 150 : 75,
      };
      
      // Add advanced options if enabled
      if (showAdvancedOptions || searchType === 'comprehensive_analysis' || searchType === 'competitor_analysis') {
        analysisRequest.serp_depth = serpDepth;
        analysisRequest.serp_analysis_type = serpAnalysisType;
        analysisRequest.related_keywords_depth = relatedKeywordsDepth;
        analysisRequest.related_keywords_limit = relatedKeywordsLimit;
        analysisRequest.keyword_ideas_limit = keywordIdeasLimit;
        analysisRequest.keyword_ideas_type = keywordIdeasType;
        analysisRequest.include_ai_volume = includeAiVolume;
      }
      
      // Use streaming endpoint if enabled
      if (useStreaming) {
        await handleStreamingSearch(analysisRequest);
      } else {
        await handleRegularSearch(analysisRequest);
      }
    } catch (err: any) {
      console.error('Error searching keywords:', err);
      let errorMessage = 'Failed to search keywords';
      if (err instanceof Error) {
        errorMessage = err.message || errorMessage;
      } else if (typeof err === 'string') {
        errorMessage = err;
      } else if (err && typeof err === 'object' && 'message' in err) {
        errorMessage = String(err.message);
      }
      setError(errorMessage);
      setSearching(false);
      setStreamingProgress(null);
    }
  };

  // Regular (non-streaming) search
  const handleRegularSearch = async (analysisRequest: any) => {
    const response = await fetch('/api/keywords/analyze', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(analysisRequest),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `Failed to analyze keywords: ${response.statusText}`);
    }
    
    const researchResults = await response.json();
    await processSearchResults(researchResults);
    setSearching(false);
  };

  // Streaming search with real-time progress
  const handleStreamingSearch = async (analysisRequest: any) => {
    const response = await fetch('/api/keywords/analyze/stream', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(analysisRequest),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(errorData.error || `Failed to analyze keywords: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();
    
    if (!reader) {
      throw new Error('No response body available');
    }

    let buffer = '';
    let finalResult: any = null;
    let lastProgressEvent: any = null;
    let completedEventWithData: any = null; // Track the completed event that has data
    let progressReached100 = false;

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || ''; // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              
              // Handle progress updates
              if (data.type === 'progress' || data.stage) {
                const progress = data.progress_percentage || data.progress || 0;
                const stage = data.stage || 'processing';
                const details = data.details || data.status || data.message || '';
                
                // Track if progress reached 100%
                if (progress >= 100) {
                  progressReached100 = true;
                }
                
                // Store the last progress event in case it contains result data
                lastProgressEvent = data;
                
                // Track completed event WITH data (not the final "end" event)
                if (stage === 'completed' && data.data?.result) {
                  completedEventWithData = data;
                  console.log('✅ Found completed event with result data');
                }
                
                setStreamingProgress({
                  stage: formatStageName(stage),
                  progress: Math.min(Math.max(progress, 0), 100),
                  details: details,
                });
                
                // Backend format: { stage: "completed", progress: 100, data: { result: { enhanced_analysis: {...}, total_keywords: 1 } } }
                // When stage === 'completed' AND has data.result, extract immediately
                if (stage === 'completed' && data.data?.result) {
                  console.log('✅ Extracting result from completed event');
                  finalResult = data.data.result;
                  await processSearchResults(finalResult);
                  setStreamingProgress(null);
                  setSearching(false);
                  return;
                }
                
                // Also check if this progress event contains result data nested in data.result (for any stage)
                if (data.data?.result) {
                  console.log('✅ Found result data in progress event');
                  finalResult = data.data.result;
                  await processSearchResults(finalResult);
                  setStreamingProgress(null);
                  setSearching(false);
                  return;
                }
                
                // Also check if data.data contains enhanced_analysis directly
                if (data.data?.enhanced_analysis || data.data?.keyword_analysis) {
                  console.log('✅ Found enhanced_analysis in data.data');
                  finalResult = data.data;
                  await processSearchResults(finalResult);
                  setStreamingProgress(null);
                  setSearching(false);
                  return;
                }
              }
              
              // Handle "end" event (type: "end", stage: "completed" but no data)
              // This is sent AFTER the actual completed event with data
              if (data.type === 'end' && data.stage === 'completed') {
                console.log('📨 Received end event - stream closing');
                // Don't update lastProgressEvent with this, keep the one with data
                continue;
              }
              
              // Handle final result - check multiple formats
              if (data.type === 'result' || data.type === 'complete') {
                finalResult = data.result || data;
                await processSearchResults(finalResult);
                setStreamingProgress(null);
                setSearching(false);
                return;
              }
              
              // Check if this event contains analysis data (even without type field)
              if (data.enhanced_analysis || data.keyword_analysis) {
                finalResult = data;
                await processSearchResults(finalResult);
                setStreamingProgress(null);
                setSearching(false);
                return;
              }
              
              // Check nested data.result for analysis data (backend format)
              if (data.data?.result?.enhanced_analysis || data.data?.result?.keyword_analysis) {
                finalResult = data.data.result;
                await processSearchResults(finalResult);
                setStreamingProgress(null);
                setSearching(false);
                return;
              }
              
              // Handle errors
              if (data.type === 'error') {
                throw new Error(data.error || 'Streaming error occurred');
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e, line);
            }
          }
        }
      }
      
      // If stream completed and progress reached 100%, check for result data
      // Backend sends: Event #N with { stage: "completed", progress: 100, data: { result: {...} } }
      // Then Event #N+1 with { type: "end", stage: "completed" } (no data)
      // So we need to check completedEventWithData first, not lastProgressEvent
      if (progressReached100 && !finalResult) {
        // First check the completed event that we tracked (has data.result)
        if (completedEventWithData?.data?.result) {
          console.log('✅ Found result in completedEventWithData.data.result');
          finalResult = completedEventWithData.data.result;
          await processSearchResults(finalResult);
          setStreamingProgress(null);
          setSearching(false);
          return;
        }
        
        // Check if last progress event has result data nested in data.result
        if (lastProgressEvent?.data?.result) {
          console.log('✅ Found result in lastProgressEvent.data.result');
          finalResult = lastProgressEvent.data.result;
          await processSearchResults(finalResult);
          setStreamingProgress(null);
          setSearching(false);
          return;
        }
        
        // Check if last progress event has result data nested in data.enhanced_analysis
        if (lastProgressEvent?.data?.enhanced_analysis || lastProgressEvent?.data?.keyword_analysis) {
          console.log('✅ Found result in lastProgressEvent.data (enhanced_analysis/keyword_analysis)');
          finalResult = lastProgressEvent.data;
          await processSearchResults(finalResult);
          setStreamingProgress(null);
          setSearching(false);
          return;
        }
        
        // Check if last progress event has result data at top level
        if (lastProgressEvent?.enhanced_analysis || lastProgressEvent?.keyword_analysis) {
          console.log('✅ Found result in lastProgressEvent (top-level)');
          finalResult = lastProgressEvent;
          await processSearchResults(finalResult);
          setStreamingProgress(null);
          setSearching(false);
          return;
        }
        
        // Last resort: fallback to regular API call
        console.warn('⚠️ Stream completed at 100% but no result found in any format. Falling back to regular API...');
        console.warn('📋 Event structures:', {
          completedEventWithData: {
            exists: !!completedEventWithData,
            hasData: !!completedEventWithData?.data,
            hasDataResult: !!completedEventWithData?.data?.result,
            stage: completedEventWithData?.stage,
            progress: completedEventWithData?.progress,
          },
          lastProgressEvent: {
            hasData: !!lastProgressEvent?.data,
            hasDataResult: !!lastProgressEvent?.data?.result,
            hasEnhancedAnalysis: !!lastProgressEvent?.data?.enhanced_analysis,
            hasKeywordAnalysis: !!lastProgressEvent?.data?.keyword_analysis,
            stage: lastProgressEvent?.stage,
            progress: lastProgressEvent?.progress,
            type: lastProgressEvent?.type,
            keys: lastProgressEvent ? Object.keys(lastProgressEvent) : [],
          },
        });
        setStreamingProgress({
          stage: 'Fetching Results',
          progress: 100,
          details: 'Streaming completed, fetching final results...',
        });
        
        // Fallback to regular API
        await handleRegularSearch(analysisRequest);
        setStreamingProgress(null);
        return;
      }
      
      // If we have a result, process it
      if (finalResult) {
        await processSearchResults(finalResult);
      } else {
        // Last resort: fallback to regular API
        console.warn('⚠️ Stream completed without result. Falling back to regular API...');
        await handleRegularSearch(analysisRequest);
      }
    } catch (error) {
      setStreamingProgress(null);
      throw error;
    } finally {
      setSearching(false);
    }
  };

  // Format stage names for display with descriptions
  const formatStageName = (stage: string): string => {
    const stageMap: Record<string, string> = {
      'initializing': 'Initializing Search',
      'detecting_location': 'Detecting Location',
      'analyzing_keywords': 'Analyzing Primary Keywords',
      'getting_suggestions': 'Fetching Keyword Suggestions',
      'analyzing_suggestions': 'Analyzing Suggested Keywords',
      'clustering_keywords': 'Clustering by Topics',
      'getting_ai_data': 'Getting AI Search Metrics',
      'getting_related_keywords': 'Finding Related Keywords',
      'getting_keyword_ideas': 'Generating Keyword Ideas',
      'analyzing_serp': 'Analyzing Search Results',
      'building_discovery': 'Building Final Results',
      'completed': 'Completed',
    };
    return stageMap[stage] || stage.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Get stage description for better UX
  const getStageDescription = (stage: string): string => {
    const descriptions: Record<string, string> = {
      'initializing': 'Preparing keyword analysis...',
      'detecting_location': 'Determining search location...',
      'analyzing_keywords': 'Analyzing search volume, competition, and difficulty...',
      'getting_suggestions': 'Finding keyword suggestions from search engines...',
      'analyzing_suggestions': 'Evaluating suggested keywords...',
      'clustering_keywords': 'Grouping keywords by parent topics...',
      'getting_ai_data': 'Fetching AI-powered search metrics...',
      'getting_related_keywords': 'Discovering related keyword opportunities...',
      'getting_keyword_ideas': 'Generating question and topic keywords...',
      'analyzing_serp': 'Analyzing top search results...',
      'building_discovery': 'Compiling final keyword recommendations...',
      'completed': 'Analysis complete!',
    };
    return descriptions[stage] || 'Processing...';
  };

  // Process search results (extract keywords, fetch metrics, etc.)
  const processSearchResults = async (researchResults: any) => {
      // Extract keywords from research results
      // v1.3.4: Response structure can be:
      // - { enhanced_analysis: { "keyword": {...data} }, ... } (from enhanced endpoint)
      // - { keyword_analysis: { "keyword": {...data} }, ... } (from regular endpoint)
      // - Also includes: serp_analysis, discovery, suggested_keywords, clusters
      const keywordAnalysis = researchResults.enhanced_analysis || 
                              researchResults.keyword_analysis || 
                              {};
      
      // Extract SERP analysis and discovery data
      const serpAnalysis = researchResults.serp_analysis || {};
      const discovery = researchResults.discovery || {};
      const suggestedKeywords = researchResults.suggested_keywords || [];
      const clusters = researchResults.clusters || [];
      
      // Store discovery data globally for display (not per-keyword)
      const discoveryData = {
        matching_terms: discovery.matching_terms || [],
        questions: discovery.questions || [],
        related_terms: discovery.related_terms || [],
      };
      
      console.log('📊 Extracted data:', {
        keywordsCount: Object.keys(keywordAnalysis).length,
        hasSerpAnalysis: !!serpAnalysis && Object.keys(serpAnalysis).length > 0,
        hasDiscovery: !!discovery && Object.keys(discovery).length > 0,
        matchingTermsCount: discoveryData.matching_terms.length,
        discoveryQuestionsCount: discoveryData.questions.length,
        relatedTermsCount: discoveryData.related_terms.length,
        suggestedKeywordsCount: suggestedKeywords.length,
        clustersCount: clusters.length,
      });
      
      // IMPORTANT: Extract ALL keywords including nested related_keywords and long_tail_keywords
      // The API returns the main keyword in enhanced_analysis, but related keywords are nested
      // We need to extract them and create separate keyword entries
      const allExtractedKeywords: Record<string, any> = { ...keywordAnalysis };
      
      // Step 1: Collect all related and long-tail keywords that need metrics
      const keywordsNeedingMetrics: string[] = [];
      
      Object.entries(keywordAnalysis).forEach(([mainKeyword, kwData]: [string, any]) => {
        // Merge SERP analysis data if available for this keyword
        if (serpAnalysis[mainKeyword] || serpAnalysis.keyword === mainKeyword) {
          const serpData = serpAnalysis[mainKeyword] || serpAnalysis;
          kwData.serp_analysis = serpData;
          kwData.people_also_ask = serpData.people_also_ask || kwData.people_also_ask;
          kwData.featured_snippet = serpData.featured_snippet || kwData.featured_snippet;
          kwData.organic_results = serpData.organic_results || kwData.organic_results;
          kwData.video_results = serpData.video_results || kwData.video_results;
          kwData.image_results = serpData.image_results || kwData.image_results;
          kwData.related_searches = serpData.related_searches || kwData.related_searches;
          kwData.top_domains = serpData.top_domains || kwData.top_domains;
          kwData.content_gaps = serpData.content_gaps || kwData.content_gaps;
          kwData.competition_level = serpData.competition_level || kwData.competition_level;
          // Merge serp_features if available (can be object with boolean flags or array)
          if (serpData.serp_features) {
            // Handle both formats: object with boolean flags or array of strings
            if (typeof serpData.serp_features === 'object' && !Array.isArray(serpData.serp_features)) {
              // Object format: { has_featured_snippet: true, has_people_also_ask: true, ... }
              kwData.serp_features_object = serpData.serp_features;
              // Convert to array for display
              kwData.serp_features = Object.entries(serpData.serp_features)
                .filter(([_, value]) => value === true)
                .map(([key]) => key.replace(/has_/g, '').replace(/_/g, ' '));
            } else {
              // Array format: ['featured_snippet', 'people_also_ask', ...]
              kwData.serp_features = serpData.serp_features;
            }
          }
        }
        
        // Add discovery data references (for display purposes)
        kwData.discovery_matching_terms = discoveryData.matching_terms;
        kwData.discovery_questions = discoveryData.questions;
        kwData.discovery_related_terms = discoveryData.related_terms;
        
        // Collect related_keywords
        if (kwData?.related_keywords && Array.isArray(kwData.related_keywords)) {
          kwData.related_keywords.forEach((relatedKw: string) => {
            if (relatedKw && !allExtractedKeywords[relatedKw]) {
              keywordsNeedingMetrics.push(relatedKw);
              // Create placeholder entry (will be updated with metrics)
              allExtractedKeywords[relatedKw] = {
                keyword: relatedKw,
                search_volume: null,
                difficulty: kwData.difficulty || 'medium',
                competition: kwData.competition ?? 0,
                cpc: kwData.cpc ?? null,
                parent_topic: mainKeyword,
                related_to: mainKeyword,
                is_related: true,
              };
            }
          });
        }
        
        // Collect long_tail_keywords
        if (kwData?.long_tail_keywords && Array.isArray(kwData.long_tail_keywords)) {
          kwData.long_tail_keywords.forEach((longTailKw: string) => {
            if (longTailKw && !allExtractedKeywords[longTailKw]) {
              keywordsNeedingMetrics.push(longTailKw);
              allExtractedKeywords[longTailKw] = {
                keyword: longTailKw,
                search_volume: null,
                difficulty: kwData.difficulty || 'medium',
                competition: kwData.competition ?? 0,
                cpc: kwData.cpc ?? null,
                parent_topic: mainKeyword,
                related_to: mainKeyword,
                is_long_tail: true,
              };
            }
          });
        }
      });
      
      // Also check for top-level suggested_keywords
      if (researchResults.suggested_keywords && Array.isArray(researchResults.suggested_keywords)) {
        researchResults.suggested_keywords.forEach((suggestedKw: string) => {
          if (suggestedKw && !allExtractedKeywords[suggestedKw]) {
            keywordsNeedingMetrics.push(suggestedKw);
            allExtractedKeywords[suggestedKw] = {
              keyword: suggestedKw,
              search_volume: null,
              difficulty: 'medium',
              competition: 0,
              cpc: null,
              is_suggested: true,
            };
          }
        });
      }
      
      // Step 2: Fetch metrics for all related/long-tail keywords in batch
      if (keywordsNeedingMetrics.length > 0) {
        try {
          // Update progress if streaming
          if (useStreaming && streamingProgress) {
            setStreamingProgress({
              ...streamingProgress,
              stage: 'Fetching Metrics',
              details: `Getting metrics for ${keywordsNeedingMetrics.length} related keywords...`,
            });
          }
          
          console.log(`📊 Fetching metrics for ${keywordsNeedingMetrics.length} related keywords...`);
          const metricsResponse = await fetch('/api/keywords/analyze', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              keywords: keywordsNeedingMetrics,
              location: location,
              language: 'en',
              include_search_volume: true,
            }),
          });
          
          if (metricsResponse.ok) {
            const metricsData = await metricsResponse.json();
            const metricsAnalysis = metricsData.enhanced_analysis || metricsData.keyword_analysis || {};
            
            // Update extracted keywords with fetched metrics
            Object.entries(metricsAnalysis).forEach(([keyword, kwMetrics]: [string, any]) => {
              if (allExtractedKeywords[keyword]) {
                allExtractedKeywords[keyword] = {
                  ...allExtractedKeywords[keyword],
                  search_volume: kwMetrics?.search_volume ?? null,
                  difficulty: kwMetrics?.difficulty || allExtractedKeywords[keyword].difficulty,
                  competition: kwMetrics?.competition ?? allExtractedKeywords[keyword].competition,
                  cpc: kwMetrics?.cpc ?? allExtractedKeywords[keyword].cpc,
                };
              }
            });
            
            console.log(`✅ Updated metrics for ${Object.keys(metricsAnalysis).length} keywords`);
          } else {
            console.warn('⚠️ Failed to fetch metrics for related keywords:', metricsResponse.statusText);
          }
        } catch (metricsError) {
          console.error('❌ Error fetching metrics for related keywords:', metricsError);
          // Continue without metrics - keywords will show with placeholder values
        }
      }
      
      // Filter out single-word keywords that don't make sense as standalone keywords
      // Keep only phrases (2+ words) or meaningful single words
      const filteredKeywordEntries = Object.entries(allExtractedKeywords).filter(([keyword]) => {
        const wordCount = keyword.trim().split(/\s+/).length;
        // Keep phrases (2+ words) or single words that are meaningful (length > 5)
        return wordCount > 1 || keyword.trim().length > 5;
      });
      
      const keywordList: KeywordWithMetrics[] = filteredKeywordEntries.map(([keyword, data]: [string, any]) => {
        // Extract search_volume from various possible locations
        const searchVolume = data?.search_volume 
          ?? data?.volume 
          ?? data?.monthly_searches?.[0]?.search_volume
          ?? data?.metadata?.search_volume 
          ?? data?.metadata?.volume
          ?? null;
        
        return {
          keyword,
          search_volume: searchVolume, // Preserve null from API, don't convert to 0
          global_search_volume: data?.global_search_volume ?? null,
          difficulty: data?.difficulty || 'medium',
          competition: data?.competition ?? 0,
          cpc: data?.cpc ?? null,
          trend_score: data?.trend_score ?? null,
          recommended: data?.recommended ?? false,
          reason: data?.reason || '',
          related_keywords: data?.related_keywords || [],
          long_tail_keywords: data?.long_tail_keywords || [],
          // Enhanced related keywords with metrics
          related_keywords_enhanced: data?.related_keywords_enhanced || null,
          // Question and topic keywords
          questions: data?.questions || null,
          topics: data?.topics || null,
          // Include clustering data from API
          parent_topic: data?.parent_topic,
          cluster_score: data?.cluster_score,
          category_type: data?.category_type,
          // SERP data
          serp_features: data?.serp_features || [],
          serp_feature_counts: data?.serp_feature_counts || {},
          people_also_ask: data?.people_also_ask || [],
          featured_snippet: data?.featured_snippet || null,
          organic_results: data?.organic_results || [],
          video_results: data?.video_results || [],
          image_results: data?.image_results || [],
          related_searches: data?.related_searches || [],
          top_domains: data?.top_domains || [],
          content_gaps: data?.content_gaps || [],
          // Intent data
          primary_intent: data?.primary_intent || null,
          intent_probabilities: data?.intent_probabilities || {},
          // Additional metrics
          traffic_potential: data?.traffic_potential ?? null,
          clicks: data?.clicks ?? null,
          cps: data?.cps ?? null,
          ai_search_volume: data?.ai_search_volume ?? null,
          ai_trend: data?.ai_trend ?? null,
          also_rank_for: data?.also_rank_for || [],
          also_talk_about: data?.also_talk_about || [],
          top_competitors: data?.top_competitors || [],
          first_seen: data?.first_seen || null,
          last_updated: data?.last_updated || null,
          competition_level: data?.competition_level || null,
          serp_features_object: data?.serp_features_object || null,
          // Discovery data references
          discovery_matching_terms: data?.discovery_matching_terms || [],
          discovery_questions: data?.discovery_questions || [],
          discovery_related_terms: data?.discovery_related_terms || [],
        };
      });

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

  // Toggle keyword expansion
  const toggleKeywordExpansion = (keyword: string) => {
    const newExpanded = new Set(expandedKeywords);
    if (newExpanded.has(keyword)) {
      newExpanded.delete(keyword);
    } else {
      newExpanded.add(keyword);
    }
    setExpandedKeywords(newExpanded);
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
    console.log('💾 handleSaveCollection called', {
      keywordCount: keywords.length,
      hasWorkflowSession: !!workflowSession,
      cloudRunHealthy: cloudRunStatus.isHealthy
    });

    if (keywords.length === 0) {
      setError('No keywords to save');
      setLoading(false);
      return;
    }

    // Check if Cloud Run is available before saving
    if (!cloudRunStatus.isHealthy) {
      if (cloudRunStatus.isWakingUp) {
        setError('The API is starting up. Please wait a moment and try again.');
        setLoading(false);
        return;
      }
      
      // Try to wake it up if not already waking up
      setError('Waking up the API...');
      const wakeStatus = await cloudRunStatus.wakeUpAndWait();
      
      if (!wakeStatus.isHealthy) {
        setError(wakeStatus.error || 'The API is still starting up. Please wait a moment and try again.');
        setLoading(false);
        return;
      }
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);
      setShowSuccessModal(false); // Ensure modal is closed before starting

      const supabase = createClient();
      
      // Get user with better error handling
      let user;
      try {
        const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
        if (authError) {
          throw new Error(`Authentication error: ${authError.message}`);
        }
        if (!authUser) {
          throw new Error('Please log in to save collections');
        }
        user = authUser;
      } catch (authErr: any) {
        const errorMsg = authErr.message || 'Please log in to save collections';
        setError(errorMsg);
        setLoading(false);
        return;
      }

      if (!workflowSession) {
        setError('Workflow session not found. Please start a new workflow.');
        setLoading(false);
        return;
      }

      // Get user's org_id
      const { data: userProfile, error: userError } = await supabase
        .from('users')
        .select('org_id')
        .eq('user_id', user.id)
        .single();

      if (userError || !userProfile) {
        setError(`User organization not found: ${userError?.message || 'Unknown error'}`);
        setLoading(false);
        return;
      }

      const sessionId = workflowSession.session_id || localStorage.getItem('workflow_session_id');
      if (!sessionId) {
        setError('Workflow session ID not found');
        setLoading(false);
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
        hasExisting: !!existing,
        collectionName: name,
        searchQuery: searchQuery,
        keywordsSample: keywords.slice(0, 3).map(k => ({
          keyword: k.keyword,
          search_volume: k.search_volume,
          difficulty: k.difficulty
        }))
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
          throw new Error(`Failed to update collection: ${error.message || error.code || 'Unknown error'}`);
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
          throw new Error(`Failed to create collection: ${error.message || error.code || 'Unknown error'}`);
        }
        result = data;
        console.log('✅ Created new collection:', result?.collection_id);
      }

      // Also save keywords to workflow_data for easy access
      const workflowData = workflowSession.workflow_data || {};
      const { error: workflowUpdateError } = await supabase
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
              category_type: kw.category_type
            })),
            keyword_collection_id: result?.collection_id
          }
        })
        .eq('session_id', sessionId);

      if (workflowUpdateError) {
        console.warn('⚠️ Failed to update workflow session:', workflowUpdateError);
        // Don't throw - collection was saved successfully
      }

      // Verify the save was successful
      if (!result) {
        throw new Error('Collection save returned no data');
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
      setSuccess(`Collection "${name}" saved successfully!`);
      
      console.log('✅ Collection save completed successfully:', {
        collectionId: result?.collection_id,
        name: name,
        keywordCount: keywords.length,
        sessionId: sessionId
      });
      
      // Show success modal immediately
      setShowSuccessModal(true);
      console.log('✅ Setting showSuccessModal to true');
      
      // Force a re-render check
      setTimeout(() => {
        console.log('✅ Modal state check - showSuccessModal should be:', showSuccessModal);
      }, 100);
      
      // Auto-hide success message after 5 seconds
      setTimeout(() => {
        setSuccess(null);
      }, 5000);
    } catch (err: any) {
      console.error('❌ Error saving collection:', err);
      const errorMessage = err.message || err.code || err.toString() || 'Failed to save keyword collection. Please check the console for details.';
      setError(errorMessage);
      setShowSuccessModal(false); // Ensure modal is closed on error
      setSuccess(null);
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
      if (minVolume > 0 && (kw.search_volume ?? 0) < minVolume) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case 'volume':
          comparison = (a.search_volume ?? 0) - (b.search_volume ?? 0);
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

  // Calculate aggregate metrics for display cards
  const aggregateMetrics = React.useMemo(() => {
    if (keywords.length === 0) {
      return {
        totalSearchVolume: 0,
        totalGlobalVolume: null,
        avgDifficulty: 'medium' as const,
        avgCompetition: 0,
        avgCPC: 0,
        trafficPotential: 0,
      };
    }

    const validVolumes = keywords
      .map(k => k.search_volume)
      .filter((v): v is number => v !== null && v !== undefined && typeof v === 'number');
    
    const totalSearchVolume = validVolumes.reduce((sum, v) => sum + v, 0);
    
    // Calculate global search volume if available
    const globalVolumes = keywords
      .map(k => k.global_search_volume)
      .filter((v): v is number => v !== null && v !== undefined && typeof v === 'number');
    const totalGlobalVolume = globalVolumes.length > 0
      ? globalVolumes.reduce((sum, v) => sum + v, 0)
      : null;
    
    const difficultyValues = keywords.map(k => {
      if (k.difficulty === 'easy' || k.difficulty === 'very_easy') return 0.33;
      if (k.difficulty === 'medium') return 0.66;
      return 1.0;
    });
    const avgDifficultyNum = difficultyValues.reduce((sum, v) => sum + v, 0) / difficultyValues.length;
    const avgDifficulty = avgDifficultyNum < 0.4 ? 'easy' : avgDifficultyNum < 0.7 ? 'medium' : 'hard';
    
    // Calculate average competition, excluding 0 values (which indicate no data)
    const validCompetitions = keywords
      .map(k => k.competition)
      .filter((c): c is number => c !== null && c !== undefined && c > 0);
    const avgCompetition = validCompetitions.length > 0
      ? validCompetitions.reduce((sum, c) => sum + c, 0) / validCompetitions.length
      : 0;
    
    const validCPCs = keywords
      .map(k => k.cpc)
      .filter((v): v is number => v !== null && v !== undefined && typeof v === 'number');
    const avgCPC = validCPCs.length > 0 
      ? validCPCs.reduce((sum, v) => sum + v, 0) / validCPCs.length 
      : 0;
    
    // Traffic potential: estimate based on search volume and competition
    // Lower competition = higher traffic potential
    const trafficPotential = validVolumes.length > 0
      ? validVolumes.reduce((sum, volume, idx) => {
          const competition = keywords[idx]?.competition;
          // Use competition if available (> 0), otherwise assume medium competition (0.5)
          const effectiveCompetition = competition && competition > 0 ? competition : 0.5;
          // Estimate: volume * (1 - competition) * 0.1 (conservative CTR)
          return sum + (volume * (1 - effectiveCompetition) * 0.1);
        }, 0)
      : 0;

    return {
      totalSearchVolume,
      totalGlobalVolume,
      avgDifficulty,
      avgCompetition,
      avgCPC,
      trafficPotential: Math.round(trafficPotential),
    };
  }, [keywords]);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3 flex-1">
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
          
          {/* Error Alert - Positioned on the right */}
          {error && (
            <div className="flex-shrink-0">
              <Alert 
                variant="error"
                title="Error"
                message={error}
              />
            </div>
          )}
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
        <div className="mb-6 bg-green-50 dark:bg-green-900/20 border-2 border-purple-200 dark:border-purple-800 rounded-lg p-4">
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

      {/* Success Alert */}
      {success && (
        <div className="mb-6">
          <Alert 
            variant="success" 
            title="Success!" 
            message={success}
          />
        </div>
      )}

      {/* Keyword Metrics Cards */}
      {keywords.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Keyword Difficulty Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Keyword Difficulty</h3>
              <Target className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex items-center gap-3">
              <div className={`w-16 h-16 rounded-full flex items-center justify-center text-2xl font-bold ${
                aggregateMetrics.avgDifficulty === 'easy' 
                  ? 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                  : aggregateMetrics.avgDifficulty === 'medium'
                  ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400'
                  : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
              }`}>
                {aggregateMetrics.avgDifficulty === 'easy' ? '30' : aggregateMetrics.avgDifficulty === 'medium' ? '60' : '80'}
              </div>
              <div>
                <div className="text-2xl font-bold text-gray-900 dark:text-white capitalize">
                  {aggregateMetrics.avgDifficulty}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                  {aggregateMetrics.avgDifficulty}
                </div>
              </div>
            </div>
          </div>

          {/* Search Volume Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Search Volume</h3>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex items-center gap-3">
              <div>
                <div className="text-3xl font-bold text-gray-900 dark:text-white">
                  {aggregateMetrics.totalSearchVolume > 0 
                    ? aggregateMetrics.totalSearchVolume.toLocaleString() 
                    : '0'}
                </div>
                {aggregateMetrics.totalGlobalVolume && aggregateMetrics.totalGlobalVolume !== aggregateMetrics.totalSearchVolume && (
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    🌍 Global: {aggregateMetrics.totalGlobalVolume.toLocaleString()}
                  </div>
                )}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                {aggregateMetrics.totalSearchVolume > 0 ? 'Total monthly searches' : 'No trend data'}
              </div>
            </div>
            {aggregateMetrics.totalSearchVolume === 0 && (
              <div className="mt-2 text-xs text-red-500 dark:text-red-400">
                0.0% trend
              </div>
            )}
          </div>

          {/* Traffic Potential Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Traffic Potential</h3>
              <TrendingUp className="w-5 h-5 text-gray-400" />
            </div>
            <div className="flex items-center gap-3">
              <div className="text-3xl font-bold text-gray-900 dark:text-white">
                {aggregateMetrics.trafficPotential > 0 
                  ? aggregateMetrics.trafficPotential.toLocaleString() 
                  : '0'}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Estimated monthly visits
              </div>
            </div>
          </div>

          {/* CPC & Competition Card */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">CPC & Competition</h3>
              <Target className="w-5 h-5 text-gray-400" />
            </div>
            <div className="space-y-2">
              <div className="text-2xl font-bold text-gray-900 dark:text-white">
                ${aggregateMetrics.avgCPC > 0 ? aggregateMetrics.avgCPC.toFixed(2) : '0.00'}
              </div>
              <div className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                Cost per click
              </div>
              {aggregateMetrics.avgCompetition > 0 ? (
                <>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                    <div
                      className={`h-2 rounded-full transition-all ${
                        aggregateMetrics.avgCompetition < 0.3
                          ? 'bg-green-600'
                          : aggregateMetrics.avgCompetition < 0.7
                          ? 'bg-yellow-600'
                          : 'bg-red-600'
                      }`}
                      style={{ width: `${(aggregateMetrics.avgCompetition * 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    Competition {formatCompetition(aggregateMetrics.avgCompetition)} ({getCompetitionLevel(aggregateMetrics.avgCompetition)})
                  </div>
                </>
              ) : (
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Competition: N/A
                </div>
              )}
            </div>
          </div>
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
        
        {/* Search Type Preset Selector (v1.3.3) */}
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            Analysis Type
          </label>
          <select
            value={searchType}
            onChange={(e) => setSearchType(e.target.value)}
            className="w-full md:w-auto px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          >
            <option value="enhanced_keyword_analysis">Enhanced Analysis (Default)</option>
            <option value="quick_analysis">Quick Analysis</option>
            <option value="competitor_analysis">Competitor Analysis</option>
            <option value="content_research">Content Research</option>
            <option value="comprehensive_analysis">Comprehensive Analysis</option>
          </select>
        </div>
        
        {/* Advanced Options Toggle (v1.3.3) */}
        <div className="mb-4">
          <button
            onClick={() => setShowAdvancedOptions(!showAdvancedOptions)}
            className="text-sm text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
          >
            {showAdvancedOptions ? '▼' : '▶'} Advanced Options
          </button>
        </div>
        
        {/* Advanced Options Panel (v1.3.3) */}
        {showAdvancedOptions && (
          <div className="mb-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  SERP Depth (5-100)
                </label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={serpDepth}
                  onChange={(e) => setSerpDepth(parseInt(e.target.value) || 20)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  SERP Analysis Type
                </label>
                <select
                  value={serpAnalysisType}
                  onChange={(e) => setSerpAnalysisType(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="both">Both</option>
                  <option value="basic">Basic</option>
                  <option value="ai_summary">AI Summary</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Related Keywords Depth (1-4)
                </label>
                <input
                  type="number"
                  min="1"
                  max="4"
                  value={relatedKeywordsDepth}
                  onChange={(e) => setRelatedKeywordsDepth(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Related Keywords Limit (5-100)
                </label>
                <input
                  type="number"
                  min="5"
                  max="100"
                  value={relatedKeywordsLimit}
                  onChange={(e) => setRelatedKeywordsLimit(parseInt(e.target.value) || 20)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Keyword Ideas Limit (10-200)
                </label>
                <input
                  type="number"
                  min="10"
                  max="200"
                  value={keywordIdeasLimit}
                  onChange={(e) => setKeywordIdeasLimit(parseInt(e.target.value) || 50)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Keyword Ideas Type
                </label>
                <select
                  value={keywordIdeasType}
                  onChange={(e) => setKeywordIdeasType(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                >
                  <option value="all">All</option>
                  <option value="questions">Questions</option>
                  <option value="topics">Topics</option>
                </select>
              </div>
              <div>
                <label className="flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={includeAiVolume}
                    onChange={(e) => setIncludeAiVolume(e.target.checked)}
                    className="rounded"
                  />
                  Include AI Volume
                </label>
              </div>
            </div>
          </div>
        )}
        
        {/* Streaming Progress Indicator */}
        {streamingProgress && searching && (
          <div className="w-full bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 rounded-lg border-2 border-blue-200 dark:border-blue-800 p-5 mb-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Loader2 className="w-5 h-5 animate-spin text-blue-600 dark:text-blue-400" />
                  <div className="absolute inset-0 border-2 border-blue-200 dark:border-blue-700 rounded-full animate-ping opacity-20"></div>
                </div>
                <div>
                  <span className="text-sm font-semibold text-gray-900 dark:text-white block">
                    {streamingProgress.stage}
                  </span>
                  <span className="text-xs text-gray-600 dark:text-gray-400">
                    {getStageDescription(streamingProgress.stage.toLowerCase().replace(/\s+/g, '_'))}
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                  {streamingProgress.progress}%
                </span>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {streamingProgress.progress < 100 ? 'In Progress' : 'Complete'}
                </div>
              </div>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 mb-2 overflow-hidden">
              <div
                className="bg-gradient-to-r from-blue-500 to-indigo-600 h-3 rounded-full transition-all duration-500 ease-out shadow-sm"
                style={{ width: `${streamingProgress.progress}%` }}
              >
                <div className="h-full bg-white opacity-30 animate-pulse"></div>
              </div>
            </div>
            {streamingProgress.details && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-2 italic">
                {streamingProgress.details}
              </p>
            )}
            {/* Stage indicator dots */}
            <div className="flex items-center gap-1 mt-3 pt-3 border-t border-gray-200 dark:border-gray-700">
              <div className="text-xs text-gray-500 dark:text-gray-400 flex-1">
                Stage {Math.floor(streamingProgress.progress / 10) + 1} of 12
              </div>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((num) => {
                  const stageProgress = (num - 1) * 8.33;
                  const isActive = streamingProgress.progress >= stageProgress;
                  const isCurrent = streamingProgress.progress >= stageProgress && streamingProgress.progress < stageProgress + 8.33;
                  return (
                    <div
                      key={num}
                      className={`w-1.5 h-1.5 rounded-full transition-all ${
                        isCurrent
                          ? 'bg-blue-600 dark:bg-blue-400 scale-150'
                          : isActive
                          ? 'bg-blue-400 dark:bg-blue-500'
                          : 'bg-gray-300 dark:bg-gray-600'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        )}
        
        {/* Streaming Toggle */}
        <div className="flex items-center gap-2 mb-4">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={useStreaming}
              onChange={(e) => setUseStreaming(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">
              Use real-time progress updates
            </span>
          </label>
        </div>
        
        <button
          onClick={handleSearch}
          disabled={searching || !searchQuery.trim()}
          className="w-full md:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors font-medium flex items-center justify-center gap-2"
        >
          {searching ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              {streamingProgress ? streamingProgress.stage : 'Searching...'}
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
                    Intent
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    SERP Features
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Parent Topic
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Details
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedKeywords.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                      No keywords match your filters
                    </td>
                  </tr>
                ) : (
                  paginatedKeywords.map((kw) => (
                    <React.Fragment key={kw.keyword}>
                  <tr
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
                      <div className="flex flex-col gap-1">
                        {kw.search_volume !== null && kw.search_volume !== undefined 
                          ? (
                            <>
                              <span className="font-semibold">{kw.search_volume.toLocaleString()}</span>
                              {kw.global_search_volume && kw.global_search_volume !== kw.search_volume && (
                                <span className="text-xs text-gray-500 dark:text-gray-400">
                                  🌍 Global: {kw.global_search_volume.toLocaleString()}
                                </span>
                              )}
                            </>
                          )
                          : <span className="text-gray-400 italic">N/A</span>}
                        {kw.trend_score !== null && kw.trend_score !== undefined && (
                          <span className={`text-xs flex items-center gap-1 ${
                            kw.trend_score > 0 
                              ? 'text-green-600 dark:text-green-400' 
                              : kw.trend_score < 0
                              ? 'text-red-600 dark:text-red-400'
                              : 'text-gray-500 dark:text-gray-400'
                          }`}>
                            {kw.trend_score > 0 ? '↑' : kw.trend_score < 0 ? '↓' : '→'} 
                            {Math.abs(kw.trend_score * 100).toFixed(0)}%
                          </span>
                        )}
                      </div>
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
                    <td className="px-4 py-3">
                      {kw.competition > 0 ? (
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium text-gray-900 dark:text-white">
                            {formatCompetition(kw.competition)}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium w-fit ${getCompetitionColorClasses(kw.competition)}`}>
                            {getCompetitionLevel(kw.competition)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900 dark:text-white">
                      ${kw.cpc?.toFixed(2) || '0.00'}
                    </td>
                    <td className="px-4 py-3">
                      {kw.primary_intent ? (
                        <div className="flex flex-col gap-1">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium w-fit ${
                            kw.primary_intent === 'informational' 
                              ? 'bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200'
                              : kw.primary_intent === 'commercial'
                              ? 'bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200'
                              : kw.primary_intent === 'navigational'
                              ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                              : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
                          }`}>
                            {kw.primary_intent.charAt(0).toUpperCase() + kw.primary_intent.slice(1)}
                          </span>
                          {kw.intent_probabilities && Object.keys(kw.intent_probabilities).length > 1 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              {Object.keys(kw.intent_probabilities).length} intents
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">N/A</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {kw.serp_features && kw.serp_features.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {kw.serp_features.slice(0, 3).map((feature: string, idx: number) => (
                            <span key={idx} className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                              {feature.substring(0, 3)}
                            </span>
                          ))}
                          {kw.serp_features.length > 3 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              +{kw.serp_features.length - 3}
                            </span>
                          )}
                        </div>
                      ) : kw.serp_feature_counts && Object.keys(kw.serp_feature_counts).length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {Object.keys(kw.serp_feature_counts).slice(0, 3).map((feature: string) => (
                            <span key={feature} className="px-1.5 py-0.5 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs">
                              {feature.substring(0, 3)}:{(kw.serp_feature_counts?.[feature] as number) || 0}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400 italic">None</span>
                      )}
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
                    <td className="px-4 py-3">
                      {(kw.related_keywords_enhanced?.length || kw.questions?.length || kw.topics?.length || 
                        kw.serp_features?.length || kw.people_also_ask?.length || kw.long_tail_keywords?.length ||
                        kw.related_searches?.length || kw.top_domains?.length || kw.content_gaps?.length ||
                        kw.organic_results?.length || kw.video_results?.length || kw.image_results?.length ||
                        kw.featured_snippet || kw.also_rank_for?.length || kw.also_talk_about?.length ||
                        kw.discovery_matching_terms?.length || kw.discovery_questions?.length || kw.discovery_related_terms?.length) ? (
                        <button
                          onClick={() => toggleKeywordExpansion(kw.keyword)}
                          className="text-blue-600 dark:text-blue-400 hover:underline text-sm"
                        >
                          {expandedKeywords.has(kw.keyword) ? 'Hide' : 'Show'} Details
                        </button>
                      ) : null}
                    </td>
                  </tr>
                  {expandedKeywords.has(kw.keyword) && (
                    <tr className="bg-gray-50 dark:bg-gray-900/50">
                      <td colSpan={10} className="px-4 py-4">
                        <div className="space-y-4">
                          {/* SERP Features */}
                          {((kw.serp_features && kw.serp_features.length > 0) || kw.serp_feature_counts) && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                SERP Features
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {(kw.serp_features || []).map((feature, idx) => (
                                  <span key={idx} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                                    {feature}
                                  </span>
                                ))}
                                {kw.serp_feature_counts && Object.entries(kw.serp_feature_counts).map(([feature, count]) => (
                                  <span key={feature} className="px-2 py-1 bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200 rounded text-xs">
                                    {feature}: {count as number}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* People Also Ask */}
                          {kw.people_also_ask && kw.people_also_ask.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                People Also Ask ({kw.people_also_ask.length})
                              </h4>
                              <div className="space-y-2">
                                {kw.people_also_ask.map((paa: any, idx: number) => (
                                  <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                                    <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">
                                      {paa.question || paa.title || paa}
                                    </div>
                                    {paa.description && (
                                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{paa.description}</p>
                                    )}
                                    {paa.url && (
                                      <a href={paa.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1 block">
                                        {paa.url}
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Intent Data */}
                          {(kw.primary_intent || (kw.intent_probabilities && Object.keys(kw.intent_probabilities).length > 0)) && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                Search Intent
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {kw.primary_intent && (
                                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs font-medium">
                                    Primary: {kw.primary_intent}
                                  </span>
                                )}
                                {kw.intent_probabilities && Object.entries(kw.intent_probabilities).map(([intent, prob]) => (
                                  <span key={intent} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-xs">
                                    {intent}: {(Number(prob) * 100).toFixed(0)}%
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Additional Metrics */}
                          {(kw.traffic_potential || kw.clicks || kw.cps || kw.ai_search_volume) && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                Additional Metrics
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                {kw.traffic_potential !== null && kw.traffic_potential !== undefined && (
                                  <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                                    <div className="text-xs text-gray-600 dark:text-gray-400">Traffic Potential</div>
                                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{kw.traffic_potential.toLocaleString()}</div>
                                  </div>
                                )}
                                {kw.clicks !== null && kw.clicks !== undefined && (
                                  <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                                    <div className="text-xs text-gray-600 dark:text-gray-400">Clicks</div>
                                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{kw.clicks.toLocaleString()}</div>
                                  </div>
                                )}
                                {kw.cps !== null && kw.cps !== undefined && (
                                  <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                                    <div className="text-xs text-gray-600 dark:text-gray-400">CPS</div>
                                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{kw.cps.toFixed(2)}</div>
                                  </div>
                                )}
                                {kw.ai_search_volume !== null && kw.ai_search_volume !== undefined && (
                                  <div className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                                    <div className="text-xs text-gray-600 dark:text-gray-400">AI Volume</div>
                                    <div className="text-sm font-semibold text-gray-900 dark:text-white">{kw.ai_search_volume.toLocaleString()}</div>
                                  </div>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Top Domains */}
                          {kw.top_domains && kw.top_domains.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                Top Competing Domains ({kw.top_domains.length})
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {kw.top_domains.map((domain: any, idx: number) => (
                                  <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                                    <span className="text-sm text-gray-900 dark:text-white">{domain.domain || domain}</span>
                                    {domain.count !== undefined && (
                                      <span className="text-xs text-gray-600 dark:text-gray-400">{domain.count} results</span>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Related Searches */}
                          {kw.related_searches && kw.related_searches.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                Related Searches ({kw.related_searches.length})
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {kw.related_searches.map((search: string, idx: number) => (
                                  <span key={idx} className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-xs">
                                    {search}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Content Gaps */}
                          {kw.content_gaps && kw.content_gaps.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                Content Opportunities ({kw.content_gaps.length})
                              </h4>
                              <div className="space-y-1">
                                {kw.content_gaps.map((gap: string, idx: number) => (
                                  <div key={idx} className="text-sm text-gray-700 dark:text-gray-300 bg-yellow-50 dark:bg-yellow-900/20 p-2 rounded">
                                    {gap}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Competition Level */}
                          {kw.competition_level && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                Competition Level
                              </h4>
                              <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded text-xs">
                                {kw.competition_level}
                              </span>
                            </div>
                          )}

                          {/* Also Rank For */}
                          {kw.also_rank_for && kw.also_rank_for.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                Also Rank For ({kw.also_rank_for.length})
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {kw.also_rank_for.map((keyword: string, idx: number) => (
                                  <span key={idx} className="px-2 py-1 bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded text-xs">
                                    {keyword}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Also Talk About */}
                          {kw.also_talk_about && kw.also_talk_about.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                Also Talk About ({kw.also_talk_about.length})
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {kw.also_talk_about.map((topic: string, idx: number) => (
                                  <span key={idx} className="px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-xs">
                                    {topic}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Featured Snippet */}
                          {kw.featured_snippet && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                Featured Snippet
                              </h4>
                              <div className="bg-white dark:bg-gray-800 rounded-lg p-4 border border-gray-200 dark:border-gray-700">
                                <h5 className="font-medium text-sm text-gray-900 dark:text-white mb-2">
                                  {kw.featured_snippet.title}
                                </h5>
                                <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                                  {kw.featured_snippet.snippet}
                                </p>
                                {kw.featured_snippet.url && (
                                  <a href={kw.featured_snippet.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 dark:text-blue-400 hover:underline">
                                    {kw.featured_snippet.url}
                                  </a>
                                )}
                              </div>
                            </div>
                          )}

                          {/* Organic Results */}
                          {kw.organic_results && kw.organic_results.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                Top Organic Results ({kw.organic_results.length})
                              </h4>
                              <div className="space-y-3">
                                {kw.organic_results.slice(0, 10).map((result: any, idx: number) => (
                                  <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                                    <div className="flex items-start gap-2 mb-1">
                                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 w-6">#{result.position || idx + 1}</span>
                                      <div className="flex-1">
                                        <h5 className="font-medium text-sm text-blue-600 dark:text-blue-400 hover:underline mb-1">
                                          <a href={result.url} target="_blank" rel="noopener noreferrer">
                                            {result.title}
                                          </a>
                                        </h5>
                                        <p className="text-xs text-green-600 dark:text-green-400 mb-1">{result.domain || new URL(result.url).hostname}</p>
                                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{result.snippet}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Video Results */}
                          {kw.video_results && kw.video_results.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                Video Results ({kw.video_results.length})
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                {kw.video_results.slice(0, 6).map((video: any, idx: number) => (
                                  <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    {video.thumbnail && (
                                      <img src={video.thumbnail} alt={video.title} className="w-full h-32 object-cover" />
                                    )}
                                    <div className="p-2">
                                      <h5 className="font-medium text-xs text-gray-900 dark:text-white mb-1 line-clamp-2">
                                        <a href={video.url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                                          {video.title}
                                        </a>
                                      </h5>
                                      {video.duration && (
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{video.duration}</span>
                                      )}
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Image Results */}
                          {kw.image_results && kw.image_results.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                Image Results ({kw.image_results.length})
                              </h4>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                {kw.image_results.slice(0, 8).map((image: any, idx: number) => (
                                  <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                                    {image.thumbnail && (
                                      <img src={image.thumbnail} alt={image.title} className="w-full h-24 object-cover" />
                                    )}
                                    <div className="p-1">
                                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{image.title}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Discovery: Matching Terms */}
                          {kw.discovery_matching_terms && kw.discovery_matching_terms.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                Matching Terms ({kw.discovery_matching_terms.length})
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {kw.discovery_matching_terms.map((term: any, idx: number) => (
                                  <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                                    <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">{term.keyword}</div>
                                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                      <span>Vol: {term.search_volume?.toLocaleString() || 'N/A'}</span>
                                      <span>KD: {term.keyword_difficulty || 'N/A'}</span>
                                      <span>CPC: ${term.cpc?.toFixed(2) || '0.00'}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Discovery: Questions */}
                          {kw.discovery_questions && kw.discovery_questions.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                Discovery Questions ({kw.discovery_questions.length})
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {kw.discovery_questions.map((q: any, idx: number) => (
                                  <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                                    <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">{q.keyword}</div>
                                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                      <span>Vol: {q.search_volume?.toLocaleString() || 'N/A'}</span>
                                      <span>KD: {q.keyword_difficulty || 'N/A'}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Discovery: Related Terms */}
                          {kw.discovery_related_terms && kw.discovery_related_terms.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                Discovery Related Terms ({kw.discovery_related_terms.length})
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {kw.discovery_related_terms.map((term: any, idx: number) => (
                                  <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-2 border border-gray-200 dark:border-gray-700">
                                    <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">{term.keyword}</div>
                                    <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                      <span>Vol: {term.search_volume?.toLocaleString() || 'N/A'}</span>
                                      <span>KD: {term.keyword_difficulty || 'N/A'}</span>
                                      <span>CPC: ${term.cpc?.toFixed(2) || '0.00'}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Enhanced Related Keywords */}
                          {kw.related_keywords_enhanced && kw.related_keywords_enhanced.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                Enhanced Related Keywords ({kw.related_keywords_enhanced.length})
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                                {kw.related_keywords_enhanced.map((rk, idx) => (
                                  <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                                    <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">{rk.keyword}</div>
                                    <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                                      <span>Vol: {rk.search_volume.toLocaleString()}</span>
                                      <span>CPC: ${rk.cpc.toFixed(2)}</span>
                                      <span>Comp: {formatCompetition(rk.competition)}</span>
                                      <span>Diff: {rk.difficulty_score}/100</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Questions */}
                          {kw.questions && kw.questions.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                Questions ({kw.questions.length})
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {kw.questions.map((q, idx) => (
                                  <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                                    <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">{q.keyword}</div>
                                    <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                                      <span>Vol: {q.search_volume.toLocaleString()}</span>
                                      <span>CPC: ${q.cpc.toFixed(2)}</span>
                                      <span>Diff: {q.difficulty_score}/100</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Topics */}
                          {kw.topics && kw.topics.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                Topics ({kw.topics.length})
                              </h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {kw.topics.map((t, idx) => (
                                  <div key={idx} className="bg-white dark:bg-gray-800 rounded-lg p-3 border border-gray-200 dark:border-gray-700">
                                    <div className="font-medium text-sm text-gray-900 dark:text-white mb-1">{t.keyword}</div>
                                    <div className="flex items-center gap-3 text-xs text-gray-600 dark:text-gray-400">
                                      <span>Vol: {t.search_volume.toLocaleString()}</span>
                                      <span>CPC: ${t.cpc.toFixed(2)}</span>
                                      <span>Diff: {t.difficulty_score}/100</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Long Tail Keywords */}
                          {kw.long_tail_keywords && kw.long_tail_keywords.length > 0 && (
                            <div>
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                Long Tail Keywords ({kw.long_tail_keywords.length})
                              </h4>
                              <div className="flex flex-wrap gap-2">
                                {kw.long_tail_keywords.map((lt: string, idx: number) => (
                                  <span key={idx} className="px-2 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 rounded text-xs">
                                    {lt}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                    </React.Fragment>
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
                    {formatCompetition(cluster.avg_competition)}
                  </div>
                  {cluster.avg_competition > 0 && (
                    <div className={`text-xs px-2 py-0.5 rounded-full w-fit mt-1 ${getCompetitionColorClasses(cluster.avg_competition)}`}>
                      {getCompetitionLevel(cluster.avg_competition)}
                    </div>
                  )}
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
                    {kw.keyword} ({kw.search_volume !== null && kw.search_volume !== undefined ? kw.search_volume.toLocaleString() : 'N/A'})
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
                onClick={async () => {
                  // Save collection first before navigating
                  if (keywords.length > 0) {
                    try {
                      // Save collection first
                      await handleSaveCollection();
                      // Wait a moment for the save to complete and modal to show
                      await new Promise(resolve => setTimeout(resolve, 500));
                      // Navigate after successful save
                      router.push('/admin/workflow/clusters');
                    } catch (err: any) {
                      console.error('❌ Error saving collection before navigation:', err);
                      // Error is already set by handleSaveCollection
                      // Don't navigate if save failed
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

      {/* Success Modal */}
      {showSuccessModal && (
        <Modal
          isOpen={showSuccessModal}
          onClose={() => {
            console.log('Closing success modal');
            setShowSuccessModal(false);
            setSuccess(null);
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

