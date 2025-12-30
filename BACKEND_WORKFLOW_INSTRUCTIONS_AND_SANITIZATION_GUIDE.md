## Overview

This repo now supports:
- **Org-level dashboard instructions** stored in Supabase table `workflow_instruction_sets`
- **Final output sanitization** in the Next.js app (artifact removal) before saving/publishing

To fully guarantee “no artifacts ever”, the **Python Cloud Run backend** should also:
- accept org-resolved instructions (or fetch them itself)
- sanitize content before returning/storing job results

This document describes the recommended backend-side changes.

## 1) Accept instructions in the backend request payload

### Inputs (recommended)

For all generation entrypoints (quick + multi_phase + any internal endpoints), accept:
- `system_prompt` (optional): high-level system message
- `custom_instructions` (optional): merged org dashboard instructions + per-request instructions

In this repo, org+request instructions are resolved server-side in:
- `src/lib/workflow-instructions/resolver.ts`

### How to use them

When calling LiteLLM / model provider:
- Put `system_prompt` into the **system** message
- Put the blog request into the **user** message
- Append `custom_instructions` to the user message (or keep as its own user message)

## 2) Apply sanitization server-side (backend)

### Why

Even with client-side sanitization, the backend may:
- store artifacts in async job results
- emit artifacts in intermediate phases
- affect downstream steps (SEO, interlinking) with dirty text

### What to sanitize

At minimum, sanitize right before writing final results / returning response:
- `title`
- `excerpt` / `meta_description`
- `content` (HTML/Markdown)

### Artifact patterns

Use the same patterns as the Next.js app:
- see `src/lib/unified-content-sanitizer.ts` for canonical patterns and behaviors.

Port these patterns into Python (regex-based), or re-use them by maintaining a shared pattern list.

### Recommended backend contract

Add fields to the backend response (optional but useful):
- `sanitized: true|false`
- `sanitization_summary: [...]` (what was removed)

## 3) Instructions fetching in backend (optional)

If you prefer backend to be the single source of truth:
- Provide `org_id` in generation requests
- Backend fetches matching instruction set from Supabase (same rules as frontend resolver):
  - filter `enabled=true`
  - match `scope.workflow`, `scope.platform`, `scope.content_type` with defaults `all/any/any`
  - pick highest `priority`, then latest `updated_at`

## 4) Multi-phase (async) jobs

For async flows, ensure sanitization happens:
- when generating the “final assembled content” (before storing to job result)
- not just in a client response

This prevents artifacts from appearing later when the Next.js app polls job results.

## 5) Testing checklist

- Generate content with known-bad artifacts and confirm they are removed:
  - “Here’s the blog post…”
  - “As an AI…”
  - “IMPORTANT: Return ONLY…”
  - broken HTML fragments (`class=\"...\">` etc.)
- Verify dashboard instructions apply:
  - set org instructions in `workflow_instruction_sets`
  - generate standard + premium + comparison + multi_phase
  - confirm output reflects org defaults + per-request overrides


