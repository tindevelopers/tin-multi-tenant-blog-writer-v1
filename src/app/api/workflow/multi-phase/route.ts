/**
 * Multi-Phase Workflow API
 * 
 * Endpoints for managing the 5-phase blog creation workflow:
 * 1. Content Generation
 * 2. Image Generation
 * 3. Content Enhancement
 * 4. Advanced Interlinking
 * 5. Publishing Preparation
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServiceClient } from '@/lib/supabase/service';
import { createMultiPhaseWorkflow, type WorkflowConfig, type WorkflowState } from '@/lib/workflow/multi-phase-workflow';
import { logger } from '@/utils/logger';

// Store active workflows in memory (in production, use Redis or database)
const activeWorkflows = new Map<string, {
  workflow: ReturnType<typeof createMultiPhaseWorkflow>;
  state: WorkflowState;
  promise?: Promise<WorkflowState>;
}>();

/**
 * POST /api/workflow/multi-phase
 * Start a new multi-phase workflow
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createServiceClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user's organization
    const { data: userOrg } = await supabase
      .from('user_organizations')
      .select('org_id')
      .eq('user_id', user.id)
      .single();

    if (!userOrg) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const body = await request.json();
    const {
      topic,
      keywords = [],
      targetAudience,
      tone,
      wordCount = 1500,
      qualityLevel = 'high',
      generateFeaturedImage = true,
      generateContentImages = false,
      imageStyle = 'photographic',
      optimizeForSeo = true,
      generateStructuredData = true,
      crawlWebsite = true,
      maxInternalLinks = 5,
      maxExternalLinks = 3,
      includeClusterLinks = true,
      targetPlatform = 'webflow',
      collectionId,
      isDraft = true,
    } = body;

    // Validate required fields
    if (!topic) {
      return NextResponse.json({ error: 'Topic is required' }, { status: 400 });
    }

    // Get Webflow integration if crawling is enabled
    let webflowApiKey: string | undefined;
    let webflowSiteId: string | undefined;

    if (crawlWebsite) {
      const { data: integration } = await supabase
        .from('integrations')
        .select('credentials, site_id')
        .eq('org_id', userOrg.org_id)
        .eq('platform', 'webflow')
        .eq('status', 'connected')
        .single();

      if (integration) {
        webflowApiKey = integration.credentials?.api_key;
        webflowSiteId = integration.site_id;
      }
    }

    // Create workflow config
    const config: WorkflowConfig = {
      topic,
      keywords: Array.isArray(keywords) ? keywords : [keywords],
      targetAudience,
      tone,
      wordCount,
      qualityLevel,
      generateFeaturedImage,
      generateContentImages,
      imageStyle,
      optimizeForSeo,
      generateStructuredData,
      crawlWebsite: crawlWebsite && !!webflowApiKey,
      maxInternalLinks,
      maxExternalLinks,
      includeClusterLinks,
      targetPlatform,
      collectionId,
      isDraft,
      orgId: userOrg.org_id,
      webflowApiKey,
      webflowSiteId,
    };

    // Create and start workflow
    const workflow = createMultiPhaseWorkflow(config, (state) => {
      // Update stored state on changes
      const stored = activeWorkflows.get(state.id);
      if (stored) {
        stored.state = state;
      }
    });

    const initialState = workflow.getState();
    
    // Store workflow
    activeWorkflows.set(initialState.id, {
      workflow,
      state: initialState,
    });

    // Start workflow execution in background
    const executionPromise = workflow.execute().then((finalState) => {
      // Store final state
      const stored = activeWorkflows.get(initialState.id);
      if (stored) {
        stored.state = finalState;
      }
      
      // Clean up after 1 hour
      setTimeout(() => {
        activeWorkflows.delete(initialState.id);
      }, 60 * 60 * 1000);

      return finalState;
    }).catch((error) => {
      logger.error('Workflow execution failed', {
        workflowId: initialState.id,
        error: error.message,
      });
      
      const stored = activeWorkflows.get(initialState.id);
      if (stored) {
        stored.state = {
          ...stored.state,
          phase: 'failed',
          error: error.message,
        };
      }
      
      throw error;
    });

    // Store the promise
    const stored = activeWorkflows.get(initialState.id);
    if (stored) {
      stored.promise = executionPromise;
    }

    logger.info('Multi-phase workflow started', {
      workflowId: initialState.id,
      topic,
      keywordsCount: keywords.length,
    });

    return NextResponse.json({
      success: true,
      workflowId: initialState.id,
      state: initialState,
      message: 'Workflow started successfully',
    });
  } catch (error: any) {
    logger.error('Failed to start workflow', { error: error.message });
    return NextResponse.json(
      { error: error.message || 'Failed to start workflow' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/workflow/multi-phase?id=xxx
 * Get workflow status
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createServiceClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('id');

    if (!workflowId) {
      // Return list of active workflows for this user
      const userWorkflows: WorkflowState[] = [];
      activeWorkflows.forEach((stored) => {
        userWorkflows.push(stored.state);
      });

      return NextResponse.json({
        workflows: userWorkflows,
        count: userWorkflows.length,
      });
    }

    // Get specific workflow
    const stored = activeWorkflows.get(workflowId);
    
    if (!stored) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      state: stored.state,
    });
  } catch (error: any) {
    logger.error('Failed to get workflow status', { error: error.message });
    return NextResponse.json(
      { error: error.message || 'Failed to get workflow status' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/workflow/multi-phase?id=xxx
 * Cancel a workflow
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const supabase = createServiceClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workflowId = searchParams.get('id');

    if (!workflowId) {
      return NextResponse.json(
        { error: 'Workflow ID is required' },
        { status: 400 }
      );
    }

    const stored = activeWorkflows.get(workflowId);
    
    if (!stored) {
      return NextResponse.json(
        { error: 'Workflow not found' },
        { status: 404 }
      );
    }

    // Remove workflow
    activeWorkflows.delete(workflowId);

    logger.info('Workflow cancelled', { workflowId });

    return NextResponse.json({
      success: true,
      message: 'Workflow cancelled',
    });
  } catch (error: any) {
    logger.error('Failed to cancel workflow', { error: error.message });
    return NextResponse.json(
      { error: error.message || 'Failed to cancel workflow' },
      { status: 500 }
    );
  }
}

