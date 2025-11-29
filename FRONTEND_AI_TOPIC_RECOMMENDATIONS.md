# AI Topic Recommendations Component

**Version:** 1.3.5  
**API Endpoint:** `POST /api/v1/keywords/ai-optimization`  
**Base URL:** `https://blog-writer-api-dev-kq42l26tuq-od.a.run.app`

---

## 🎯 Overview

This component provides AI-powered topic recommendations based on keyword analysis. It uses the AI optimization endpoint to identify topics that are optimized for AI visibility (ChatGPT, Claude, Gemini, etc.).

---

## 📦 Component Implementation

### TypeScript Types

```typescript
// types/ai-recommendations.ts

export interface AIOptimizationRequest {
  keywords: string[];
  location?: string;
  language?: string;
}

export interface AIOptimizationAnalysis {
  ai_search_volume: number;
  traditional_search_volume: number;
  ai_trend: number;
  ai_monthly_searches: Array<{
    year: number;
    month: number;
    search_volume: number;
  }>;
  ai_optimization_score: number; // 0-100
  ai_recommended: boolean;
  ai_reason: string;
  comparison: {
    ai_to_traditional_ratio: number;
    ai_growth_trend: 'increasing' | 'decreasing' | 'stable';
  };
}

export interface AIOptimizationResponse {
  ai_optimization_analysis: Record<string, AIOptimizationAnalysis>;
  total_keywords: number;
  location: string;
  language: string;
  summary: {
    keywords_with_ai_volume: number;
    average_ai_score: number;
    recommended_keywords: string[];
  };
}

export interface TopicRecommendation {
  keyword: string;
  aiScore: number;
  aiSearchVolume: number;
  traditionalSearchVolume: number;
  aiTrend: number;
  reason: string;
  recommended: boolean;
  growthTrend: 'increasing' | 'decreasing' | 'stable';
}
```

---

## 🎨 React Component

