/**
 * Testing Phase Configuration
 * Limits data retrieval during testing to reduce API costs and processing time
 */

export const TESTING_MODE = process.env.NEXT_PUBLIC_TESTING_MODE === 'true' || 
                            process.env.TESTING_MODE === 'true';

/**
 * Testing Phase Limits
 * These limits are applied when TESTING_MODE is enabled
 */
export const TESTING_LIMITS = {
  // Keyword Research Limits
  keywords: {
    maxPrimaryKeywords: 5,
    maxSuggestionsPerKeyword: 5,
    maxLongTailPerKeyword: 5,
    maxRelatedKeywords: 5,
    maxTotalKeywords: 25,
  },
  
  // Backlinks Limits
  backlinks: {
    maxBacklinks: 20,
    maxReferringDomains: 10,
    maxAnchors: 10,
  },
  
  // SERP Limits
  serp: {
    maxResults: 10,
    maxFeatures: 5,
  },
  
  // Trend Data Limits
  trends: {
    maxMonths: 6,
    includeHistorical: false,
  },
  
  // Clustering Limits
  clustering: {
    maxClusters: 5,
    maxKeywordsPerCluster: 10,
  },
  
  // Content Brief Limits
  content: {
    maxCompetitors: 3,
    maxContentIdeas: 10,
  },
};

/**
 * Apply testing limits to a request body
 */
export function applyTestingLimits<T extends Record<string, unknown>>(body: T): T {
  if (!TESTING_MODE) {
    return body;
  }
  
  const limited = { ...body };
  
  // Limit keywords array
  if (Array.isArray(limited.keywords)) {
    limited.keywords = limited.keywords.slice(0, TESTING_LIMITS.keywords.maxPrimaryKeywords);
  }
  
  // Limit max_suggestions_per_keyword
  if (typeof limited.max_suggestions_per_keyword === 'number') {
    limited.max_suggestions_per_keyword = Math.min(
      limited.max_suggestions_per_keyword,
      TESTING_LIMITS.keywords.maxSuggestionsPerKeyword
    );
  } else if (!limited.max_suggestions_per_keyword) {
    limited.max_suggestions_per_keyword = TESTING_LIMITS.keywords.maxSuggestionsPerKeyword;
  }
  
  // Limit backlinks if present
  if (typeof limited.max_backlinks === 'number') {
    limited.max_backlinks = Math.min(limited.max_backlinks, TESTING_LIMITS.backlinks.maxBacklinks);
  }
  
  // Limit SERP depth if present
  if (typeof limited.serp_depth === 'number') {
    limited.serp_depth = Math.min(limited.serp_depth, TESTING_LIMITS.serp.maxResults);
  }
  
  return limited;
}

/**
 * Limit response data in testing mode
 */
