# Frontend Integration Guide: Enhanced Blog Generation with Progress Tracking

## Overview

The enhanced blog generation endpoint (`/api/v1/blog/generate-enhanced`) now includes real-time progress tracking that allows your frontend to display detailed status updates throughout the blog creation process. This guide explains how to integrate and display these progress updates in your frontend application.

## Table of Contents

1. [API Endpoint](#api-endpoint)
2. [Progress Updates Structure](#progress-updates-structure)
3. [Integration Patterns](#integration-patterns)
4. [React/Next.js Example](#reactnextjs-example)
5. [Vue.js Example](#vuejs-example)
6. [Vanilla JavaScript Example](#vanilla-javascript-example)
7. [UI/UX Best Practices](#uiux-best-practices)
8. [Error Handling](#error-handling)
9. [Advanced Patterns](#advanced-patterns)

---

## API Endpoint

### Endpoint
```
POST /api/v1/blog/generate-enhanced
```

### Request Headers
```javascript
{
  'Content-Type': 'application/json'
}
```

### Request Body
```typescript
interface EnhancedBlogGenerationRequest {
  topic: string;
  keywords: string[];
  tone?: 'professional' | 'casual' | 'friendly' | 'authoritative' | 'conversational' | 'technical' | 'creative';
  length?: 'short' | 'medium' | 'long' | 'extended';
  use_google_search?: boolean;
  use_fact_checking?: boolean;
  use_citations?: boolean;
  use_serp_optimization?: boolean;
  use_consensus_generation?: boolean;
  use_knowledge_graph?: boolean;
  use_semantic_keywords?: boolean;
  use_quality_scoring?: boolean;
  target_audience?: string;
  custom_instructions?: string;
  template_type?: string;
  // ... other options
}
```

### Response Structure
```typescript
interface EnhancedBlogGenerationResponse {
  title: string;
  content: string;
  meta_title: string;
  meta_description: string;
  readability_score: number;
  seo_score: number;
  stage_results: Array<{
    stage: string;
    provider: string;
    tokens: number;
    cost: number;
  }>;
  citations: Array<{
    text: string;
    url: string;
    title: string;
  }>;
  total_tokens: number;
  total_cost: number;
  generation_time: number;
  seo_metadata: Record<string, any>;
  quality_score?: number;
  quality_dimensions: Record<string, number>;
  structured_data?: Record<string, any>;
  semantic_keywords: string[];
  content_metadata: Record<string, any>;
  success: boolean;
  warnings: string[];
  
  // NEW: Progress Updates Array
  progress_updates: ProgressUpdate[];
}

interface ProgressUpdate {
  stage: string;
  stage_number: number;
  total_stages: number;
  progress_percentage: number;
  status: string;
  details?: string;
  metadata: Record<string, any>;
  timestamp: number;
}
```

---

## Progress Updates Structure

### Pipeline Stages

The pipeline emits progress updates for the following stages:

1. **initialization** - Initial setup
2. **keyword_analysis** - DataForSEO keyword analysis
3. **competitor_analysis** - DataForSEO competitor analysis
4. **intent_analysis** - Search intent detection
5. **length_optimization** - Content length optimization
6. **research_outline** - Research and outline generation
7. **draft_generation** - Initial draft creation
8. **enhancement** - Content enhancement and fact-checking
9. **seo_polish** - SEO optimization
10. **semantic_integration** - Semantic keyword integration
11. **quality_scoring** - Quality assessment
12. **finalization** - Final compilation

### Progress Update Example

```json
{
  "stage": "keyword_analysis",
  "stage_number": 2,
  "total_stages": 12,
  "progress_percentage": 16.67,
  "status": "Analyzing keywords with DataForSEO Labs",
  "details": "Analyzing 8 keywords for difficulty, search volume, and competition",
  "metadata": {},
  "timestamp": 1763064703.123
}
```

### Progress Update Flow

Each stage typically emits **two updates**:
1. **Start update**: When the stage begins
2. **Complete update**: When the stage finishes

Example flow:
```
Stage 2: "Analyzing keywords with DataForSEO Labs" (start)
Stage 2: "Keyword analysis complete" (complete)
Stage 3: "Analyzing competitors with DataForSEO Labs" (start)
Stage 3: "Competitor analysis complete" (complete)
...
```

---

## Integration Patterns

### Pattern 1: Polling (Simple)

For simple implementations, poll the endpoint and check `progress_updates`:

```typescript
async function generateBlog(request: EnhancedBlogGenerationRequest) {
  const response = await fetch('/api/v1/blog/generate-enhanced', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
  
  const data = await response.json();
  
  // Process progress updates
  if (data.progress_updates && data.progress_updates.length > 0) {
    const latest = data.progress_updates[data.progress_updates.length - 1];
    console.log(`Progress: ${latest.progress_percentage}%`);
    console.log(`Status: ${latest.status}`);
  }
  
  return data;
}
```

### Pattern 2: Real-time Display (Recommended)

Display progress updates as they're received in the response:

```typescript
async function generateBlogWithProgress(
  request: EnhancedBlogGenerationRequest,
  onProgress: (update: ProgressUpdate) => void
) {
  const response = await fetch('/api/v1/blog/generate-enhanced', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request)
  });
  
  const data = await response.json();
  
  // Display all progress updates
  data.progress_updates?.forEach((update, index) => {
    // Show each update
    onProgress(update);
  });
  
  return data;
}
```

### Pattern 3: Server-Sent Events (Future Enhancement)

For real-time streaming, a future SSE endpoint could be implemented:

```typescript
// Future implementation - not yet available
const eventSource = new EventSource('/api/v1/blog/generate-enhanced/stream');
eventSource.onmessage = (event) => {
  const update: ProgressUpdate = JSON.parse(event.data);
  onProgress(update);
};
```

---

## React/Next.js Example

### Complete React Component

```tsx
import React, { useState, useCallback } from 'react';

interface ProgressUpdate {
  stage: string;
  stage_number: number;
  total_stages: number;
  progress_percentage: number;
  status: string;
  details?: string;
  timestamp: number;
}

interface BlogGenerationRequest {
  topic: string;
  keywords: string[];
  tone?: string;
  length?: string;
}

export function BlogGenerator() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [progressHistory, setProgressHistory] = useState<ProgressUpdate[]>([]);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const generateBlog = useCallback(async (request: BlogGenerationRequest) => {
    setIsGenerating(true);
    setError(null);
    setProgress(null);
    setProgressHistory([]);
    setResult(null);

    try {
      const response = await fetch('/api/v1/blog/generate-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Process all progress updates
      if (data.progress_updates && data.progress_updates.length > 0) {
        // Update progress history
        setProgressHistory(data.progress_updates);
        
        // Set latest progress
        const latest = data.progress_updates[data.progress_updates.length - 1];
        setProgress(latest);
      }

      setResult(data);
      setIsGenerating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsGenerating(false);
    }
  }, []);

  return (
    <div className="blog-generator">
      <h1>Blog Generator</h1>
      
      {/* Progress Display */}
      {isGenerating && progress && (
        <div className="progress-container">
          <div className="progress-bar">
            <div 
              className="progress-fill" 
              style={{ width: `${progress.progress_percentage}%` }}
            />
          </div>
          <div className="progress-info">
            <p className="progress-status">{progress.status}</p>
            <p className="progress-details">{progress.details}</p>
            <p className="progress-stage">
              Stage {progress.stage_number} of {progress.total_stages} 
              ({progress.progress_percentage.toFixed(1)}%)
            </p>
          </div>
        </div>
      )}

      {/* Progress History */}
      {progressHistory.length > 0 && (
        <div className="progress-history">
          <h3>Progress History</h3>
          <ul>
            {progressHistory.map((update, index) => (
              <li key={index} className={`stage-${update.stage}`}>
                <strong>Stage {update.stage_number}:</strong> {update.status}
                {update.details && <span> - {update.details}</span>}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-message">
          <p>Error: {error}</p>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className="result-container">
          <h2>{result.title}</h2>
          <div className="blog-content" dangerouslySetInnerHTML={{ __html: result.content }} />
          <div className="metrics">
            <p>Quality Score: {result.quality_score}/100</p>
            <p>SEO Score: {result.seo_score}/100</p>
            <p>Generation Time: {result.generation_time.toFixed(1)}s</p>
            <p>Total Cost: ${result.total_cost.toFixed(4)}</p>
          </div>
        </div>
      )}

      {/* Generate Button */}
      <button 
        onClick={() => generateBlog({
          topic: 'Best Notary Services in California',
          keywords: ['notary services california', 'california notary public'],
          tone: 'professional',
          length: 'medium'
        })}
        disabled={isGenerating}
      >
        {isGenerating ? 'Generating...' : 'Generate Blog'}
      </button>
    </div>
  );
}
```

### React Hook for Progress Tracking

```tsx
import { useState, useCallback } from 'react';

export function useBlogGeneration() {
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async (request: BlogGenerationRequest) => {
    setIsGenerating(true);
    setError(null);
    setProgress(null);
    setResult(null);

    try {
      const response = await fetch('/api/v1/blog/generate-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();

      // Process progress updates
      if (data.progress_updates?.length > 0) {
        // Get latest progress
        const latest = data.progress_updates[data.progress_updates.length - 1];
        setProgress(latest);
      }

      setResult(data);
      setIsGenerating(false);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsGenerating(false);
      throw err;
    }
  }, []);

  return {
    generate,
    progress,
    isGenerating,
    result,
    error
  };
}

// Usage
function MyComponent() {
  const { generate, progress, isGenerating, result, error } = useBlogGeneration();

  return (
    <div>
      {progress && (
        <div>
          <p>{progress.status}</p>
          <progress value={progress.progress_percentage} max={100} />
        </div>
      )}
      <button onClick={() => generate({ topic: '...', keywords: [...] })}>
        Generate
      </button>
    </div>
  );
}
```

---

## Vue.js Example

### Vue 3 Composition API

```vue
<template>
  <div class="blog-generator">
    <h1>Blog Generator</h1>
    
    <!-- Progress Display -->
    <div v-if="isGenerating && currentProgress" class="progress-container">
      <div class="progress-bar">
        <div 
          class="progress-fill" 
          :style="{ width: `${currentProgress.progress_percentage}%` }"
        />
      </div>
      <div class="progress-info">
        <p class="status">{{ currentProgress.status }}</p>
        <p class="details" v-if="currentProgress.details">
          {{ currentProgress.details }}
        </p>
        <p class="stage">
          Stage {{ currentProgress.stage_number }} of {{ currentProgress.total_stages }}
          ({{ currentProgress.progress_percentage.toFixed(1) }}%)
        </p>
      </div>
    </div>

    <!-- Progress History -->
    <div v-if="progressHistory.length > 0" class="progress-history">
      <h3>Progress History</h3>
      <ul>
        <li 
          v-for="(update, index) in progressHistory" 
          :key="index"
          :class="`stage-${update.stage}`"
        >
          <strong>Stage {{ update.stage_number }}:</strong> {{ update.status }}
          <span v-if="update.details"> - {{ update.details }}</span>
        </li>
      </ul>
    </div>

    <!-- Error Display -->
    <div v-if="error" class="error">
      <p>Error: {{ error }}</p>
    </div>

    <!-- Result Display -->
    <div v-if="result" class="result">
      <h2>{{ result.title }}</h2>
      <div v-html="result.content"></div>
      <div class="metrics">
        <p>Quality: {{ result.quality_score }}/100</p>
        <p>SEO: {{ result.seo_score }}/100</p>
        <p>Time: {{ result.generation_time.toFixed(1) }}s</p>
        <p>Cost: ${{ result.total_cost.toFixed(4) }}</p>
      </div>
    </div>

    <!-- Generate Button -->
    <button 
      @click="handleGenerate" 
      :disabled="isGenerating"
    >
      {{ isGenerating ? 'Generating...' : 'Generate Blog' }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';

interface ProgressUpdate {
  stage: string;
  stage_number: number;
  total_stages: number;
  progress_percentage: number;
  status: string;
  details?: string;
  timestamp: number;
}

const isGenerating = ref(false);
const progressHistory = ref<ProgressUpdate[]>([]);
const result = ref<any>(null);
const error = ref<string | null>(null);

const currentProgress = computed(() => {
  return progressHistory.value.length > 0
    ? progressHistory.value[progressHistory.value.length - 1]
    : null;
});

async function handleGenerate() {
  isGenerating.value = true;
  error.value = null;
  progressHistory.value = [];
  result.value = null;

  try {
    const response = await fetch('/api/v1/blog/generate-enhanced', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: 'Best Notary Services in California',
        keywords: ['notary services california', 'california notary public'],
        tone: 'professional',
        length: 'medium'
      })
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();

    // Process progress updates
    if (data.progress_updates?.length > 0) {
      progressHistory.value = data.progress_updates;
    }

    result.value = data;
    isGenerating.value = false;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Unknown error';
    isGenerating.value = false;
  }
}
</script>
```

---

## Vanilla JavaScript Example

### Simple Implementation

```javascript
class BlogGenerator {
  constructor(apiUrl) {
    this.apiUrl = apiUrl;
    this.progressCallbacks = [];
  }

  onProgress(callback) {
    this.progressCallbacks.push(callback);
  }

  async generate(request) {
    try {
      const response = await fetch(`${this.apiUrl}/api/v1/blog/generate-enhanced`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${await response.text()}`);
      }

      const data = await response.json();

      // Emit progress updates
      if (data.progress_updates) {
        data.progress_updates.forEach(update => {
          this.progressCallbacks.forEach(callback => callback(update));
        });
      }

      return data;
    } catch (error) {
      console.error('Blog generation failed:', error);
      throw error;
    }
  }
}

// Usage
const generator = new BlogGenerator('https://your-api.com');

generator.onProgress((update) => {
  console.log(`Progress: ${update.progress_percentage}%`);
  console.log(`Status: ${update.status}`);
  
  // Update UI
  updateProgressBar(update.progress_percentage);
  updateStatusText(update.status);
  updateDetails(update.details);
});

const result = await generator.generate({
  topic: 'Best Notary Services in California',
  keywords: ['notary services california'],
  tone: 'professional',
  length: 'medium'
});
```

### With UI Updates

```javascript
function updateProgressBar(percentage) {
  const progressBar = document.getElementById('progress-bar');
  if (progressBar) {
    progressBar.style.width = `${percentage}%`;
  }
}

function updateStatusText(status) {
  const statusElement = document.getElementById('status-text');
  if (statusElement) {
    statusElement.textContent = status;
  }
}

function updateDetails(details) {
  const detailsElement = document.getElementById('details-text');
  if (detailsElement) {
    detailsElement.textContent = details || '';
  }
}

function addProgressUpdate(update) {
  const historyContainer = document.getElementById('progress-history');
  if (historyContainer) {
    const item = document.createElement('div');
    item.className = `progress-item stage-${update.stage}`;
    item.innerHTML = `
      <strong>Stage ${update.stage_number}/${update.total_stages}:</strong>
      ${update.status}
      ${update.details ? `<br><small>${update.details}</small>` : ''}
      <div class="progress-mini" style="width: ${update.progress_percentage}%"></div>
    `;
    historyContainer.appendChild(item);
    historyContainer.scrollTop = historyContainer.scrollHeight;
  }
}

// Generate blog
async function generateBlog() {
  const request = {
    topic: document.getElementById('topic').value,
    keywords: document.getElementById('keywords').value.split(','),
    tone: document.getElementById('tone').value,
    length: document.getElementById('length').value
  };

  try {
    const response = await fetch('/api/v1/blog/generate-enhanced', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    const data = await response.json();

    // Process all progress updates
    data.progress_updates?.forEach(update => {
      updateProgressBar(update.progress_percentage);
      updateStatusText(update.status);
      updateDetails(update.details);
      addProgressUpdate(update);
    });

    // Display result
    displayResult(data);
  } catch (error) {
    console.error('Generation failed:', error);
    showError(error.message);
  }
}
```

---

## UI/UX Best Practices

### 1. Progress Bar Design

```css
.progress-container {
  margin: 20px 0;
  padding: 20px;
  background: #f5f5f5;
  border-radius: 8px;
}

.progress-bar {
  width: 100%;
  height: 24px;
  background: #e0e0e0;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #4CAF50, #8BC34A);
  transition: width 0.3s ease;
  border-radius: 12px;
}

.progress-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.progress-status {
  font-weight: 600;
  font-size: 16px;
  color: #333;
}

.progress-details {
  font-size: 14px;
  color: #666;
  font-style: italic;
}

.progress-stage {
  font-size: 12px;
  color: #999;
}
```

### 2. Stage Icons

```tsx
const getStageIcon = (stage: string) => {
  const icons = {
    initialization: '⚙️',
    keyword_analysis: '🔍',
    competitor_analysis: '🏆',
    intent_analysis: '🎯',
    length_optimization: '📏',
    research_outline: '📚',
    draft_generation: '✍️',
    enhancement: '✨',
    seo_polish: '📈',
    semantic_integration: '🔗',
    quality_scoring: '⭐',
    finalization: '✅'
  };
  return icons[stage] || '📝';
};
```

### 3. Animated Progress

```css
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.7; }
}

.progress-fill {
  animation: pulse 2s ease-in-out infinite;
}

.progress-item {
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}
```

### 4. Stage Status Colors

```css
.stage-initialization { border-left: 4px solid #9E9E9E; }
.stage-keyword_analysis { border-left: 4px solid #2196F3; }
.stage-competitor_analysis { border-left: 4px solid #FF9800; }
.stage-intent_analysis { border-left: 4px solid #9C27B0; }
.stage-length_optimization { border-left: 4px solid #00BCD4; }
.stage-research_outline { border-left: 4px solid #4CAF50; }
.stage-draft_generation { border-left: 4px solid #8BC34A; }
.stage-enhancement { border-left: 4px solid #FFC107; }
.stage-seo_polish { border-left: 4px solid #F44336; }
.stage-semantic_integration { border-left: 4px solid #3F51B5; }
.stage-quality_scoring { border-left: 4px solid #E91E63; }
.stage-finalization { border-left: 4px solid #009688; }
```

---

## Error Handling

### Handling API Errors

```typescript
async function generateBlog(request: BlogGenerationRequest) {
  try {
    const response = await fetch('/api/v1/blog/generate-enhanced', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.message || `HTTP ${response.status}`);
    }

    const data = await response.json();

    // Check for warnings
    if (data.warnings && data.warnings.length > 0) {
      console.warn('Generation warnings:', data.warnings);
      // Display warnings to user
    }

    return data;
  } catch (error) {
    if (error instanceof TypeError) {
      // Network error
      throw new Error('Network error: Unable to connect to server');
    } else if (error instanceof Error) {
      throw error;
    } else {
      throw new Error('Unknown error occurred');
    }
  }
}
```

### Timeout Handling

```typescript
async function generateBlogWithTimeout(
  request: BlogGenerationRequest,
  timeoutMs: number = 300000 // 5 minutes
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('/api/v1/blog/generate-enhanced', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(request),
      signal: controller.signal
    });

    clearTimeout(timeoutId);
    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error.name === 'AbortError') {
      throw new Error('Request timeout: Blog generation took too long');
    }
    throw error;
  }
}
```

---

## Advanced Patterns

### 1. Progress Caching

Cache progress updates for long-running requests:

```typescript
class ProgressCache {
  private cache = new Map<string, ProgressUpdate[]>();

  set(requestId: string, updates: ProgressUpdate[]) {
    this.cache.set(requestId, updates);
  }

  get(requestId: string): ProgressUpdate[] | null {
    return this.cache.get(requestId) || null;
  }

  clear(requestId: string) {
    this.cache.delete(requestId);
  }
}

const progressCache = new ProgressCache();

// Store progress when received
function handleProgress(requestId: string, updates: ProgressUpdate[]) {
  progressCache.set(requestId, updates);
  // Display updates
  updates.forEach(update => displayProgress(update));
}
```

### 2. Progress Analytics

Track progress timing for analytics:

```typescript
interface ProgressAnalytics {
  stage: string;
  startTime: number;
  endTime?: number;
  duration?: number;
}

class ProgressTracker {
  private analytics: Map<string, ProgressAnalytics> = new Map();

  trackStage(update: ProgressUpdate) {
    const key = `${update.stage}-${update.stage_number}`;
    
    if (update.status.includes('complete') || update.status.includes('Complete')) {
      const existing = this.analytics.get(key);
      if (existing) {
        existing.endTime = update.timestamp;
        existing.duration = existing.endTime - existing.startTime;
      }
    } else {
      this.analytics.set(key, {
        stage: update.stage,
        startTime: update.timestamp
      });
    }
  }

  getAnalytics(): ProgressAnalytics[] {
    return Array.from(this.analytics.values());
  }
}
```

### 3. Progress Estimation

Estimate remaining time based on progress:

```typescript
function estimateRemainingTime(
  currentProgress: ProgressUpdate,
  startTime: number
): number {
  const elapsed = Date.now() / 1000 - startTime;
  const progress = currentProgress.progress_percentage / 100;
  
  if (progress === 0) return 0;
  
  const estimatedTotal = elapsed / progress;
  const remaining = estimatedTotal - elapsed;
  
  return Math.max(0, remaining);
}

// Usage
const startTime = Date.now() / 1000;
const remaining = estimateRemainingTime(currentProgress, startTime);
console.log(`Estimated time remaining: ${Math.round(remaining)}s`);
```

### 4. Stage-Specific UI

Different UI for different stages:

```tsx
function StageDisplay({ update }: { update: ProgressUpdate }) {
  switch (update.stage) {
    case 'keyword_analysis':
      return (
        <div className="stage-keyword">
          <KeywordIcon />
          <p>Analyzing {update.metadata.keywordCount || 'keywords'}...</p>
        </div>
      );
    
    case 'draft_generation':
      return (
        <div className="stage-draft">
          <WritingIcon />
          <p>Generating content...</p>
          <WordCountDisplay count={update.metadata.wordCount} />
        </div>
      );
    
    default:
      return <GenericStageDisplay update={update} />;
  }
}
```

---

## TypeScript Types

### Complete Type Definitions

```typescript
// types/blog-generation.ts

export interface ProgressUpdate {
  stage: string;
  stage_number: number;
  total_stages: number;
  progress_percentage: number;
  status: string;
  details?: string;
  metadata: Record<string, any>;
  timestamp: number;
}

export type PipelineStage =
  | 'initialization'
  | 'keyword_analysis'
  | 'competitor_analysis'
  | 'intent_analysis'
  | 'length_optimization'
  | 'research_outline'
  | 'draft_generation'
  | 'enhancement'
  | 'seo_polish'
  | 'semantic_integration'
  | 'quality_scoring'
  | 'finalization';

export interface EnhancedBlogGenerationRequest {
  topic: string;
  keywords: string[];
  tone?: 'professional' | 'casual' | 'friendly' | 'authoritative' | 'conversational' | 'technical' | 'creative';
  length?: 'short' | 'medium' | 'long' | 'extended';
  use_google_search?: boolean;
  use_fact_checking?: boolean;
  use_citations?: boolean;
  use_serp_optimization?: boolean;
  use_consensus_generation?: boolean;
  use_knowledge_graph?: boolean;
  use_semantic_keywords?: boolean;
  use_quality_scoring?: boolean;
  target_audience?: string;
  custom_instructions?: string;
  template_type?: string;
}

export interface EnhancedBlogGenerationResponse {
  title: string;
  content: string;
  meta_title: string;
  meta_description: string;
  readability_score: number;
  seo_score: number;
  stage_results: Array<{
    stage: string;
    provider: string;
    tokens: number;
    cost: number;
  }>;
  citations: Array<{
    text: string;
    url: string;
    title: string;
  }>;
  total_tokens: number;
  total_cost: number;
  generation_time: number;
  seo_metadata: Record<string, any>;
  quality_score?: number;
  quality_dimensions: Record<string, number>;
  structured_data?: Record<string, any>;
  semantic_keywords: string[];
  content_metadata: Record<string, any>;
  success: boolean;
  warnings: string[];
  progress_updates: ProgressUpdate[];
}
```

---

## Example: Complete React Component with All Features

```tsx
import React, { useState, useCallback, useEffect } from 'react';
import type { ProgressUpdate, EnhancedBlogGenerationRequest, EnhancedBlogGenerationResponse } from './types';

export function EnhancedBlogGenerator() {
  const [request, setRequest] = useState<EnhancedBlogGenerationRequest>({
    topic: '',
    keywords: [],
    tone: 'professional',
    length: 'medium'
  });
  
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState<ProgressUpdate | null>(null);
  const [progressHistory, setProgressHistory] = useState<ProgressUpdate[]>([]);
  const [result, setResult] = useState<EnhancedBlogGenerationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [startTime, setStartTime] = useState<number | null>(null);

  const estimateRemaining = useCallback(() => {
    if (!progress || !startTime) return 0;
    const elapsed = (Date.now() / 1000) - startTime;
    const progressRatio = progress.progress_percentage / 100;
    if (progressRatio === 0) return 0;
    const estimatedTotal = elapsed / progressRatio;
    return Math.max(0, estimatedTotal - elapsed);
  }, [progress, startTime]);

  const generate = useCallback(async () => {
    setIsGenerating(true);
    setError(null);
    setProgress(null);
    setProgressHistory([]);
    setResult(null);
    setStartTime(Date.now() / 1000);

    try {
      const response = await fetch('/api/v1/blog/generate-enhanced', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}`);
      }

      const data: EnhancedBlogGenerationResponse = await response.json();

      // Process progress updates
      if (data.progress_updates?.length > 0) {
        setProgressHistory(data.progress_updates);
        const latest = data.progress_updates[data.progress_updates.length - 1];
        setProgress(latest);
      }

      setResult(data);
      setIsGenerating(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setIsGenerating(false);
    }
  }, [request]);

  const remaining = estimateRemaining();

  return (
    <div className="enhanced-blog-generator">
      {/* Request Form */}
      <div className="request-form">
        <input
          type="text"
          placeholder="Blog Topic"
          value={request.topic}
          onChange={(e) => setRequest({ ...request, topic: e.target.value })}
        />
        <textarea
          placeholder="Keywords (comma-separated)"
          value={request.keywords.join(', ')}
          onChange={(e) => setRequest({
            ...request,
            keywords: e.target.value.split(',').map(k => k.trim()).filter(Boolean)
          })}
        />
        <button onClick={generate} disabled={isGenerating || !request.topic}>
          {isGenerating ? 'Generating...' : 'Generate Blog'}
        </button>
      </div>

      {/* Progress Display */}
      {isGenerating && progress && (
        <div className="progress-display">
          <div className="progress-bar-container">
            <div className="progress-bar">
              <div
                className="progress-fill"
                style={{ width: `${progress.progress_percentage}%` }}
              />
            </div>
            <div className="progress-text">
              {progress.progress_percentage.toFixed(1)}%
            </div>
          </div>
          
          <div className="progress-info">
            <h3>{progress.status}</h3>
            {progress.details && <p className="details">{progress.details}</p>}
            <p className="stage-info">
              Stage {progress.stage_number} of {progress.total_stages}
            </p>
            {remaining > 0 && (
              <p className="time-estimate">
                Estimated time remaining: {Math.round(remaining)}s
              </p>
            )}
          </div>

          {/* Progress History */}
          <div className="progress-history">
            <h4>Progress History</h4>
            <ul>
              {progressHistory.map((update, index) => (
                <li
                  key={index}
                  className={`progress-item stage-${update.stage} ${
                    update.status.includes('complete') || update.status.includes('Complete')
                      ? 'completed'
                      : 'in-progress'
                  }`}
                >
                  <span className="stage-icon">{getStageIcon(update.stage)}</span>
                  <span className="stage-text">
                    <strong>Stage {update.stage_number}:</strong> {update.status}
                  </span>
                  {update.details && (
                    <span className="stage-details">{update.details}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

      {/* Error Display */}
      {error && (
        <div className="error-display">
          <p className="error-message">Error: {error}</p>
        </div>
      )}

      {/* Result Display */}
      {result && (
        <div className="result-display">
          <h2>{result.title}</h2>
          <div className="blog-content" dangerouslySetInnerHTML={{ __html: result.content }} />
          
          <div className="result-metrics">
            <div className="metric">
              <label>Quality Score</label>
              <value>{result.quality_score?.toFixed(1) || 'N/A'}/100</value>
            </div>
            <div className="metric">
              <label>SEO Score</label>
              <value>{result.seo_score.toFixed(1)}/100</value>
            </div>
            <div className="metric">
              <label>Generation Time</label>
              <value>{result.generation_time.toFixed(1)}s</value>
            </div>
            <div className="metric">
              <label>Total Cost</label>
              <value>${result.total_cost.toFixed(4)}</value>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function getStageIcon(stage: string): string {
  const icons: Record<string, string> = {
    initialization: '⚙️',
    keyword_analysis: '🔍',
    competitor_analysis: '🏆',
    intent_analysis: '🎯',
    length_optimization: '📏',
    research_outline: '📚',
    draft_generation: '✍️',
    enhancement: '✨',
    seo_polish: '📈',
    semantic_integration: '🔗',
    quality_scoring: '⭐',
    finalization: '✅'
  };
  return icons[stage] || '📝';
}
```

---

## Summary

### Key Points

1. **Progress Updates Array**: The response includes `progress_updates` with all stage progress
2. **Real-time Display**: Show progress as it's received in the response
3. **Stage Information**: Each update includes stage number, percentage, status, and details
4. **User Experience**: Display progress bars, status messages, and stage history
5. **Error Handling**: Handle network errors, timeouts, and API errors gracefully

### Quick Start

1. Make POST request to `/api/v1/blog/generate-enhanced`
2. Check `response.progress_updates` array
3. Display latest progress update (last item in array)
4. Show progress bar using `progress_percentage`
5. Display status message from `status` field
6. Show details from `details` field (if available)

### Example Response Structure

```json
{
  "progress_updates": [
    {
      "stage": "keyword_analysis",
      "stage_number": 2,
      "total_stages": 12,
      "progress_percentage": 16.67,
      "status": "Analyzing keywords with DataForSEO Labs",
      "details": "Analyzing 8 keywords for difficulty, search volume, and competition",
      "timestamp": 1763064703.123
    }
  ],
  "title": "...",
  "content": "...",
  // ... other fields
}
```

This integration guide provides everything needed to implement progress tracking in your frontend application!

