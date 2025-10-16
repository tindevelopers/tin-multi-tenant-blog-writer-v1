"use client";

import { blogWriterAPI } from './blog-writer-api';

export interface ContentSuggestion {
  id: string;
  title: string;
  type: 'pillar' | 'supporting' | 'how-to' | 'list' | 'comparison' | 'guide';
  primary_keyword: string;
  secondary_keywords: string[];
  target_audience: string;
  word_count_target: number;
  difficulty: 'easy' | 'medium' | 'hard';
  seo_potential: number; // 1-100
  content_angle: string;
  outline: string[];
  estimated_traffic: 'low' | 'medium' | 'high';
  priority: 'high' | 'medium' | 'low';
  cluster_id?: string;
}

export interface ContentCluster {
  id: string;
  name: string;
  pillar_keyword: string;
  authority_potential: number;
  suggestions: ContentSuggestion[];
  total_keywords: number;
  supporting_topics: number;
}

class ContentSuggestionService {
  /**
   * Generate content suggestions from keyword research results
   */
  async generateContentSuggestions(
    researchResults: any,
    targetAudience: string = 'general'
  ): Promise<ContentSuggestion[]> {
    console.log('🎯 Generating content suggestions from research results...');
    console.log('📊 Research results structure:', researchResults);
    
    try {
      const suggestions: ContentSuggestion[] = [];
      
      // Validate research results
      if (!researchResults) {
        console.error('❌ No research results provided');
        return [];
      }
      
      // Extract keywords from research results
      const keywordAnalysis = researchResults.keyword_analysis?.keyword_analysis || {};
      const titleSuggestions = researchResults.title_suggestions || [];
      
      console.log('🔍 Keyword analysis:', keywordAnalysis);
      console.log('🔍 Keyword analysis keys:', Object.keys(keywordAnalysis));
      console.log('📝 Title suggestions:', titleSuggestions);
      console.log('📝 Title suggestions length:', titleSuggestions.length);
      
      // Check if we have any data to work with
      if (Object.keys(keywordAnalysis).length === 0 && titleSuggestions.length === 0) {
        console.warn('⚠️ No keyword analysis or title suggestions found in research results');
        console.warn('⚠️ Research results structure:', JSON.stringify(researchResults, null, 2));
        // Create fallback suggestions based on available data
        return this.createFallbackSuggestions(researchResults, targetAudience);
      }

      // If we have minimal data, create at least one suggestion
      if (Object.keys(keywordAnalysis).length === 0 && titleSuggestions.length > 0) {
        console.log('🔄 Creating suggestions from title suggestions only...');
        return this.createSuggestionsFromTitles(titleSuggestions, targetAudience);
      }
      
      // 1. Create pillar content suggestion
      const pillarSuggestion = this.createPillarContentSuggestion(
        keywordAnalysis,
        titleSuggestions,
        targetAudience
      );
      if (pillarSuggestion) {
        console.log('✅ Pillar suggestion created:', pillarSuggestion.title);
        suggestions.push(pillarSuggestion);
      } else {
        console.warn('⚠️ No pillar suggestion created');
      }
      
      // 2. Create supporting content suggestions
      const supportingSuggestions = this.createSupportingContentSuggestions(
        keywordAnalysis,
        titleSuggestions,
        targetAudience
      );
      console.log(`✅ Created ${supportingSuggestions.length} supporting suggestions`);
      suggestions.push(...supportingSuggestions);
      
      // 3. Create how-to content suggestions
      const howToSuggestions = this.createHowToContentSuggestions(
        keywordAnalysis,
        targetAudience
      );
      console.log(`✅ Created ${howToSuggestions.length} how-to suggestions`);
      suggestions.push(...howToSuggestions);
      
      // 4. Create list content suggestions
      const listSuggestions = this.createListContentSuggestions(
        keywordAnalysis,
        targetAudience
      );
      console.log(`✅ Created ${listSuggestions.length} list suggestions`);
      suggestions.push(...listSuggestions);
      
      console.log(`✅ Generated ${suggestions.length} content suggestions`);
      
      // If no suggestions were generated, create at least one fallback
      if (suggestions.length === 0) {
        console.log('🔄 No suggestions generated, creating emergency fallback...');
        return this.createEmergencyFallback(targetAudience);
      }
      
      return suggestions;
      
    } catch (error) {
      console.error('❌ Error generating content suggestions:', error);
      console.log('🆘 Creating emergency fallback due to error...');
      return this.createEmergencyFallback(targetAudience);
    }
  }
  