export function limitResponseData<T>(data: T): T {
  if (!TESTING_MODE) {
    return data;
  }
  
  if (!data || typeof data !== 'object') {
    return data;
  }
  
  const dataObj = data as Record<string, unknown>;
  const limited = { ...dataObj };
  
  // If data has enhanced_analysis, limit the keywords and their related data
  if ('enhanced_analysis' in limited && limited.enhanced_analysis && typeof limited.enhanced_analysis === 'object') {
    const enhanced = limited.enhanced_analysis as Record<string, unknown>;
    const keys = Object.keys(enhanced);
    
    if (keys.length > TESTING_LIMITS.keywords.maxPrimaryKeywords) {
      const limitedEnhanced: Record<string, unknown> = {};
      keys.slice(0, TESTING_LIMITS.keywords.maxPrimaryKeywords).forEach(key => {
        const keywordData = enhanced[key];
        if (keywordData && typeof keywordData === 'object') {
          const kwData = keywordData as Record<string, unknown>;
          const limitedKwData = { ...kwData };
          
          // Limit related_keywords
          if (Array.isArray(limitedKwData.related_keywords)) {
            limitedKwData.related_keywords = limitedKwData.related_keywords.slice(0, TESTING_LIMITS.keywords.maxRelatedKeywords);
          }
          
          // Limit long_tail_keywords
          if (Array.isArray(limitedKwData.long_tail_keywords)) {
            limitedKwData.long_tail_keywords = limitedKwData.long_tail_keywords.slice(0, TESTING_LIMITS.keywords.maxLongTailPerKeyword);
          }
          
          limitedEnhanced[key] = limitedKwData;
        } else {
          limitedEnhanced[key] = keywordData;
        }
      });
      limited.enhanced_analysis = limitedEnhanced;
    } else {
      // Even if within limit, still limit related/long-tail keywords
      const limitedEnhanced: Record<string, unknown> = {};
      keys.forEach(key => {
        const keywordData = enhanced[key];
        if (keywordData && typeof keywordData === 'object') {
          const kwData = keywordData as Record<string, unknown>;
          const limitedKwData = { ...kwData };
          
          if (Array.isArray(limitedKwData.related_keywords)) {
            limitedKwData.related_keywords = limitedKwData.related_keywords.slice(0, TESTING_LIMITS.keywords.maxRelatedKeywords);
          }
          
          if (Array.isArray(limitedKwData.long_tail_keywords)) {
            limitedKwData.long_tail_keywords = limitedKwData.long_tail_keywords.slice(0, TESTING_LIMITS.keywords.maxLongTailPerKeyword);
          }
          
          limitedEnhanced[key] = limitedKwData;
        } else {
          limitedEnhanced[key] = keywordData;
        }
      });
      limited.enhanced_analysis = limitedEnhanced;
    }
  }
  
  // If data has keyword_analysis, limit similarly
  if ('keyword_analysis' in limited && limited.keyword_analysis && typeof limited.keyword_analysis === 'object') {
    const analysis = limited.keyword_analysis as Record<string, unknown>;
    const keys = Object.keys(analysis);
    
    if (keys.length > TESTING_LIMITS.keywords.maxPrimaryKeywords) {
      const limitedAnalysis: Record<string, unknown> = {};
      keys.slice(0, TESTING_LIMITS.keywords.maxPrimaryKeywords).forEach(key => {
        const keywordData = analysis[key];
        if (keywordData && typeof keywordData === 'object') {
          const kwData = keywordData as Record<string, unknown>;
          const limitedKwData = { ...kwData };
          
          if (Array.isArray(limitedKwData.related_keywords)) {
            limitedKwData.related_keywords = limitedKwData.related_keywords.slice(0, TESTING_LIMITS.keywords.maxRelatedKeywords);
          }
          
          if (Array.isArray(limitedKwData.long_tail_keywords)) {
            limitedKwData.long_tail_keywords = limitedKwData.long_tail_keywords.slice(0, TESTING_LIMITS.keywords.maxLongTailPerKeyword);
          }
          
          limitedAnalysis[key] = limitedKwData;
        } else {
          limitedAnalysis[key] = keywordData;
        }
      });
      limited.keyword_analysis = limitedAnalysis;
    } else {
      // Even if within limit, still limit related/long-tail keywords
      const limitedAnalysis: Record<string, unknown> = {};
      keys.forEach(key => {
        const keywordData = analysis[key];
        if (keywordData && typeof keywordData === 'object') {
          const kwData = keywordData as Record<string, unknown>;
          const limitedKwData = { ...kwData };
          
          if (Array.isArray(limitedKwData.related_keywords)) {
            limitedKwData.related_keywords = limitedKwData.related_keywords.slice(0, TESTING_LIMITS.keywords.maxRelatedKeywords);
          }
          
          if (Array.isArray(limitedKwData.long_tail_keywords)) {
            limitedKwData.long_tail_keywords = limitedKwData.long_tail_keywords.slice(0, TESTING_LIMITS.keywords.maxLongTailPerKeyword);
          }
          
          limitedAnalysis[key] = limitedKwData;
        } else {
          limitedAnalysis[key] = keywordData;
        }
      });
      limited.keyword_analysis = limitedAnalysis;
    }
  }
  
  // Limit clusters if present
  if ('clusters' in limited && Array.isArray(limited.clusters)) {
    const clusters = limited.clusters as unknown[];
    if (clusters.length > TESTING_LIMITS.clustering.maxClusters) {
      limited.clusters = clusters.slice(0, TESTING_LIMITS.clustering.maxClusters);
    }
    
    // Limit keywords per cluster
    limited.clusters = (limited.clusters as Array<Record<string, unknown>>).map(cluster => {
      if (cluster.keywords && Array.isArray(cluster.keywords)) {
        return {
          ...cluster,
          keywords: cluster.keywords.slice(0, TESTING_LIMITS.clustering.maxKeywordsPerCluster),
        };
      }
      return cluster;
    });
  }
  
  // Limit suggested_keywords if present
  if ('suggested_keywords' in limited && Array.isArray(limited.suggested_keywords)) {
    const suggested = limited.suggested_keywords as unknown[];
    if (suggested.length > TESTING_LIMITS.keywords.maxTotalKeywords) {
      limited.suggested_keywords = suggested.slice(0, TESTING_LIMITS.keywords.maxTotalKeywords);
    }
  }
  
  return limited as T;
}

/**
 * Get testing mode indicator text
 */
export function getTestingModeIndicator(): string | null {
  if (!TESTING_MODE) {
    return null;
  }
  
  return '🧪 Testing Mode Active - Limited Data Retrieval';
}

