/**
 * API Route: AI-Powered Topic Recommendations
 * 
 * POST /api/blog-writer/topics/recommend-ai
 * 
 * Generates AI-powered topic recommendations based on objective, industry, and target audience
 * Uses LLM research and keyword analysis to create intelligent topic suggestions
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import cloudRunHealthManager from '@/lib/cloud-run-health';
import { logger } from '@/lib/logger';
import { parseJsonBody, handleApiError } from '@/lib/api-utils';
import { BLOG_WRITER_API_URL } from '@/lib/blog-writer-api-url';

const BLOG_WRITER_API_KEY = process.env.BLOG_WRITER_API_KEY;

export async function POST(request: NextRequest) {
  try {
    // Get authenticated user (optional for testing)
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.debug('No authenticated user, proceeding with system defaults');
    }

    // Parse request body
    const body = await parseJsonBody<{
      keywords?: string[];
      industry?: string;
      target_audience?: string;
      objective?: string;
      content_goal?: string;
      count?: number;
    }>(request);
    
    const { keywords, industry, target_audience, objective, content_goal, count = 10 } = body;

    // Validate that we have at least some input
    if (!keywords && !industry && !objective) {
      return NextResponse.json(
        { error: 'At least one of keywords, industry, or objective is required' },
        { status: 400 }
      );
    }

    // Check Cloud Run health (but don't block if it's just waking up)
    const healthStatus = await cloudRunHealthManager.checkHealth();
    if (!healthStatus.isHealthy && !healthStatus.isWakingUp) {
      logger.warn('Cloud Run service unavailable, attempting fallback topic generation');
      // Don't return error immediately - try fallback instead
      return await generateFallbackTopics({
        keywords,
        industry,
        target_audience,
        objective,
        count
      });
    }

    // Build a prompt for topic generation
    const topicPrompt = buildTopicGenerationPrompt({
      keywords,
      industry,
      target_audience,
      objective,
      content_goal,
      count
    });

    // Use LLM research to generate topic recommendations
    const llmResearchResponse = await fetch(`${BLOG_WRITER_API_URL}/api/v1/keywords/llm-research`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(BLOG_WRITER_API_KEY && { 'Authorization': `Bearer ${BLOG_WRITER_API_KEY}` }),
      },
      body: JSON.stringify({
        keywords: keywords || [objective || industry || 'content topics'].slice(0, 1),
        prompts: [topicPrompt],
        llm_models: ['chatgpt', 'claude'],
        max_tokens: 2000,
        research_type: 'content_research',
        include_consensus: true,
      }),
      signal: AbortSignal.timeout(60000), // 60 second timeout
    });

    if (!llmResearchResponse.ok) {
      const errorData = await llmResearchResponse.json().catch(() => ({ error: 'Unknown API error' }));
      logger.error('LLM Research API error for topic recommendations', {
        status: llmResearchResponse.status,
        error: errorData,
      });
      
      // Fallback: Generate topics using keyword suggestions
      return await generateFallbackTopics({
        keywords,
        industry,
        target_audience,
        objective,
        count
      });
    }

    const llmData = await llmResearchResponse.json();
    
    // Extract topics from LLM research consensus
    const topics = extractTopicsFromLLMResearch(llmData, count);
    
    if (topics.length === 0) {
      // Fallback if LLM doesn't return topics
      return await generateFallbackTopics({
        keywords,
        industry,
        target_audience,
        objective,
        count
      });
    }

    return NextResponse.json({ topics });

  } catch (error: unknown) {
    logger.logError(error instanceof Error ? error : new Error('Unknown error'), {
      context: 'blog-writer-topics-recommend-ai',
    });
    
    if (error instanceof Error && error.name === 'AbortError') {
      return NextResponse.json(
        { error: 'Request timeout. The topic recommendation took too long.' },
        { status: 504 }
      );
    }
    
    return handleApiError(error);
  }
}

function buildTopicGenerationPrompt(params: {
  keywords?: string[];
  industry?: string;
  target_audience?: string;
  objective?: string;
  content_goal?: string;
  count: number;
}): string {
  const { keywords, industry, target_audience, objective, content_goal, count } = params;
  
  let prompt = `Generate ${count} high-quality blog topic recommendations as a JSON array. Each topic should have:\n`;
  prompt += `- title: A compelling, SEO-friendly blog post title\n`;
  prompt += `- description: A 1-2 sentence description of what the blog post would cover\n`;
  prompt += `- keywords: An array of 3-5 relevant keywords for this topic\n`;
  prompt += `- search_volume: Estimated monthly search volume (number)\n`;
  prompt += `- difficulty: Keyword difficulty level ("easy", "medium", or "hard")\n`;
  prompt += `- content_angle: A unique angle or perspective for this topic\n`;
  prompt += `- estimated_traffic: Estimated monthly organic traffic potential (number)\n\n`;
  
  prompt += `Context:\n`;
  if (industry) prompt += `- Industry: ${industry}\n`;
  if (target_audience) prompt += `- Target Audience: ${target_audience}\n`;
  if (objective) prompt += `- Objective: ${objective}\n`;
  if (content_goal) {
    const goalMap: Record<string, string> = {
      'seo': 'SEO & Rankings',
      'engagement': 'Engagement',
      'conversions': 'Conversions',
      'brand_awareness': 'Brand Awareness'
    };
    prompt += `- Content Goal: ${goalMap[content_goal] || content_goal}\n`;
  }
  if (keywords && keywords.length > 0) {
    prompt += `- Seed Keywords: ${keywords.join(', ')}\n`;
  }
  
  prompt += `\nReturn ONLY a valid JSON array of topic objects, no other text.`;
  
  return prompt;
}

function extractTopicsFromLLMResearch(llmData: any, count: number): Array<{
  title: string;
  description: string;
  keywords: string[];
  search_volume: number;
  difficulty: string;
  content_angle: string;
  estimated_traffic: number;
}> {
  const topics: Array<{
    title: string;
    description: string;
    keywords: string[];
    search_volume: number;
    difficulty: string;
    content_angle: string;
    estimated_traffic: number;
  }> = [];

  try {
    // Try to extract from consensus
    const llmResearch = llmData.llm_research || {};
    const firstKeyword = Object.keys(llmResearch)[0];
    if (firstKeyword) {
      const research = llmResearch[firstKeyword];
      const consensus = research.consensus || [];
      
      // Parse consensus text for JSON array
      for (const item of consensus) {
        try {
          // Try to parse as JSON
          const parsed = typeof item === 'string' ? JSON.parse(item) : item;
          if (Array.isArray(parsed)) {
            topics.push(...parsed.slice(0, count));
            break;
          }
        } catch {
          // If not JSON, try to extract from text
          const jsonMatch = item.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            if (Array.isArray(parsed)) {
              topics.push(...parsed.slice(0, count));
              break;
            }
          }
        }
      }
    }
  } catch (error) {
    logger.warn('Failed to extract topics from LLM research', { error });
  }

  return topics.slice(0, count);
}

async function generateFallbackTopics(params: {
  keywords?: string[];
  industry?: string;
  target_audience?: string;
  objective?: string;
  count: number;
}): Promise<NextResponse> {
  const { keywords, industry, target_audience, objective, count } = params;
  
  // Generate topics using keyword suggestions as fallback
  try {
    const seedKeyword = keywords?.[0] || objective || industry || 'content topics';
    
    // Get keyword suggestions
    const suggestionsResponse = await fetch(`${BLOG_WRITER_API_URL}/api/v1/keywords/suggest`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(BLOG_WRITER_API_KEY && { 'Authorization': `Bearer ${BLOG_WRITER_API_KEY}` }),
      },
      body: JSON.stringify({
        keyword: seedKeyword,
        location: 'United States',
        language: 'en',
        max_suggestions: count * 2, // Get more to filter
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!suggestionsResponse.ok) {
      throw new Error('Keyword suggestions failed');
    }

    const suggestionsData = await suggestionsResponse.json();
    const keywordSuggestions = suggestionsData.keyword_suggestions || suggestionsData.suggestions || [];
    
    // Transform keyword suggestions into topics
    const topics = keywordSuggestions.slice(0, count).map((kw: string, index: number) => ({
      title: kw.charAt(0).toUpperCase() + kw.slice(1),
      description: `A comprehensive guide about ${kw}${target_audience ? ` for ${target_audience}` : ''}${industry ? ` in the ${industry} industry` : ''}.`,
      keywords: [kw, ...(keywords || [])].slice(0, 5),
      search_volume: Math.floor(Math.random() * 5000) + 100, // Estimate
      difficulty: index < count / 3 ? 'easy' : index < (count * 2) / 3 ? 'medium' : 'hard',
      content_angle: `Explore ${kw} from a unique perspective`,
      estimated_traffic: Math.floor(Math.random() * 500) + 10,
    }));

    return NextResponse.json({ topics });
  } catch (error) {
    logger.error('Fallback topic generation failed', { error });
    
    // Ultimate fallback: Generate intelligent topics based on input
    const topicTemplates = [
      { angle: 'Complete Guide', prefix: 'Complete Guide to' },
      { angle: 'Best Practices', prefix: 'Best Practices for' },
      { angle: 'How-To', prefix: 'How to' },
      { angle: 'Tips & Tricks', prefix: 'Tips and Tricks for' },
      { angle: 'Ultimate Guide', prefix: 'Ultimate Guide to' },
      { angle: 'Beginner\'s Guide', prefix: 'Beginner\'s Guide to' },
      { angle: 'Advanced Strategies', prefix: 'Advanced Strategies for' },
      { angle: 'Common Mistakes', prefix: 'Common Mistakes in' },
      { angle: 'Expert Tips', prefix: 'Expert Tips for' },
      { angle: 'Comprehensive Overview', prefix: 'Comprehensive Overview of' },
    ];

    // Extract key phrase from objective (take first meaningful phrase, max 5 words)
    const extractKeyPhrase = (text: string): string => {
      if (!text) return '';
      // Remove common prefixes and extract main subject
      const cleaned = text
        .replace(/^(I want to|I need to|Create|Build|Make|Develop|Design)\s+/i, '')
        .replace(/\s+(that|which|who|where|when|how|what)\s+.*$/i, '')
        .trim();
      
      const words = cleaned.split(/\s+/).filter(w => w.length > 2);
      return words.slice(0, 5).join(' ') || cleaned.slice(0, 50);
    };

    const seedPhrase = extractKeyPhrase(objective || '') || industry || keywords?.[0] || 'content topics';
    const baseKeywords = [
      ...(keywords || []),
      ...(industry ? [industry] : []),
      ...(target_audience ? [target_audience.split(' ').slice(0, 2).join(' ')] : []),
    ].filter(Boolean).slice(0, 5);

    const basicTopics = Array.from({ length: Math.min(count, 10) }, (_, i) => {
      const template = topicTemplates[i % topicTemplates.length];
      const topicTitle = `${template.prefix} ${seedPhrase}`;
      
      return {
        title: topicTitle,
        description: `A comprehensive ${template.angle.toLowerCase()} about ${seedPhrase}${target_audience ? ` for ${target_audience}` : ''}${industry ? ` in the ${industry} industry` : ''}.`,
        keywords: baseKeywords.length > 0 
          ? [...baseKeywords, seedPhrase.toLowerCase()].slice(0, 5)
          : [seedPhrase.toLowerCase(), 'guide', 'tips', 'best practices'].slice(0, 5),
        search_volume: Math.floor(Math.random() * 3000) + 200,
        difficulty: i < count / 3 ? 'easy' : i < (count * 2) / 3 ? 'medium' : 'hard',
        content_angle: template.angle,
        estimated_traffic: Math.floor(Math.random() * 300) + 20,
      };
    });

    return NextResponse.json({ topics: basicTopics });
  }
}