  /**
   * Create pillar content suggestion (comprehensive guide)
   */
  private createPillarContentSuggestion(
    keywordAnalysis: any,
    titleSuggestions: any[],
    targetAudience: string
  ): ContentSuggestion | null {
    console.log('🏗️ Creating pillar content suggestion...');
    console.log('🔍 Available keywords:', Object.keys(keywordAnalysis));
    
    // Find the highest volume, broadest keyword for pillar content
    let pillarKeyword = Object.entries(keywordAnalysis)
      .sort(([,a]: any, [,b]: any) => (b.search_volume || 0) - (a.search_volume || 0))
      .find(([keyword, data]: any) => data.difficulty === 'medium' || data.difficulty === 'hard')?.[0];
    
    // If no medium/hard keywords, use the highest volume keyword regardless of difficulty
    if (!pillarKeyword) {
      pillarKeyword = Object.entries(keywordAnalysis)
        .sort(([,a]: any, [,b]: any) => (b.search_volume || 0) - (a.search_volume || 0))[0]?.[0];
    }
    
    // If still no keyword, use the first available keyword
    if (!pillarKeyword) {
      pillarKeyword = Object.keys(keywordAnalysis)[0];
    }
    
    if (!pillarKeyword) {
      console.warn('⚠️ No keywords available for pillar content');
      return null;
    }
    
    const pillarData = keywordAnalysis[pillarKeyword];
    const bestTitle = titleSuggestions.find(t => t.type === 'guide') || titleSuggestions[0];
    
    return {
      id: `pillar-${Date.now()}`,
      title: bestTitle?.title || `Complete Guide to ${pillarKeyword}`,
      type: 'pillar',
      primary_keyword: pillarKeyword,
      secondary_keywords: pillarData.related_keywords || [],
      target_audience: targetAudience,
      word_count_target: 3000,
      difficulty: pillarData.difficulty,
      seo_potential: Math.min(100, (pillarData.search_volume || 0) / 100),
      content_angle: `Comprehensive guide covering all aspects of ${pillarKeyword}`,
      outline: [
        'Introduction and overview',
        'Key concepts and definitions',
        'Step-by-step implementation',
        'Common challenges and solutions',
        'Best practices and tips',
        'Conclusion and next steps'
      ],
      estimated_traffic: pillarData.search_volume > 10000 ? 'high' : pillarData.search_volume > 1000 ? 'medium' : 'low',
      priority: 'high'
    };
  }
  
  /**
   * Create supporting content suggestions
   */
  private createSupportingContentSuggestions(
    keywordAnalysis: any,
    titleSuggestions: any[],
    targetAudience: string
  ): ContentSuggestion[] {
    const suggestions: ContentSuggestion[] = [];
    
    // Get top 5 keywords for supporting content
    const topKeywords = Object.entries(keywordAnalysis)
      .sort(([,a]: any, [,b]: any) => (b.search_volume || 0) - (a.search_volume || 0))
      .slice(0, 5);
    
    topKeywords.forEach(([keyword, data]: any, index) => {
      if (data.difficulty === 'easy' || data.difficulty === 'medium') {
        const title = titleSuggestions.find(t => 
          t.title.toLowerCase().includes(keyword.toLowerCase())
        ) || titleSuggestions[index % titleSuggestions.length];
        
        suggestions.push({
          id: `supporting-${Date.now()}-${index}`,
          title: title?.title || `Understanding ${keyword}`,
          type: 'supporting',
          primary_keyword: keyword,
          secondary_keywords: data.related_keywords || [],
          target_audience: targetAudience,
          word_count_target: 1500,
          difficulty: data.difficulty,
          seo_potential: Math.min(100, (data.search_volume || 0) / 50),
          content_angle: `Deep dive into ${keyword} for ${targetAudience}`,
          outline: [
            'What is it?',
            'Why it matters',
            'How to implement',
            'Examples and case studies',
            'Conclusion'
          ],
          estimated_traffic: data.search_volume > 5000 ? 'high' : data.search_volume > 500 ? 'medium' : 'low',
          priority: data.difficulty === 'easy' ? 'high' : 'medium'
        });
      }
    });
    
    return suggestions;
  }
  
