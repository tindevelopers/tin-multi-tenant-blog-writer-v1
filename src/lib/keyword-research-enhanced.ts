/**
 * Enhanced Keyword Research Service
 * Integrates with Blog Writer API's keyword endpoints via Next.js API routes
 * Based on API documentation: https://blog-writer-api-dev-613248238610.europe-west1.run.app/docs
 */

const API_BASE_URL = '/api/keywords'; // Use Next.js API routes as proxy

// ==================== TypeScript Interfaces ====================

export interface KeywordData {
  keyword: string;
  search_volume: number;
  keyword_difficulty: number;
  competition_level: 'LOW' | 'MEDIUM' | 'HIGH';
  cpc?: number;
  search_intent?: 'informational' | 'navigational' | 'commercial' | 'transactional';
  trend_score?: number;
  related_keywords?: string[];
  easy_win_score: number;
  high_value_score: number;
}

export interface KeywordAnalysisRequest {
  keywords: string[];
  location?: string;
  language?: string;
}

export interface KeywordSuggestionRequest {
  keyword: string;
}

export interface KeywordExtractionRequest {
  content: string;
  max_keywords?: number;
}

export interface KeywordAnalysisResponse {
  keyword: string;
  difficulty: string; // "easy", "medium", "hard"
  competition: number; // 0-1 decimal
  related_keywords: string[];
  long_tail_keywords: string[];
  search_volume?: number | null;
  cpc?: number | null;
  trend_score?: number;
  recommended: boolean;
  reason: string;
}

export interface KeywordSuggestionResponse {
  keyword_suggestions: string[];
}

export interface KeywordCluster {
  id: string;
  name: string;
  primary_keyword: string;
  keywords: KeywordData[];
  cluster_type: 'pillar' | 'supporting' | 'long-tail';
  authority_potential: number;
  total_search_volume: number;
}

export interface KeywordResearchSession {
  id: string;
  primary_keyword: string;
  location: string;
  language: string;
  total_keywords: number;
  clusters: KeywordCluster[];
  created_at: string;
}

// ==================== API Service Class ====================