```typescript
// components/AITopicRecommendations.tsx

import React, { useState } from 'react';
import { TopicRecommendation } from '@/types/ai-recommendations';

const API_BASE_URL = 'https://blog-writer-api-dev-kq42l26tuq-od.a.run.app';

interface AITopicRecommendationsProps {
  initialKeywords?: string[];
  objective?: 'SEO & Rankings' | 'Engagement' | 'Conversions' | 'Brand Awareness';
  industry?: string;
  onRecommendationsGenerated?: (recommendations: TopicRecommendation[]) => void;
}

export function AITopicRecommendations({
  initialKeywords = [],
  objective,
  industry,
  onRecommendationsGenerated,
}: AITopicRecommendationsProps) {
  const [loading, setLoading] = useState(false);
  const [recommendations, setRecommendations] = useState<TopicRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);

  const getRecommendations = async () => {
    if (initialKeywords.length === 0) {
      setError('Please provide at least one keyword');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/keywords/ai-optimization`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          keywords: initialKeywords,
          location: 'United States',
          language: 'en',
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Transform API response to recommendations
      const transformedRecommendations: TopicRecommendation[] = Object.entries(
        data.ai_optimization_analysis
      ).map(([keyword, analysis]: [string, any]) => ({
        keyword,
        aiScore: analysis.ai_optimization_score,
        aiSearchVolume: analysis.ai_search_volume,
        traditionalSearchVolume: analysis.traditional_search_volume,
        aiTrend: analysis.ai_trend,
        reason: analysis.ai_reason,
        recommended: analysis.ai_recommended,
        growthTrend: analysis.comparison.ai_growth_trend,
      }));

      // Sort by AI score (highest first)
      transformedRecommendations.sort((a, b) => b.aiScore - a.aiScore);

      setRecommendations(transformedRecommendations);
      
      if (onRecommendationsGenerated) {
        onRecommendationsGenerated(transformedRecommendations);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to get recommendations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="ai-topic-recommendations">
      <div className="recommendations-header">
        <h3>Topic Recommendations</h3>
        <p className="description">
          Get AI-powered topic suggestions based on your objective and industry.
        </p>
      </div>

      <button
        onClick={getRecommendations}
        disabled={loading || initialKeywords.length === 0}
        className="get-recommendations-btn"
      >
        {loading ? (
          <>
            <span className="spinner" />
            Analyzing...
          </>
        ) : (
          <>
            <span className="icon">💡</span>
            Get Recommendations
          </>
        )}
      </button>

      {error && (
        <div className="error-message">
          ⚠️ {error}
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="recommendations-list">
          <div className="recommendations-summary">
            <p>
              Found <strong>{recommendations.length}</strong> AI-optimized topics
              {recommendations.filter(r => r.recommended).length > 0 && (
                <span className="recommended-count">
                  {' '}({recommendations.filter(r => r.recommended).length} highly recommended)
                </span>
              )}
            </p>
          </div>

          <div className="recommendations-grid">
            {recommendations.map((rec, index) => (
              <TopicCard
                key={rec.keyword}
                recommendation={rec}
                rank={index + 1}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface TopicCardProps {
  recommendation: TopicRecommendation;
  rank: number;
}

function TopicCard({ recommendation, rank }: TopicCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 70) return '#10b981'; // green
    if (score >= 50) return '#3b82f6'; // blue
    if (score >= 30) return '#f59e0b'; // amber
    return '#ef4444'; // red
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'increasing':
        return '📈';
      case 'decreasing':
        return '📉';
      default:
        return '➡️';
    }
  };

  return (
    <div
      className={`topic-card ${recommendation.recommended ? 'recommended' : ''}`}
    >
      <div className="card-header">
        <span className="rank">#{rank}</span>
        {recommendation.recommended && (
          <span className="recommended-badge">⭐ Recommended</span>
        )}
      </div>

      <h4 className="topic-title">{recommendation.keyword}</h4>

      <div className="ai-score">
        <div className="score-label">AI Optimization Score</div>
        <div className="score-value" style={{ color: getScoreColor(recommendation.aiScore) }}>
          {recommendation.aiScore}/100
        </div>
        <div className="score-bar">
          <div
            className="score-fill"
            style={{
              width: `${recommendation.aiScore}%`,
              backgroundColor: getScoreColor(recommendation.aiScore),
            }}
          />
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric">
          <div className="metric-label">AI Search Volume</div>
          <div className="metric-value">
            {recommendation.aiSearchVolume.toLocaleString()}
          </div>
        </div>
        <div className="metric">
          <div className="metric-label">Traditional Volume</div>
          <div className="metric-value">
            {recommendation.traditionalSearchVolume.toLocaleString()}
          </div>
        </div>
        <div className="metric">
          <div className="metric-label">AI Trend</div>
          <div className="metric-value">
            {getTrendIcon(recommendation.growthTrend)} {recommendation.growthTrend}
          </div>
        </div>
      </div>

      <div className="reason">
        <p>{recommendation.reason}</p>
      </div>

      <div className="card-actions">
        <button className="select-btn">Select Topic</button>
        <button className="info-btn">View Details</button>
      </div>
    </div>
  );
}
```

---

## 🎨 CSS Styling

```css
/* components/AITopicRecommendations.css */

.ai-topic-recommendations {
  padding: 24px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.recommendations-header {
  margin-bottom: 24px;
}

.recommendations-header h3 {
  font-size: 24px;
  font-weight: 600;
  color: #111827;
  margin-bottom: 8px;
}

.recommendations-header .description {
  font-size: 14px;
  color: #6b7280;
  margin: 0;
}

.get-recommendations-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  margin-bottom: 24px;
}

.get-recommendations-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4);
}

.get-recommendations-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.get-recommendations-btn .spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: white;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-message {
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #991b1b;
  margin-bottom: 24px;
}

.recommendations-list {
  margin-top: 32px;
}

.recommendations-summary {
  margin-bottom: 24px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 8px;
}

.recommendations-summary p {
  margin: 0;
  font-size: 14px;
  color: #374151;
}

.recommendations-summary .recommended-count {
  color: #6366f1;
  font-weight: 600;
}

.recommendations-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
}