  /**
   * Create how-to content suggestions
   */
  private createHowToContentSuggestions(
    keywordAnalysis: any,
    targetAudience: string
  ): ContentSuggestion[] {
    const suggestions: ContentSuggestion[] = [];
    
    // Find keywords that work well for how-to content
    const howToKeywords = Object.entries(keywordAnalysis)
      .filter(([keyword, data]: any) => 
        keyword.toLowerCase().includes('how') || 
        keyword.toLowerCase().includes('guide') ||
        keyword.toLowerCase().includes('tutorial') ||
        data.difficulty === 'easy'
      )
      .slice(0, 3);
    
    howToKeywords.forEach(([keyword, data]: any, index) => {
      suggestions.push({
        id: `howto-${Date.now()}-${index}`,
        title: `How to ${keyword.replace(/^(how to|guide to|tutorial on)\s+/i, '')}`,
        type: 'how-to',
        primary_keyword: keyword,
        secondary_keywords: data.related_keywords || [],
        target_audience: targetAudience,
        word_count_target: 1200,
        difficulty: 'easy',
        seo_potential: Math.min(100, (data.search_volume || 0) / 30),
        content_angle: `Step-by-step tutorial for ${targetAudience}`,
        outline: [
          'Introduction',
          'Prerequisites',
          'Step 1: Getting started',
          'Step 2: Implementation',
          'Step 3: Testing and validation',
          'Troubleshooting',
          'Conclusion'
        ],
        estimated_traffic: data.search_volume > 2000 ? 'high' : data.search_volume > 200 ? 'medium' : 'low',
        priority: 'high'
      });
    });
    
    return suggestions;
  }
  
  /**
   * Create list content suggestions
   */
  private createListContentSuggestions(
    keywordAnalysis: any,
    targetAudience: string
  ): ContentSuggestion[] {
    const suggestions: ContentSuggestion[] = [];
    
    // Find keywords that work well for list content
    const listKeywords = Object.entries(keywordAnalysis)
      .filter(([keyword, data]: any) => 
        keyword.toLowerCase().includes('best') || 
        keyword.toLowerCase().includes('top') ||
        keyword.toLowerCase().includes('list') ||
        keyword.toLowerCase().includes('tools')
      )
      .slice(0, 2);
    
    listKeywords.forEach(([keyword, data]: any, index) => {
      suggestions.push({
        id: `list-${Date.now()}-${index}`,
        title: `${keyword} for ${targetAudience}`,
        type: 'list',
        primary_keyword: keyword,
        secondary_keywords: data.related_keywords || [],
        target_audience: targetAudience,
        word_count_target: 1000,
        difficulty: 'easy',
        seo_potential: Math.min(100, (data.search_volume || 0) / 40),
        content_angle: `Curated list of ${keyword} for ${targetAudience}`,
        outline: [
          'Introduction',
          'Criteria for selection',
          'Item 1 with description',
          'Item 2 with description',
          'Item 3 with description',
          'Additional recommendations',
          'Conclusion'
        ],
        estimated_traffic: data.search_volume > 3000 ? 'high' : data.search_volume > 300 ? 'medium' : 'low',
        priority: 'medium'
      });
    });
    
    return suggestions;
  }
  
  /**
   * Generate content clusters from suggestions
   */
  generateContentClusters(suggestions: ContentSuggestion[]): ContentCluster[] {
    const clusters: ContentCluster[] = [];
    
    // Group suggestions by primary keyword similarity
    const groupedSuggestions = this.groupSuggestionsByTopic(suggestions);
    
    Object.entries(groupedSuggestions).forEach(([topic, topicSuggestions]) => {
      const pillarSuggestion = topicSuggestions.find(s => s.type === 'pillar');
      const supportingSuggestions = topicSuggestions.filter(s => s.type !== 'pillar');
      
      if (pillarSuggestion) {
        clusters.push({
          id: `cluster-${Date.now()}-${topic}`,
          name: topic,
          pillar_keyword: pillarSuggestion.primary_keyword,
          authority_potential: pillarSuggestion.seo_potential,
          suggestions: topicSuggestions,
          total_keywords: topicSuggestions.reduce((sum, s) => sum + s.secondary_keywords.length, 0),
          supporting_topics: supportingSuggestions.length
        });
      }
    });
    
    return clusters;
  }
  
  /**
   * Create suggestions from title suggestions when keyword analysis is missing
   */
  private createSuggestionsFromTitles(titleSuggestions: any[], targetAudience: string): ContentSuggestion[] {
    console.log('🔄 Creating suggestions from title suggestions...');
    
    const suggestions: ContentSuggestion[] = [];
    
    titleSuggestions.slice(0, 3).forEach((titleSuggestion, index) => {
      const title = titleSuggestion.title || titleSuggestion;
      const type = titleSuggestion.type || 'guide';
      
      // Extract a keyword from the title
      const words = title.toLowerCase().split(' ');
      const primaryKeyword = words.find(word => 
        word.length > 3 && 
        !['the', 'and', 'for', 'with', 'from', 'this', 'that', 'your', 'how', 'what', 'why', 'when', 'where'].includes(word)
      ) || words[0] || 'content';
      
      suggestions.push({
        id: `title-${Date.now()}-${index}`,
        title: title,
        type: type === 'guide' ? 'pillar' : type === 'how-to' ? 'how-to' : 'supporting',
        primary_keyword: primaryKeyword,
        secondary_keywords: words.slice(0, 3).filter(word => word !== primaryKeyword),
        target_audience: targetAudience,
        word_count_target: type === 'pillar' ? 2500 : 1500,
        difficulty: 'medium',
        seo_potential: 60,
        content_angle: `${title} for ${targetAudience}`,
        outline: [
          'Introduction and overview',
          'Key concepts and benefits',
          'Implementation strategies',
          'Best practices and tips',
          'Conclusion and next steps'
        ],
        estimated_traffic: 'medium',
        priority: 'high'
      });
    });
    
    console.log(`✅ Created ${suggestions.length} suggestions from titles`);
    return suggestions;
  }