export class EnhancedKeywordResearchService {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  /**
   * Analyze keywords for SEO potential and difficulty
   */
  async analyzeKeywords(
    keywords: string[],
    location: string = 'United States',
    language: string = 'en'
  ): Promise<KeywordAnalysisResponse[]> {
    try {
      const response = await fetch(`${this.baseUrl}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords: keywords.slice(0, 75), // Optimized API limit
          location,
          language,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Keyword analysis failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Transform API response format: { keyword_analysis: { "keyword": {...}, ... } }
      // to array: [ {...}, {...}, ... ]
      if (data.keyword_analysis) {
        return Object.values(data.keyword_analysis);
      }
      
      return data;
    } catch (error) {
      console.error('Error analyzing keywords:', error);
      throw error;
    }
  }

  /**
   * Get keyword suggestions and variations
   */
  async suggestKeywords(keyword: string): Promise<KeywordSuggestionResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/suggest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyword }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Keyword suggestions failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error getting keyword suggestions:', error);
      throw error;
    }
  }

  /**
   * Extract keywords from content
   */
  async extractKeywords(
    content: string,
    maxKeywords: number = 20
  ): Promise<string[]> {
    try {
      const response = await fetch(`${this.baseUrl}/extract`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content,
          max_keywords: maxKeywords,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Keyword extraction failed: ${response.statusText}`);
      }

      const data = await response.json();
      return data.keywords || [];
    } catch (error) {
      console.error('Error extracting keywords:', error);
      throw error;
    }
  }

  /**
   * Comprehensive keyword research for a primary keyword
   * Gets all variations and analyzes them
   */
  async comprehensiveResearch(
    primaryKeyword: string,
    location: string = 'United States',
    language: string = 'en'
  ): Promise<{
    primary: KeywordAnalysisResponse;
    variations: KeywordData[];
    suggestions: KeywordSuggestionResponse;
  }> {
    try {
      // Step 1: Get suggestions for the primary keyword
      const suggestions = await this.suggestKeywords(primaryKeyword);

      // Step 2: Collect all keyword variations
      const allKeywords = [
        primaryKeyword,
        ...(suggestions.keyword_suggestions || []),
      ];

      // Step 3: Analyze all keywords in batches of 50
      const analysisResults: KeywordAnalysisResponse[] = [];
      for (let i = 0; i < allKeywords.length; i += 50) {
        const batch = allKeywords.slice(i, i + 50);
        const batchResults = await this.analyzeKeywords(batch, location, language);
        analysisResults.push(...batchResults);
      }

      // Step 4: Transform to KeywordData format with scoring
      const variations = analysisResults.map((analysis) => 
        this.transformToKeywordData(analysis)
      );

      // Step 5: Find primary keyword analysis
      const primaryAnalysis = analysisResults.find(
        (a) => a.keyword.toLowerCase() === primaryKeyword.toLowerCase()
      ) || analysisResults[0];

      return {
        primary: primaryAnalysis,
        variations,
        suggestions,
      };
    } catch (error) {
      console.error('Error in comprehensive research:', error);
      throw error;
    }
  }

  /**
   * Calculate Easy Win Score
   * Based on: Low difficulty + High search volume = Easy win
   */
  private calculateEasyWinScore(
    difficulty: number,
    searchVolume: number = 0,
    competition: string
  ): number {
    const difficultyScore = Math.max(0, 100 - difficulty);
    const volumeScore = Math.min(100, (searchVolume / 1000) * 10);
    const competitionScore = 
      competition === 'LOW' ? 100 : 
      competition === 'MEDIUM' ? 50 : 20;

    // Weighted average: difficulty matters most for easy wins
    return Math.round(
      (difficultyScore * 0.5) + 
      (volumeScore * 0.3) + 
      (competitionScore * 0.2)
    );
  }

  /**
   * Calculate High Value Score
   * Based on: High search volume + Commercial intent + Good CPC
   */
  private calculateHighValueScore(
    searchVolume: number = 0,
    cpc: number = 0,
    difficulty: number
  ): number {
    const volumeScore = Math.min(100, (searchVolume / 5000) * 100);
    const cpcScore = Math.min(100, cpc * 10);
    const difficultyPenalty = Math.max(0, 100 - difficulty) * 0.3;

    // Weighted average: volume and CPC indicate value
    return Math.round(
      (volumeScore * 0.5) + 
      (cpcScore * 0.3) + 
      (difficultyPenalty * 0.2)
    );
  }

  /**
   * Transform API response to KeywordData format
   */
  private transformToKeywordData(
    analysis: KeywordAnalysisResponse
  ): KeywordData {
    const searchVolume = analysis.search_volume || 0;
    const cpc = analysis.cpc || 0;
    
    // Convert string difficulty to number (0-100)
    const difficultyMap: Record<string, number> = {
      'easy': 20,
      'medium': 50,
      'hard': 80,
    };
    const difficultyScore = difficultyMap[analysis.difficulty.toLowerCase()] || 50;
    
    // Convert decimal competition (0-1) to level
    const competitionLevel: 'LOW' | 'MEDIUM' | 'HIGH' = 
      analysis.competition < 0.3 ? 'LOW' :
      analysis.competition < 0.7 ? 'MEDIUM' : 'HIGH';

    return {
      keyword: analysis.keyword,
      search_volume: searchVolume,
      keyword_difficulty: difficultyScore,
      competition_level: competitionLevel,
      cpc,
      related_keywords: analysis.related_keywords,
      easy_win_score: this.calculateEasyWinScore(
        difficultyScore,
        searchVolume,
        competitionLevel
      ),
      high_value_score: this.calculateHighValueScore(
        searchVolume,
        cpc,
        difficultyScore
      ),
    };
  }

  /**
   * Create keyword clusters based on semantic similarity
   */
  async createClusters(keywords: KeywordData[]): Promise<KeywordCluster[]> {
    // Group keywords by similarity and search volume
    const clusters: KeywordCluster[] = [];
    const processed = new Set<string>();

    // Sort by search volume descending
    const sortedKeywords = [...keywords].sort(
      (a, b) => b.search_volume - a.search_volume
    );

    for (const keyword of sortedKeywords) {
      if (processed.has(keyword.keyword)) continue;

      // Determine if this should be a pillar keyword
      const isPillar = 
        keyword.search_volume > 10000 && 
        keyword.keyword_difficulty < 70;

      // Find related keywords for this cluster
      const relatedInCluster = keywords.filter((k) => {
        if (processed.has(k.keyword)) return false;
        
        // Check if keywords are semantically related
        const similarity = this.calculateKeywordSimilarity(
          keyword.keyword,
          k.keyword
        );
        
        return similarity > 0.5;
      });

      // Create cluster
      const clusterKeywords = [keyword, ...relatedInCluster.slice(0, 9)];
      clusterKeywords.forEach((k) => processed.add(k.keyword));

      const totalVolume = clusterKeywords.reduce(
        (sum, k) => sum + k.search_volume,
        0
      );

      clusters.push({
        id: `cluster-${clusters.length + 1}`,
        name: this.generateClusterName(keyword.keyword),
        primary_keyword: keyword.keyword,
        keywords: clusterKeywords,
        cluster_type: isPillar ? 'pillar' : 'supporting',
        authority_potential: this.calculateAuthorityPotential(clusterKeywords),
        total_search_volume: totalVolume,
      });
    }

    return clusters;
  }

  /**
   * Calculate keyword similarity (simple string-based for now)
   */
  private calculateKeywordSimilarity(keyword1: string, keyword2: string): number {
    const words1 = keyword1.toLowerCase().split(/\s+/);
    const words2 = keyword2.toLowerCase().split(/\s+/);
    
    const commonWords = words1.filter((w) => words2.includes(w));
    const totalWords = new Set([...words1, ...words2]).size;
    
    return commonWords.length / totalWords;
  }

  /**
   * Generate a readable cluster name
   */
  private generateClusterName(primaryKeyword: string): string {
    return primaryKeyword
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Calculate authority potential for a cluster
   */
  private calculateAuthorityPotential(keywords: KeywordData[]): number {
    const avgVolume = keywords.reduce((sum, k) => sum + k.search_volume, 0) / keywords.length;
    const avgDifficulty = keywords.reduce((sum, k) => sum + k.keyword_difficulty, 0) / keywords.length;
    const clusterSize = keywords.length;
    
    const volumeScore = Math.min(100, (avgVolume / 1000) * 10);
    const difficultyScore = Math.max(0, 100 - avgDifficulty);
    const sizeScore = Math.min(100, clusterSize * 10);
    
    return Math.round(
      (volumeScore * 0.4) + 
      (difficultyScore * 0.4) + 
      (sizeScore * 0.2)
    );
  }

  /**
   * Filter keywords for "Easy Wins"
   * Low difficulty + decent volume + low competition
   */
  filterEasyWins(keywords: KeywordData[], threshold: number = 60): KeywordData[] {
    return keywords
      .filter((k) => k.easy_win_score >= threshold)
      .sort((a, b) => b.easy_win_score - a.easy_win_score);
  }

  /**
   * Filter keywords for "High Value"
   * High volume + good CPC potential
   */
  filterHighValue(keywords: KeywordData[], threshold: number = 60): KeywordData[] {
    return keywords
      .filter((k) => k.high_value_score >= threshold)
      .sort((a, b) => b.high_value_score - a.high_value_score);
  }
}

// Export singleton instance
export const keywordResearchService = new EnhancedKeywordResearchService();