.topic-card {
  background: white;
  border: 2px solid #e5e7eb;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.2s ease;
}

.topic-card:hover {
  border-color: #6366f1;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.1);
}

.topic-card.recommended {
  border-color: #10b981;
  background: linear-gradient(to bottom, #f0fdf4 0%, white 10%);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.rank {
  font-size: 14px;
  font-weight: 600;
  color: #6b7280;
}

.recommended-badge {
  font-size: 12px;
  font-weight: 600;
  color: #10b981;
  background: #d1fae5;
  padding: 4px 8px;
  border-radius: 4px;
}

.topic-title {
  font-size: 18px;
  font-weight: 600;
  color: #111827;
  margin: 0 0 16px 0;
  line-height: 1.4;
}

.ai-score {
  margin-bottom: 16px;
}

.score-label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}

.score-value {
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
}

.score-bar {
  height: 8px;
  background: #e5e7eb;
  border-radius: 4px;
  overflow: hidden;
}

.score-fill {
  height: 100%;
  border-radius: 4px;
  transition: width 0.3s ease;
}

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.metric {
  text-align: center;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
}

.metric-label {
  font-size: 11px;
  color: #6b7280;
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.metric-value {
  font-size: 14px;
  font-weight: 600;
  color: #111827;
}

.reason {
  margin-bottom: 16px;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
}

.reason p {
  margin: 0;
  font-size: 13px;
  color: #4b5563;
  line-height: 1.5;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.select-btn,
.info-btn {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 6px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}

.select-btn {
  background: #6366f1;
  color: white;
}

.select-btn:hover {
  background: #4f46e5;
}

.info-btn {
  background: #f3f4f6;
  color: #374151;
}

.info-btn:hover {
  background: #e5e7eb;
}
```

---

## 🔌 Integration Example

```typescript
// pages/admin/workflow/objective.tsx

import { AITopicRecommendations } from '@/components/AITopicRecommendations';

export default function ObjectivePage() {
  const [selectedObjective, setSelectedObjective] = useState<string | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);

  // Get keywords from previous step or user input
  const initialKeywords = ['pet grooming', 'dog grooming', 'cat grooming'];

  const handleRecommendationsGenerated = (recommendations: TopicRecommendation[]) => {
    console.log('AI Recommendations:', recommendations);
    // Save to state or send to backend
  };

  return (
    <div className="workflow-page">
      {/* Your existing objective selection UI */}
      
      <AITopicRecommendations
        initialKeywords={initialKeywords}
        objective={selectedObjective}
        onRecommendationsGenerated={handleRecommendationsGenerated}
      />
    </div>
  );
}
```

---

## 📊 Response Example

```json
{
  "ai_optimization_analysis": {
    "pet grooming": {
      "ai_search_volume": 47955,
      "traditional_search_volume": 110000,
      "ai_trend": 0.15,
      "ai_optimization_score": 75,
      "ai_recommended": true,
      "ai_reason": "Excellent AI visibility - high volume and positive trend",
      "comparison": {
        "ai_to_traditional_ratio": 0.436,
        "ai_growth_trend": "increasing"
      }
    }
  },
  "summary": {
    "keywords_with_ai_volume": 1,
    "average_ai_score": 75,
    "recommended_keywords": ["pet grooming"]
  }
}
```

---

## ✅ Features

- ✅ AI-powered topic scoring (0-100)
- ✅ AI search volume vs traditional search volume
- ✅ Trend analysis (increasing/decreasing/stable)
- ✅ Recommendation badges for high-scoring topics
- ✅ Visual score indicators with color coding
- ✅ Responsive grid layout
- ✅ Loading states and error handling
- ✅ Easy integration with existing workflow

---

## 🎯 Usage

1. Pass initial keywords (from keyword research step)
2. User clicks "Get Recommendations"
3. Component calls AI optimization endpoint
4. Displays ranked list of AI-optimized topics
5. User can select topics to continue workflow

This component focuses specifically on AI-powered topic recommendations and integrates seamlessly with your existing workflow UI.