  /**
   * Create emergency fallback suggestions when everything else fails
   */
  private createEmergencyFallback(targetAudience: string): ContentSuggestion[] {
    console.log('🆘 Creating emergency fallback suggestions...');
    
    return [
      {
        id: `emergency-${Date.now()}`,
        title: `Complete Guide to Content Marketing for ${targetAudience}`,
        type: 'pillar',
        primary_keyword: 'content marketing',
        secondary_keywords: ['content strategy', 'content creation', 'content optimization'],
        target_audience: targetAudience,
        word_count_target: 2500,
        difficulty: 'medium',
        seo_potential: 70,
        content_angle: `Comprehensive guide to content marketing strategies for ${targetAudience}`,
        outline: [
          'What is content marketing and why it matters',
          'Content marketing strategies that work',
          'How to create engaging content',
          'Content distribution and promotion',
          'Measuring content marketing success',
          'Best practices and future trends'
        ],
        estimated_traffic: 'high',
        priority: 'high'
      }
    ];
  }

  /**
   * Create fallback suggestions when research data is minimal
   */
  private createFallbackSuggestions(researchResults: any, targetAudience: string): ContentSuggestion[] {
    console.log('🔄 Creating fallback suggestions...');
    
    const suggestions: ContentSuggestion[] = [];
    
    // Try to extract any available keywords or topics
    const extractedKeywords = researchResults.extracted_keywords || [];
    const topic = researchResults.topic || 'content marketing';
    
    if (extractedKeywords.length > 0) {
      // Create suggestions based on extracted keywords
      extractedKeywords.slice(0, 3).forEach((keyword: string, index: number) => {
        suggestions.push({
          id: `fallback-${Date.now()}-${index}`,
          title: `Complete Guide to ${keyword}`,
          type: 'pillar',
          primary_keyword: keyword,
          secondary_keywords: extractedKeywords.filter((k: string) => k !== keyword).slice(0, 3),
          target_audience: targetAudience,
          word_count_target: 2000,
          difficulty: 'medium',
          seo_potential: 60,
          content_angle: `Comprehensive guide covering ${keyword} for ${targetAudience}`,
          outline: [
            'Introduction and overview',
            'Key concepts and benefits',
            'Implementation strategies',
            'Best practices and tips',
            'Conclusion and next steps'
          ],
          estimated_traffic: 'medium',
          priority: 'high'
        });
      });
    } else {
      // Create generic suggestions based on topic
      suggestions.push({
        id: `fallback-${Date.now()}-generic`,
        title: `Ultimate Guide to ${topic}`,
        type: 'pillar',
        primary_keyword: topic,
        secondary_keywords: [`${topic} strategies`, `${topic} tips`, `${topic} best practices`],
        target_audience: targetAudience,
        word_count_target: 2500,
        difficulty: 'medium',
        seo_potential: 50,
        content_angle: `Comprehensive guide to ${topic} for ${targetAudience}`,
        outline: [
          'What is it and why it matters',
          'Key strategies and approaches',
          'Implementation guide',
          'Common challenges and solutions',
          'Success metrics and optimization',
          'Conclusion and future trends'
        ],
        estimated_traffic: 'medium',
        priority: 'high'
      });
    }
    
    console.log(`✅ Created ${suggestions.length} fallback suggestions`);
    return suggestions;
  }

  /**
   * Group suggestions by topic similarity
   */
  private groupSuggestionsByTopic(suggestions: ContentSuggestion[]): Record<string, ContentSuggestion[]> {
    const groups: Record<string, ContentSuggestion[]> = {};
    
    suggestions.forEach(suggestion => {
      // Simple grouping by primary keyword similarity
      const baseKeyword = suggestion.primary_keyword.split(' ')[0];
      if (!groups[baseKeyword]) {
        groups[baseKeyword] = [];
      }
      groups[baseKeyword].push(suggestion);
    });
    
    return groups;
  }
}

// Create singleton instance
const contentSuggestionService = new ContentSuggestionService();

export default contentSuggestionService;
export { ContentSuggestionService };
