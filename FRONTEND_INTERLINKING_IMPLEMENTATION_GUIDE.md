# Frontend Interlinking Implementation Guide

**Version:** 1.0.0  
**Last Updated:** 2025-11-15  
**Status:** 📋 Implementation Guide

---

## Overview

This guide explains how to implement interlinking opportunities on the **Frontend (Next.js + Supabase)**. The frontend is responsible for:

1. **Discovering** publishing target structure (Webflow, WordPress, Medium, Shopify)
2. **Storing** structure in Supabase database
3. **Sending** structure to backend API for interlinking analysis
4. **Displaying** interlinking recommendations to users

---

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Database Schema](#database-schema)
3. [Step 1: Structure Discovery](#step-1-structure-discovery)
4. [Step 2: Storage in Supabase](#step-2-storage-in-supabase)
5. [Step 3: Sending to Backend API](#step-3-sending-to-backend-api)
6. [Step 4: Displaying Recommendations](#step-4-displaying-recommendations)
7. [Code Examples](#code-examples)
8. [Best Practices](#best-practices)

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Frontend (Next.js)                        │
│                                                               │
│  1. Fetch Structure from Publishing Target API               │
│     (Webflow/WordPress/Medium/Shopify)                       │
│                                                               │
│  2. Store in Supabase integrations.metadata                   │
│                                                               │
│  3. Retrieve structure and send to Backend API               │
│                                                               │
│  4. Display recommendations in UI                            │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTP Request
                          ▼
┌─────────────────────────────────────────────────────────────┐
│              Supabase Database                                │
│                                                               │
│  integrations table:                                          │
│    - config: { api_token, site_id, ... }                     │
│    - metadata: { structure: {...}, last_synced: ... }        │
│    - field_mappings: { title: "post-title", ... }             │
└─────────────────────────────────────────────────────────────┘
                          │
                          │ HTTP Request with Structure
                          ▼
┌─────────────────────────────────────────────────────────────┐
│         Backend API (Google Cloud Run)                        │
│                                                               │
│  POST /api/v1/integrations/connect-and-recommend             │
│    - Receives structure in connection object                 │
│    - Analyzes existing content                               │
│    - Returns interlinking recommendations                    │
└─────────────────────────────────────────────────────────────┘
```

---

## Database Schema

### Integrations Table Structure

The `integrations` table in Supabase stores:

```sql
CREATE TABLE integrations (
  integration_id UUID PRIMARY KEY,
  org_id UUID REFERENCES organizations(org_id),
  type TEXT NOT NULL, -- 'webflow', 'wordpress', 'shopify', 'medium'
  name TEXT NOT NULL,
  status TEXT DEFAULT 'inactive',
  
  -- Credentials (encrypted)
  config JSONB NOT NULL DEFAULT '{}',
  
  -- Structure and existing content
  metadata JSONB DEFAULT '{}',
  
  -- Field mappings
  field_mappings JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

### Metadata Structure

The `metadata` JSONB field should contain:

```typescript
interface IntegrationMetadata {
  structure: {
    // Provider-specific structure
    collections?: Array<CollectionStructure>;      // Webflow
    post_types?: Array<PostTypeStructure>;         // WordPress
    publications?: Array<PublicationStructure>;     // Medium
    blogs?: Array<BlogStructure>;                   // Shopify
    
    // Existing content for interlinking
    existing_content: Array<{
      id: string;
      title: string;
      url: string;
      slug: string;
      keywords: string[];
      categories?: string[];
      published_at: string;
      excerpt?: string;
    }>;
  };
  sync_settings: {
    auto_sync: boolean;
    sync_frequency: 'realtime' | 'hourly' | 'daily' | 'weekly';
    last_synced: string;
  };
}
```

---

## Step 1: Structure Discovery

### Overview

When a user connects a publishing target, the frontend must:

1. Authenticate with the publishing target API
2. Fetch the structure (collections, post types, etc.)
3. Fetch existing content items
4. Extract keywords/topics from existing content

### Implementation by Provider

#### Webflow Structure Discovery

```typescript
// src/lib/integrations/webflow-structure-discovery.ts

interface WebflowCollection {
  id: string;
  name: string;
  slug: string;
  fields: Array<{
    id: string;
    name: string;
    type: string;
    slug: string;
  }>;
}

interface WebflowItem {
  id: string;
  fieldData: {
    name: string;
    slug: string;
    'post-summary'?: string;
    'post-body'?: string;
    'post-author'?: string;
    'post-publish-date'?: string;
  };
  publishedAt?: string;
}

export async function discoverWebflowStructure(
  apiToken: string,
  siteId: string
): Promise<{
  collections: WebflowCollection[];
  existing_content: Array<{
    id: string;
    title: string;
    url: string;
    slug: string;
    keywords: string[];
    published_at: string;
  }>;
}> {
  // 1. Fetch collections
  const collectionsResponse = await fetch(
    `https://api.webflow.com/v2/sites/${siteId}/collections`,
    {
      headers: {
        'Authorization': `Bearer ${apiToken}`,
        'Accept-Version': '1.0.0'
      }
    }
  );
  
  const collections: WebflowCollection[] = await collectionsResponse.json();
  
  // 2. For each collection, fetch items
  const existingContent = [];
  
  for (const collection of collections) {
    const itemsResponse = await fetch(
      `https://api.webflow.com/v2/collections/${collection.id}/items`,
      {
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Accept-Version': '1.0.0'
        }
      }
    );
    
    const { items } = await itemsResponse.json();
    
    // 3. Transform items to interlinking format
    for (const item of items) {
      const slug = item.fieldData?.slug || item.fieldData?.name?.toLowerCase().replace(/\s+/g, '-');
      const url = `https://${siteId}.webflow.io/${slug}`;
      
      // Extract keywords from title and content (simple extraction)
      const title = item.fieldData?.name || '';
      const content = item.fieldData?.['post-body'] || '';
      const keywords = extractKeywords(title + ' ' + content);
      
      existingContent.push({
        id: item.id,
        title: title,
        url: url,
        slug: slug,
        keywords: keywords,
        published_at: item.publishedAt || item.fieldData?.['post-publish-date'] || new Date().toISOString()
      });
    }
  }
  
  return {
    collections: collections,
    existing_content: existingContent
  };
}

// Helper function to extract keywords from text
function extractKeywords(text: string, maxKeywords: number = 10): string[] {
  // Simple keyword extraction (you may want to use a more sophisticated approach)
  const words = text.toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(word => word.length > 3);
  
  // Count word frequency
  const wordCount: Record<string, number> = {};
  words.forEach(word => {
    wordCount[word] = (wordCount[word] || 0) + 1;
  });
  
  // Return top keywords
  return Object.entries(wordCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, maxKeywords)
    .map(([word]) => word);
}
```

#### WordPress Structure Discovery

```typescript
// src/lib/integrations/wordpress-structure-discovery.ts

export async function discoverWordPressStructure(
  baseUrl: string,
  username: string,
  password: string
): Promise<{
  post_types: Array<{ name: string; label: string }>;
  existing_content: Array<{
    id: string;
    title: string;
    url: string;
    slug: string;
    keywords: string[];
    published_at: string;
  }>;
}> {
  // 1. Fetch post types
  const postTypesResponse = await fetch(
    `${baseUrl}/wp-json/wp/v2/types`,
    {
      headers: {
        'Authorization': `Basic ${btoa(`${username}:${password}`)}`
      }
    }
  );
  
  const postTypes = await postTypesResponse.json();
  
  // 2. Fetch posts for each post type
  const existingContent = [];
  
  for (const [postType, typeInfo] of Object.entries(postTypes)) {
    const postsResponse = await fetch(
      `${baseUrl}/wp-json/wp/v2/${postType}?per_page=100`,
      {
        headers: {
          'Authorization': `Basic ${btoa(`${username}:${password}`)}`
        }
      }
    );
    
    const posts = await postsResponse.json();
    
    // 3. Transform posts to interlinking format
    for (const post of posts) {
      const keywords = [
        ...extractKeywords(post.title?.rendered || ''),
        ...extractKeywords(post.content?.rendered || ''),
        ...(post.tags || []).map((tag: any) => tag.name)
      ];
      
      existingContent.push({
        id: String(post.id),
        title: post.title?.rendered || '',
        url: post.link || '',
        slug: post.slug || '',
        keywords: [...new Set(keywords)], // Remove duplicates
        published_at: post.date || new Date().toISOString()
      });
    }
  }
  
  return {
    post_types: Object.values(postTypes).map((type: any) => ({
      name: type.name,
      label: type.name
    })),
    existing_content: existingContent
  };
}
```

#### Medium Structure Discovery

```typescript
// src/lib/integrations/medium-structure-discovery.ts

export async function discoverMediumStructure(
  accessToken: string,
  userId: string
): Promise<{
  publications: Array<{ id: string; name: string; description: string }>;
  existing_content: Array<{
    id: string;
    title: string;
    url: string;
    slug: string;
    keywords: string[];
    published_at: string;
  }>;
}> {
  // 1. Fetch user's publications
  const publicationsResponse = await fetch(
    `https://api.medium.com/v1/users/${userId}/publications`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    }
  );
  
  const { data: publications } = await publicationsResponse.json();
  
  // 2. Fetch posts from each publication
  const existingContent = [];
  
  for (const publication of publications) {
    const postsResponse = await fetch(
      `https://api.medium.com/v1/publications/${publication.id}/posts`,
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      }
    );
    
    const { data: posts } = await postsResponse.json();
    
    // 3. Transform posts to interlinking format
    for (const post of posts) {
      const keywords = extractKeywords(post.title + ' ' + (post.content || ''));
      
      existingContent.push({
        id: post.id,
        title: post.title,
        url: post.url,
        slug: post.uniqueSlug,
        keywords: keywords,
        published_at: post.publishedAt || new Date().toISOString()
      });
    }
  }
  
  return {
    publications: publications,
    existing_content: existingContent
  };
}
```

---

## Step 2: Storage in Supabase

### Save Structure to Database

```typescript
// src/lib/integrations/save-integration-structure.ts

import { createClient } from '@/lib/supabase/server';

export async function saveIntegrationStructure(
  integrationId: string,
  orgId: string,
  structure: {
    collections?: any[];
    post_types?: any[];
    publications?: any[];
    blogs?: any[];
    existing_content: Array<{
      id: string;
      title: string;
      url: string;
      slug: string;
      keywords: string[];
      published_at: string;
    }>;
  }
): Promise<void> {
  const supabase = await createClient();
  
  // Get current integration
  const { data: integration, error: fetchError } = await supabase
    .from('integrations')
    .select('metadata')
    .eq('integration_id', integrationId)
    .eq('org_id', orgId)
    .single();
  
  if (fetchError) {
    throw new Error(`Failed to fetch integration: ${fetchError.message}`);
  }
  
  // Update metadata with structure
  const updatedMetadata = {
    ...(integration.metadata || {}),
    structure: structure,
    sync_settings: {
      ...(integration.metadata?.sync_settings || {}),
      last_synced: new Date().toISOString()
    }
  };
  
  const { error: updateError } = await supabase
    .from('integrations')
    .update({
      metadata: updatedMetadata,
      updated_at: new Date().toISOString()
    })
    .eq('integration_id', integrationId)
    .eq('org_id', orgId);
  
  if (updateError) {
    throw new Error(`Failed to save structure: ${updateError.message}`);
  }
}
```

### Complete Integration Connection Flow

```typescript
// src/lib/integrations/connect-integration.ts

import { discoverWebflowStructure } from './webflow-structure-discovery';
import { discoverWordPressStructure } from './wordpress-structure-discovery';
import { discoverMediumStructure } from './medium-structure-discovery';
import { saveIntegrationStructure } from './save-integration-structure';

export async function connectIntegration(
  orgId: string,
  provider: 'webflow' | 'wordpress' | 'shopify' | 'medium',
  connection: {
    api_token?: string;
    site_id?: string;
    base_url?: string;
    username?: string;
    password?: string;
    access_token?: string;
    user_id?: string;
  }
): Promise<{
  integration_id: string;
  structure_saved: boolean;
}> {
  const supabase = await createClient();
  
  // 1. Discover structure based on provider
  let structure;
  
  switch (provider) {
    case 'webflow':
      if (!connection.api_token || !connection.site_id) {
        throw new Error('Webflow requires api_token and site_id');
      }
      structure = await discoverWebflowStructure(
        connection.api_token,
        connection.site_id
      );
      break;
      
    case 'wordpress':
      if (!connection.base_url || !connection.username || !connection.password) {
        throw new Error('WordPress requires base_url, username, and password');
      }
      structure = await discoverWordPressStructure(
        connection.base_url,
        connection.username,
        connection.password
      );
      break;
      
    case 'medium':
      if (!connection.access_token || !connection.user_id) {
        throw new Error('Medium requires access_token and user_id');
      }
      structure = await discoverMediumStructure(
        connection.access_token,
        connection.user_id
      );
      break;
      
    default:
      throw new Error(`Unsupported provider: ${provider}`);
  }
  
  // 2. Create or update integration record
  const { data: existingIntegration } = await supabase
    .from('integrations')
    .select('integration_id')
    .eq('org_id', orgId)
    .eq('type', provider)
    .maybeSingle();
  
  let integrationId: string;
  
  if (existingIntegration) {
    // Update existing integration
    integrationId = existingIntegration.integration_id;
    
    const { error: updateError } = await supabase
      .from('integrations')
      .update({
        config: connection, // Store credentials
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('integration_id', integrationId);
    
    if (updateError) {
      throw new Error(`Failed to update integration: ${updateError.message}`);
    }
  } else {
    // Create new integration
    const { data: newIntegration, error: insertError } = await supabase
      .from('integrations')
      .insert({
        org_id: orgId,
        type: provider,
        name: `${provider.charAt(0).toUpperCase() + provider.slice(1)} Integration`,
        config: connection,
        status: 'active'
      })
      .select('integration_id')
      .single();
    
    if (insertError) {
      throw new Error(`Failed to create integration: ${insertError.message}`);
    }
    
    integrationId = newIntegration.integration_id;
  }
  
  // 3. Save structure to metadata
  await saveIntegrationStructure(integrationId, orgId, structure);
  
  return {
    integration_id: integrationId,
    structure_saved: true
  };
}
```

---

## Step 3: Sending to Backend API

### Retrieve Structure and Send to Backend

```typescript
// src/lib/integrations/get-interlinking-recommendations.ts

import { createClient } from '@/lib/supabase/server';
import { blogWriterAPI } from '@/lib/blog-writer-api';

export async function getInterlinkingRecommendations(
  orgId: string,
  integrationId: string,
  keywords: string[]
): Promise<{
  recommended_interlinks: number;
  per_keyword: Array<{
    keyword: string;
    suggested_interlinks: number;
    interlink_opportunities: Array<{
      target_url: string;
      target_title: string;
      anchor_text: string;
      relevance_score: number;
    }>;
  }>;
}> {
  const supabase = await createClient();
  
  // 1. Retrieve integration with structure
  const { data: integration, error } = await supabase
    .from('integrations')
    .select('type, config, metadata')
    .eq('integration_id', integrationId)
    .eq('org_id', orgId)
    .single();
  
  if (error || !integration) {
    throw new Error(`Integration not found: ${error?.message}`);
  }
  
  // 2. Extract structure from metadata
  const structure = integration.metadata?.structure;
  
  if (!structure) {
    throw new Error('Integration structure not found. Please sync the integration first.');
  }
  
  // 3. Prepare connection object with structure
  const connection = {
    ...integration.config, // Credentials
    structure: structure   // Include structure
  };
  
  // 4. Call backend API
  const recommendations = await blogWriterAPI.connectAndRecommend({
    tenant_id: orgId,
    provider: integration.type as 'webflow' | 'wordpress' | 'shopify',
    connection: connection,
    keywords: keywords
  });
  
  return recommendations;
}
```

### API Route Wrapper (Optional)

If you want to create a Next.js API route that wraps the backend call:

```typescript
// src/app/api/integrations/[id]/recommendations/route.ts

import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { getAuthenticatedUser } from '@/lib/api-utils';
import { getInterlinkingRecommendations } from '@/lib/integrations/get-interlinking-recommendations';

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getAuthenticatedUser(request);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = await params;
    const body = await request.json();
    const { keywords } = body;
    
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return NextResponse.json(
        { error: 'Keywords array is required' },
        { status: 400 }
      );
    }
    
    if (keywords.length > 50) {
      return NextResponse.json(
        { error: 'Maximum 50 keywords allowed' },
        { status: 400 }
      );
    }
    
    const recommendations = await getInterlinkingRecommendations(
      user.org_id,
      id,
      keywords
    );
    
    return NextResponse.json(recommendations);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
```

---

## Step 4: Displaying Recommendations

### React Component for Interlinking Recommendations

```typescript
// src/components/integrations/InterlinkingRecommendations.tsx

'use client';

import { useState, useEffect } from 'react';
import { getInterlinkingRecommendations } from '@/lib/integrations/get-interlinking-recommendations';

interface InterlinkingOpportunity {
  target_url: string;
  target_title: string;
  anchor_text: string;
  relevance_score: number;
}

interface KeywordRecommendations {
  keyword: string;
  suggested_interlinks: number;
  interlink_opportunities: InterlinkingOpportunity[];
}

interface Props {
  orgId: string;
  integrationId: string;
  keywords: string[];
  onOpportunitySelect?: (opportunity: InterlinkingOpportunity) => void;
}

export function InterlinkingRecommendations({
  orgId,
  integrationId,
  keywords,
  onOpportunitySelect
}: Props) {
  const [recommendations, setRecommendations] = useState<KeywordRecommendations[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (keywords.length === 0) return;
    
    setLoading(true);
    setError(null);
    
    getInterlinkingRecommendations(orgId, integrationId, keywords)
      .then(result => {
        setRecommendations(result.per_keyword || []);
      })
      .catch(err => {
        setError(err.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [orgId, integrationId, keywords.join(',')]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Analyzing interlinking opportunities...</span>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Error: {error}</p>
      </div>
    );
  }
  
  if (recommendations.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <p className="text-gray-600">No interlinking opportunities found.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <h3 className="text-lg font-semibold">Interlinking Opportunities</h3>
      
      {recommendations.map((keywordRec, index) => (
        <div key={index} className="border border-gray-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">{keywordRec.keyword}</h4>
            <span className="text-sm text-gray-500">
              {keywordRec.suggested_interlinks} opportunities
            </span>
          </div>
          
          <div className="space-y-2">
            {keywordRec.interlink_opportunities.map((opportunity, oppIndex) => (
              <div
                key={oppIndex}
                className="flex items-start justify-between p-3 bg-gray-50 rounded border border-gray-200 hover:bg-gray-100 cursor-pointer"
                onClick={() => onOpportunitySelect?.(opportunity)}
              >
                <div className="flex-1">
                  <p className="font-medium text-sm text-gray-900">
                    {opportunity.target_title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {opportunity.target_url}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">
                    Anchor: "{opportunity.anchor_text}"
                  </p>
                </div>
                <div className="ml-4">
                  <span className="text-xs font-medium text-gray-600">
                    {Math.round(opportunity.relevance_score * 100)}% match
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
```

---

## Code Examples

### Complete Integration Setup Flow

```typescript
// src/app/admin/integrations/[id]/connect/page.tsx

'use client';

import { useState } from 'react';
import { connectIntegration } from '@/lib/integrations/connect-integration';
import { InterlinkingRecommendations } from '@/components/integrations/InterlinkingRecommendations';

export default function ConnectIntegrationPage({ params }: { params: { id: string } }) {
  const [connectionData, setConnectionData] = useState({
    api_token: '',
    site_id: ''
  });
  const [connected, setConnected] = useState(false);
  const [integrationId, setIntegrationId] = useState<string | null>(null);
  const [keywords, setKeywords] = useState<string[]>([]);
  
  const handleConnect = async () => {
    try {
      const result = await connectIntegration(
        'org-id-here', // Get from auth context
        'webflow',
        connectionData
      );
      
      setIntegrationId(result.integration_id);
      setConnected(true);
    } catch (error) {
      console.error('Connection failed:', error);
    }
  };
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Connect Webflow Integration</h1>
      
      {!connected ? (
        <div className="space-y-4">
          <div>
            <label>API Token</label>
            <input
              type="text"
              value={connectionData.api_token}
              onChange={(e) => setConnectionData({ ...connectionData, api_token: e.target.value })}
              className="w-full border rounded p-2"
            />
          </div>
          
          <div>
            <label>Site ID</label>
            <input
              type="text"
              value={connectionData.site_id}
              onChange={(e) => setConnectionData({ ...connectionData, site_id: e.target.value })}
              className="w-full border rounded p-2"
            />
          </div>
          
          <button
            onClick={handleConnect}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Connect & Discover Structure
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-green-800">✅ Integration connected successfully!</p>
            <p className="text-sm text-green-600 mt-1">
              Structure has been discovered and stored in the database.
            </p>
          </div>
          
          <div>
            <label>Enter keywords for interlinking analysis:</label>
            <input
              type="text"
              placeholder="keyword1, keyword2, keyword3"
              onChange={(e) => setKeywords(e.target.value.split(',').map(k => k.trim()))}
              className="w-full border rounded p-2"
            />
          </div>
          
          {keywords.length > 0 && integrationId && (
            <InterlinkingRecommendations
              orgId="org-id-here"
              integrationId={integrationId}
              keywords={keywords}
              onOpportunitySelect={(opportunity) => {
                console.log('Selected opportunity:', opportunity);
                // Handle selection - could add to blog generation request
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
```

---

## Best Practices

### 1. Structure Caching and Refresh

```typescript
// src/lib/integrations/refresh-integration-structure.ts

export async function refreshIntegrationStructure(
  integrationId: string,
  orgId: string
): Promise<void> {
  const supabase = await createClient();
  
  // Get integration config
  const { data: integration } = await supabase
    .from('integrations')
    .select('type, config')
    .eq('integration_id', integrationId)
    .eq('org_id', orgId)
    .single();
  
  if (!integration) {
    throw new Error('Integration not found');
  }
  
  // Re-discover structure
  const structure = await discoverStructure(
    integration.type,
    integration.config
  );
  
  // Update metadata
  await saveIntegrationStructure(integrationId, orgId, structure);
}
```

### 2. Incremental Sync

Instead of fetching all content every time, implement incremental sync:

```typescript
export async function syncIntegrationIncremental(
  integrationId: string,
  orgId: string
): Promise<void> {
  const supabase = await createClient();
  
  // Get last sync time
  const { data: integration } = await supabase
    .from('integrations')
    .select('metadata, config, type')
    .eq('integration_id', integrationId)
    .single();
  
  const lastSynced = integration?.metadata?.sync_settings?.last_synced;
  
  // Fetch only new/updated content since last sync
  const newContent = await fetchNewContentSince(
    integration.type,
    integration.config,
    lastSynced
  );
  
  // Merge with existing content
  const existingContent = integration.metadata?.structure?.existing_content || [];
  const updatedContent = [...existingContent, ...newContent];
  
  // Update metadata
  await saveIntegrationStructure(integrationId, orgId, {
    ...integration.metadata.structure,
    existing_content: updatedContent
  });
}
```

### 3. Error Handling

```typescript
export async function connectIntegrationWithRetry(
  orgId: string,
  provider: string,
  connection: any,
  maxRetries: number = 3
): Promise<any> {
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await connectIntegration(orgId, provider, connection);
    } catch (error) {
      lastError = error;
      
      if (attempt < maxRetries) {
        // Wait before retry (exponential backoff)
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }
    }
  }
  
  throw lastError;
}
```

### 4. Background Sync Jobs

Consider implementing background sync using Next.js API routes or cron jobs:

```typescript
// src/app/api/integrations/sync/route.ts

export async function POST(request: NextRequest) {
  // Get all active integrations
  const { data: integrations } = await supabase
    .from('integrations')
    .select('*')
    .eq('status', 'active');
  
  // Sync each integration
  for (const integration of integrations) {
    try {
      await refreshIntegrationStructure(
        integration.integration_id,
        integration.org_id
      );
    } catch (error) {
      // Log error but continue with other integrations
      console.error(`Failed to sync ${integration.integration_id}:`, error);
    }
  }
  
  return NextResponse.json({ success: true });
}
```

---

## Summary Checklist

### Frontend Implementation Checklist

- [ ] **Structure Discovery**
  - [ ] Implement Webflow structure discovery
  - [ ] Implement WordPress structure discovery
  - [ ] Implement Medium structure discovery
  - [ ] Implement Shopify structure discovery
  - [ ] Extract keywords from existing content

- [ ] **Database Storage**
  - [ ] Save structure to `integrations.metadata` in Supabase
  - [ ] Store existing content with URLs, keywords, titles
  - [ ] Track last sync timestamp

- [ ] **API Integration**
  - [ ] Retrieve structure from Supabase
  - [ ] Include structure in `connection` object
  - [ ] Call backend `/api/v1/integrations/connect-and-recommend`
  - [ ] Handle API errors gracefully

- [ ] **UI Components**
  - [ ] Create integration connection form
  - [ ] Display structure discovery progress
  - [ ] Show interlinking recommendations
  - [ ] Allow users to select opportunities

- [ ] **Sync Management**
  - [ ] Implement manual refresh
  - [ ] Implement automatic sync (optional)
  - [ ] Handle sync errors
  - [ ] Show sync status in UI

---

## Next Steps

1. Implement structure discovery for your target providers
2. Create UI for integration connection
3. Integrate with backend API
4. Test with real publishing targets
5. Monitor and optimize sync performance

