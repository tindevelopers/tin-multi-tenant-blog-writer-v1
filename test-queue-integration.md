# Queue Integration Test Guide

## Testing Steps 4 & 5

### Step 4: Blog Generation Queue Integration ✅

**What was implemented:**
- Queue entry created before generation starts
- Queue status updated during generation (with progress)
- Queue updated on completion/failure
- Queue ID returned in blog generation response

**Test Steps:**

1. **Test Queue Entry Creation**
   ```bash
   # Generate a blog (this should create a queue entry)
   curl -X POST http://localhost:3000/api/blog-writer/generate \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "topic": "Test Blog Topic",
       "keywords": ["test", "blog"],
       "word_count": 1000
     }'
   ```

   **Expected:**
   - Response includes `queue_id`
   - Queue entry created in database with status 'generating'
   - After completion, status changes to 'generated'

2. **Verify Queue Entry in Database**
   ```sql
   -- Check queue entry was created
   SELECT 
     queue_id,
     topic,
     status,
     progress_percentage,
     generation_started_at,
     generation_completed_at
   FROM blog_generation_queue
   ORDER BY queued_at DESC
   LIMIT 1;
   ```

3. **Test Progress Updates**
   - Generate a blog
   - Check that `progress_updates` array is stored in queue
   - Verify `progress_percentage` and `current_stage` are updated

4. **Test Error Handling**
   - Generate with invalid parameters
   - Verify queue entry status changes to 'failed'
   - Verify `generation_error` is populated

### Step 5: Real-time Status Updates (SSE) ✅

**What was implemented:**
- SSE endpoint: `GET /api/blog-queue/[id]/status`
- Polls queue status every 2 seconds
- Streams updates to client
- Auto-closes on terminal status

**Test Steps:**

1. **Test SSE Connection**
   ```javascript
   // In browser console or test script
   const eventSource = new EventSource('/api/blog-queue/QUEUE_ID/status');
   
   eventSource.onmessage = (event) => {
     const data = JSON.parse(event.data);
     console.log('Status update:', data);
   };
   
   eventSource.onerror = (error) => {
     console.error('SSE error:', error);
     eventSource.close();
   };
   ```

2. **Expected SSE Messages:**
   ```json
   // Initial connection
   {
     "type": "connected",
     "queue_id": "...",
     "status": "generating",
     "progress_percentage": 25,
     "current_stage": "keyword_analysis",
     "timestamp": "2025-01-16T..."
   }
   
   // Status updates (every 2 seconds)
   {
     "type": "status_update",
     "queue_id": "...",
     "status": "generating",
     "progress_percentage": 50,
     "current_stage": "draft_generation",
     "latest_progress": { ... },
     "timestamp": "2025-01-16T..."
   }
   
   // Completion
   {
     "type": "complete",
     "status": "generated",
     "timestamp": "2025-01-16T..."
   }
   ```

3. **Test Full Flow**
   - Start blog generation
   - Get `queue_id` from response
   - Connect to SSE endpoint
   - Watch real-time updates
   - Verify connection closes on completion

## Manual Test Checklist

### Queue Integration
- [ ] Queue entry created when blog generation starts
- [ ] Queue status is 'generating' during generation
- [ ] Progress updates stored in queue
- [ ] Queue status changes to 'generated' on success
- [ ] Queue status changes to 'failed' on error
- [ ] Generated content stored in queue
- [ ] Queue ID returned in API response

### SSE Endpoint
- [ ] SSE connection established successfully
- [ ] Initial status message received
- [ ] Status updates received every 2 seconds
- [ ] Progress percentage updates correctly
- [ ] Current stage updates correctly
- [ ] Connection closes on terminal status
- [ ] Error handling works (invalid queue_id)
- [ ] Connection timeout after 10 minutes

### Error Scenarios
- [ ] Queue entry created even if generation fails
- [ ] Error message stored in queue on failure
- [ ] SSE handles missing queue item gracefully
- [ ] SSE handles unauthorized access

## API Endpoints to Test

1. **POST /api/blog-writer/generate**
   - Should create queue entry
   - Should return queue_id
   - Should update queue on completion

2. **GET /api/blog-queue**
   - Should list queue items
   - Should filter by status
   - Should paginate correctly

3. **GET /api/blog-queue/[id]**
   - Should return queue item details
   - Should include progress updates

4. **GET /api/blog-queue/[id]/status**
   - Should stream SSE updates
   - Should update every 2 seconds
   - Should close on completion

5. **GET /api/blog-queue/stats**
   - Should return statistics
   - Should count by status

## Expected Database State

After generating a blog:

```sql
-- Queue entry should exist
SELECT * FROM blog_generation_queue 
WHERE topic = 'Test Blog Topic'
ORDER BY queued_at DESC LIMIT 1;

-- Should have:
-- status: 'generated'
-- progress_percentage: 100
-- generated_content: (not null)
-- generated_title: (not null)
-- progress_updates: (array with updates)
-- generation_completed_at: (timestamp)
```

## Troubleshooting

### Queue entry not created
- Check user authentication
- Check org_id exists
- Check database permissions
- Check console logs for errors

### SSE not working
- Check CORS settings
- Check authentication
- Check queue_id is valid
- Check browser console for errors
- Verify SSE endpoint is accessible

### Progress not updating
- Check external API returns progress_updates
- Check queue update query succeeds
- Check console logs for update errors

