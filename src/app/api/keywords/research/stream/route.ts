import { NextRequest } from 'next/server';
import { logger } from '@/lib/logger';
import { parseJsonBody } from '@/lib/api-utils';
import { createClient } from '@/lib/supabase/server';
import { keywordResearchService } from '@/lib/keyword-research';
import enhancedKeywordStorage, { SearchType } from '@/lib/keyword-storage-enhanced';
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';
import cloudRunHealth from '@/lib/cloud-run-health';

/**
 * Server-Side Keyword Research with SSE Streaming
 * 
 * This endpoint handles all keyword research server-side and streams progress/results
 * to the client. It includes:
 * - Cache checking
 * - Database storage
 * - API calls to backend
 * - Progress updates via SSE
 */
export async function POST(request: NextRequest) {
  logger.info('📥 Server-side keyword research streaming request received', {
    url: request.url,
    method: request.method,
  });

  // Create authenticated Supabase client
  const supabase = await createClient(request);
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response(
      JSON.stringify({ type: 'error', error: 'Unauthorized' }),
      { 
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }

  const userId = user.id;

  // Get user's org_id
  const { data: userData } = await supabase
    .from('users')
    .select('org_id')
    .eq('user_id', userId)
    .maybeSingle();
  
  const orgId = userData?.org_id || null;

  try {
    const body = await parseJsonBody<{
      keyword: string;
      location?: string;
      language?: string;
      searchType?: 'traditional' | 'ai' | 'both';
      useCache?: boolean;
      autoStore?: boolean;
    }>(request);

    // Validate required fields
    if (!body.keyword || !body.keyword.trim()) {
      return new Response(
        JSON.stringify({ type: 'error', error: 'keyword is required' }),
        { status: 422, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const keyword = body.keyword.trim();
    const location = body.location || 'United States';
    const language = body.language || 'en';
    const searchType: SearchType = body.searchType || 'traditional';
    const useCache = body.useCache !== false; // Default: true
    const autoStore = body.autoStore !== false; // Default: true

    // Create SSE stream
    const stream = new ReadableStream({
      async start(controller) {
        const encoder = new TextEncoder();

        const sendEvent = (type: string, data: any) => {
          const message = `data: ${JSON.stringify({ type, ...data })}\n\n`;
          controller.enqueue(encoder.encode(message));
        };

        try {
          // Step 1: Check cache
          if (useCache) {
            sendEvent('progress', {
              stage: 'checking_cache',
              progress: 10,
              message: 'Checking cache for existing results...',
            });

            const cached = await enhancedKeywordStorage.getCachedKeyword(
              keyword,
              location,
              language,
              searchType,
              userId
            );

            if (cached) {
              sendEvent('progress', {
                stage: 'cache_hit',
                progress: 100,
                message: 'Using cached results',
              });

              sendEvent('complete', {
                keyword,
                traditionalData: cached.traditional_data,
                aiData: cached.ai_data,
                relatedTerms: cached.related_terms,
                matchingTerms: cached.matching_terms,
                source: 'cache',
                cached: true,
              });

              controller.close();
              return;
            }
          }

          // Step 2: Check database
          sendEvent('progress', {
            stage: 'checking_database',
            progress: 20,
            message: 'Checking database for stored results...',
          });

          const stored = await enhancedKeywordStorage.getKeywordResearch(
            userId,
            keyword,
            location,
            language,
            searchType
          );

          if (stored) {
            sendEvent('progress', {
              stage: 'database_hit',
              progress: 30,
              message: 'Found stored results, re-caching...',
            });

            // Re-cache if expired
            if (useCache) {
              await enhancedKeywordStorage.cacheKeyword(keyword, stored, userId, orgId, supabase);
            }

            sendEvent('complete', {
              keyword,
              traditionalData: stored.traditional_data,
              aiData: stored.ai_data,
              relatedTerms: stored.related_terms,
              matchingTerms: stored.matching_terms,
              source: 'database',
              cached: false,
            });

            controller.close();
            return;
          }

          // Step 3: Check backend health and wake up if needed
          sendEvent('progress', {
            stage: 'checking_backend',
            progress: 40,
            message: 'Checking backend service health...',
          });

          try {
            const healthStatus = await cloudRunHealth.checkHealth();
            logger.debug('Backend health check result', {
              isHealthy: healthStatus.isHealthy,
              isWakingUp: healthStatus.isWakingUp,
              error: healthStatus.error,
            });

            if (!healthStatus.isHealthy && healthStatus.isWakingUp) {
              sendEvent('progress', {
                stage: 'waking_backend',
                progress: 45,
                message: 'Backend service is starting up, please wait...',
              });
              
              // Wait for backend to wake up
              const wakeUpStatus = await cloudRunHealth.wakeUpAndWait();
              logger.debug('Backend wake-up result', {
                isHealthy: wakeUpStatus.isHealthy,
                attempts: wakeUpStatus.attempts,
                error: wakeUpStatus.error,
              });

              if (!wakeUpStatus.isHealthy) {
                logger.warn('Backend service failed to wake up', {
                  error: wakeUpStatus.error,
                  attempts: wakeUpStatus.attempts,
                });
                sendEvent('progress', {
                  stage: 'backend_warning',
                  progress: 45,
                  message: 'Backend may be slow to respond, continuing anyway...',
                });
              }
            } else if (!healthStatus.isHealthy) {
              logger.warn('Backend service is not healthy', {
                error: healthStatus.error,
              });
              sendEvent('progress', {
                stage: 'backend_warning',
                progress: 45,
                message: 'Backend service may be unavailable, continuing anyway...',
              });
            }
          } catch (healthError) {
            logger.warn('Health check failed, continuing anyway', {
              error: healthError instanceof Error ? healthError.message : String(healthError),
            });
            // Don't block the request if health check fails
          }

          // Step 4: Fetch from API
          sendEvent('progress', {
            stage: 'fetching_api',
            progress: 50,
            message: 'Fetching keyword data from API...',
          });

          const result: any = {
            keyword,
            source: 'api',
            cached: false,
          };

          // Fetch traditional data if needed
          if (searchType === 'traditional' || searchType === 'both') {
            sendEvent('progress', {
              stage: 'analyzing_traditional',
              progress: 60,
              message: 'Analyzing traditional SEO metrics...',
            });

            try {
              
              // Ensure service is properly initialized
              if (!keywordResearchService || typeof keywordResearchService.analyzeKeywords !== 'function') {
                throw new Error(`keywordResearchService.analyzeKeywords is not a function. Service type: ${typeof keywordResearchService}`);
              }
              
              const traditionalAnalysis = await keywordResearchService.analyzeKeywords(
                [keyword],
                20, // Get more keyword suggestions
                location,
                {
                  include_trends: false,
                  include_keyword_ideas: true, // Enable to get related keywords
                }
              );

              // Check if we got an empty analysis (likely backend endpoint returned 404)
              if (!traditionalAnalysis?.keyword_analysis || Object.keys(traditionalAnalysis.keyword_analysis).length === 0) {
                logger.warn('Traditional analysis returned empty results (backend endpoint may be unavailable)', {
                  keyword,
                  location,
                  hasAnalysis: !!traditionalAnalysis,
                  analysisKeys: traditionalAnalysis ? Object.keys(traditionalAnalysis) : [],
                });
                sendEvent('progress', {
                  stage: 'traditional_error',
                  progress: 50,
                  message: 'Traditional analysis endpoint unavailable (backend may be down or endpoint missing)',
                });
              } else if (traditionalAnalysis.keyword_analysis) {
                const keywordLower = keyword.toLowerCase();
                const keywordData = traditionalAnalysis.keyword_analysis[keywordLower];

                if (keywordData) {
                  // Convert difficulty string to number (0-100 scale)
                  const difficultyMap: Record<string, number> = {
                    'very_easy': 10,
                    'easy': 30,
                    'medium': 50,
                    'hard': 70,
                    'very_hard': 90,
                  };

                  result.traditionalData = {
                    keyword,
                    search_volume: keywordData.search_volume || 0,
                    keyword_difficulty: difficultyMap[keywordData.difficulty || 'medium'] || 50,
                    competition: keywordData.competition || 0,
                    cpc: keywordData.cpc || 0,
                    search_intent: keywordData.primary_intent as any,
                    trend_score: keywordData.trend_score || 0,
                    parent_topic: keywordData.parent_topic,
                    related_keywords: keywordData.related_keywords || [],
                  };

                  // Extract ALL keywords from the analysis response (not just the primary)
                  const allKeywords: any[] = [];
                  const keywordMap = new Map<string, any>();
                  
                  // First, extract all keywords from the analysis response with full data
                  Object.entries(traditionalAnalysis.keyword_analysis).forEach(([kw, kwData]: [string, any]) => {
                    if (kwData) {
                      const normalizedKw = kw.toLowerCase();
                      keywordMap.set(normalizedKw, {
                        keyword: kw,
                        search_volume: kwData.search_volume || 0,
                        keyword_difficulty: difficultyMap[kwData.difficulty || 'medium'] || 50,
                        competition: kwData.competition || 0,
                        cpc: kwData.cpc || 0,
                        search_intent: kwData.primary_intent || kwData.search_intent || undefined,
                        parent_topic: kwData.parent_topic || undefined,
                        trend_score: kwData.trend_score || 0,
                      });
                    }
                  });

                  // Extract related terms from primary keyword's related_keywords array
                  // These might be strings that aren't in the analysis response yet
                  if (keywordData.related_keywords && Array.isArray(keywordData.related_keywords)) {
                    keywordData.related_keywords.forEach((kw: string) => {
                      const normalizedKw = kw.toLowerCase();
                      if (!keywordMap.has(normalizedKw)) {
                        // Try to find this keyword in the analysis response
                        const foundKwData = traditionalAnalysis.keyword_analysis[normalizedKw] || 
                                          traditionalAnalysis.keyword_analysis[kw];
                        
                        if (foundKwData) {
                          keywordMap.set(normalizedKw, {
                            keyword: kw,
                            search_volume: foundKwData.search_volume || 0,
                            keyword_difficulty: difficultyMap[foundKwData.difficulty || 'medium'] || 50,
                            competition: foundKwData.competition || 0,
                            cpc: foundKwData.cpc || 0,
                            search_intent: (foundKwData as any).primary_intent || (foundKwData as any).search_intent,
                            parent_topic: (foundKwData as any).parent_topic,
                            trend_score: (foundKwData as any).trend_score || 0,
                          });
                        } else {
                          // Keyword not in analysis response, add with minimal data
                          keywordMap.set(normalizedKw, {
                      keyword: kw,
                            search_volume: 0,
                      keyword_difficulty: 0,
                      competition: 0,
                            cpc: 0,
                          });
                        }
                      }
                    });
                  }
                  
                  // Convert map to array
                  allKeywords.push(...Array.from(keywordMap.values()));

                  // Separate primary keyword from related keywords
                  const primaryKeywordData = allKeywords.find(k => k.keyword.toLowerCase() === keywordLower);
                  const relatedKeywords = allKeywords.filter(k => k.keyword.toLowerCase() !== keywordLower);
                  
                  result.relatedTerms = relatedKeywords;
                  result.matchingTerms = relatedKeywords; // Use same array for matching terms
                  
                  logger.debug('Extracted keywords from analysis', {
                    primary: keyword,
                    totalKeywords: allKeywords.length,
                    primaryKeywordData: primaryKeywordData ? {
                      keyword: primaryKeywordData.keyword,
                      search_volume: primaryKeywordData.search_volume,
                    } : null,
                    relatedTerms: result.relatedTerms.length,
                  });
                } else {
                  logger.warn('Keyword data not found in analysis response', {
                    keyword,
                    keywordLower,
                    availableKeys: Object.keys(traditionalAnalysis.keyword_analysis),
                  });
                  sendEvent('progress', {
                    stage: 'traditional_error',
                    progress: 50,
                    message: `Keyword "${keyword}" not found in analysis response`,
                  });
                }
              }
            } catch (error) {
              const errorMessage = error instanceof Error ? error.message : String(error);
              logger.error('Error fetching traditional data', { error: errorMessage, keyword });
              sendEvent('progress', {
                stage: 'traditional_error',
                progress: 50,
                message: `Traditional analysis failed: ${errorMessage.substring(0, 100)}`,
              });
              // Also send error event for debugging
              sendEvent('error', {
                error: errorMessage,
                stage: 'traditional_analysis',
              });
            }
          }

          // Fetch AI data if needed
          if (searchType === 'ai' || searchType === 'both') {
            sendEvent('progress', {
              stage: 'analyzing_ai',
              progress: 70,
              message: 'Analyzing AI optimization metrics...',
            });

            try {
              // Call the backend API directly for AI topic suggestions
              const aiTopicSuggestionsResponse = await fetch(
                `${BLOG_WRITER_API_URL}/api/v1/keywords/ai-topic-suggestions`,
                {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(process.env.BLOG_WRITER_API_KEY && {
                      'X-API-Key': process.env.BLOG_WRITER_API_KEY,
                    }),
                  },
                  body: JSON.stringify({
                    keywords: [keyword],
                    location,
                    language,
                    objective: `Analyze keyword: ${keyword}`,
                  }),
                }
              );

              if (!aiTopicSuggestionsResponse.ok) {
                const errorText = await aiTopicSuggestionsResponse.text();
                // Check if it's an HTML 404 page
                if (aiTopicSuggestionsResponse.headers.get('content-type')?.includes('text/html')) {
                  logger.warn('AI topic suggestions endpoint returned HTML 404, skipping AI analysis');
                  throw new Error('AI topic suggestions endpoint not available');
                }
                throw new Error(`AI topic suggestions failed: ${aiTopicSuggestionsResponse.statusText}`);
              }

              const aiTopicData = await aiTopicSuggestionsResponse.json();

              if (aiTopicData?.topic_suggestions && aiTopicData.topic_suggestions.length > 0) {
                const aiTopic = aiTopicData.topic_suggestions[0];
                result.aiData = {
                  keyword,
                  ai_search_volume: aiTopic.ai_search_volume || 0,
                  ai_optimization_score: aiTopic.ai_optimization_score || 0,
                  ai_recommended: (aiTopic.ai_optimization_score || 0) > 50,
                  ai_mentions_count: aiTopic.mentions_count || 0,
                  ai_platform: aiTopic.platform as any,
                };
              }
            } catch (error) {
              logger.error('Error fetching AI data', { error, keyword });
              sendEvent('progress', {
                stage: 'ai_error',
                progress: 70,
                message: 'AI analysis failed, continuing...',
              });
            }
          }

          // Step 4: Store results
          if (autoStore) {
            sendEvent('progress', {
              stage: 'storing_results',
              progress: 90,
              message: 'Storing results in database...',
            });

            try {
              // Collect all keywords (excluding primary keyword to avoid duplication)
              const keywordLower = keyword.toLowerCase();
              const allKeywordsToStore = [
                ...(result.relatedTerms || []),
                ...(result.matchingTerms || []),
              ].filter(term => term.keyword.toLowerCase() !== keywordLower);
              
              // Remove duplicates based on keyword (case-insensitive)
              const uniqueKeywords = new Map<string, any>();
              allKeywordsToStore.forEach(term => {
                const key = term.keyword.toLowerCase();
                if (!uniqueKeywords.has(key)) {
                  uniqueKeywords.set(key, term);
                }
              });
              
              const uniqueRelatedTerms = Array.from(uniqueKeywords.values());
              
              logger.debug('Storing keyword research with all keywords', {
                keyword,
                totalKeywords: uniqueRelatedTerms.length + 1, // +1 for primary
                relatedTermsCount: uniqueRelatedTerms.length,
                primaryKeyword: keyword,
              });
              
              const storeResult = await enhancedKeywordStorage.storeKeywordResearch(
                userId,
                {
                  keyword,
                  location,
                  language,
                  search_type: searchType,
                  traditional_data: result.traditionalData,
                  ai_data: result.aiData,
                  related_terms: uniqueRelatedTerms, // All keywords except primary
                  matching_terms: [], // Don't duplicate - all keywords are in related_terms
                },
                orgId || undefined,
                supabase
              );
              
              if (!storeResult.success) {
                logger.warn('Storage returned unsuccessful', { error: storeResult.error, keyword });
              } else {
                logger.debug('Successfully stored keyword research', {
                  keyword,
                  researchResultId: storeResult.id,
                  keywordsStored: uniqueRelatedTerms.length + 1, // +1 for primary keyword
                });
              }
            } catch (error) {
              logger.error('Error storing results', { error, keyword });
              // Don't fail the request if storage fails
            }
          }

          // Step 5: Cache results
          if (useCache && result.traditionalData) {
            try {
              await enhancedKeywordStorage.cacheKeyword(
                keyword,
                {
                  keyword,
                  location,
                  language,
                  search_type: searchType,
                  traditional_data: result.traditionalData,
                  ai_data: result.aiData,
                  related_terms: result.relatedTerms || [],
                  matching_terms: result.matchingTerms || [],
                },
                userId,
                orgId || undefined,
                supabase
              );
            } catch (error) {
              logger.error('Error caching results', { error, keyword });
              // Don't fail the request if caching fails
            }
          }

          // Step 6: Send final results
          sendEvent('progress', {
            stage: 'complete',
            progress: 100,
            message: 'Research complete',
          });

          sendEvent('complete', result);

          controller.close();
        } catch (error) {
          logger.error('Error in keyword research stream', { error, keyword });
          sendEvent('error', {
            error: error instanceof Error ? error.message : 'Unknown error',
          });
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    logger.error('❌ Keyword research streaming request error', {
      error: errorMessage,
      context: 'keywords-research-stream',
    });
    return new Response(
      JSON.stringify({ type: 'error', error: `Failed to process keyword research request: ${errorMessage}` }),
      { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      }
    );
  }
}

