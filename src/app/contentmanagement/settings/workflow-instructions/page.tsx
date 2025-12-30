/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useEffect, useMemo, useState } from 'react';

type InstructionSet = {
  instruction_set_id: string;
  enabled: boolean;
  scope: { workflow?: string; platform?: string; content_type?: string };
  system_prompt: string | null;
  instructions: string;
  priority: number;
  updated_at: string;
};

const DEFAULT_SCOPE = { workflow: 'all', platform: 'any', content_type: 'any' };

export default function WorkflowInstructionsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sets, setSets] = useState<InstructionSet[]>([]);

  // Editor state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [workflow, setWorkflow] = useState('all');
  const [platform, setPlatform] = useState('any');
  const [contentType, setContentType] = useState('any');
  const [priority, setPriority] = useState(0);
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [instructions, setInstructions] = useState<string>('');

  const isEditing = useMemo(() => !!editingId, [editingId]);

  const resetForm = () => {
    setEditingId(null);
    setEnabled(true);
    setWorkflow('all');
    setPlatform('any');
    setContentType('any');
    setPriority(0);
    setSystemPrompt('');
    setInstructions('');
  };

  const load = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/workflow-instructions');
      if (!res.ok) throw new Error('Failed to load instruction sets');
      const data = await res.json();
      setSets(data.instruction_sets || []);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const startEdit = (s: InstructionSet) => {
    setEditingId(s.instruction_set_id);
    setEnabled(!!s.enabled);
    setWorkflow(s.scope?.workflow || 'all');
    setPlatform(s.scope?.platform || 'any');
    setContentType(s.scope?.content_type || 'any');
    setPriority(typeof s.priority === 'number' ? s.priority : 0);
    setSystemPrompt(s.system_prompt || '');
    setInstructions(s.instructions || '');
  };

  const save = async () => {
    try {
      setSaving(true);
      setError(null);

      const payload = {
        ...(editingId ? { instruction_set_id: editingId } : {}),
        enabled,
        scope: { workflow, platform, content_type: contentType },
        system_prompt: systemPrompt.trim().length ? systemPrompt : null,
        instructions,
        priority,
      };

      const res = await fetch('/api/workflow-instructions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to save');
      }

      resetForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      setSaving(true);
      setError(null);
      const res = await fetch(`/api/workflow-instructions/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || 'Failed to delete');
      }
      if (editingId === id) resetForm();
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to delete');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">Workflow Instructions</h1>
        <p className="text-sm text-gray-600 dark:text-gray-300">
          Org-level instructions applied to all blog generation workflows (standard, premium, comparison, multi-phase).
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-200">
          {error}
        </div>
      )}

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {isEditing ? 'Edit Instruction Set' : 'Create Instruction Set'}
          </h2>
          {isEditing && (
            <button
              className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
              onClick={resetForm}
              disabled={saving}
            >
              Cancel
            </button>
          )}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <label className="text-sm text-gray-700 dark:text-gray-200">
            Enabled
            <select
              className="mt-1 w-full rounded-md border border-gray-300 bg-white p-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              value={enabled ? 'true' : 'false'}
              onChange={(e) => setEnabled(e.target.value === 'true')}
              disabled={saving}
            >
              <option value="true">Enabled</option>
              <option value="false">Disabled</option>
            </select>
          </label>

          <label className="text-sm text-gray-700 dark:text-gray-200">
            Workflow
            <select
              className="mt-1 w-full rounded-md border border-gray-300 bg-white p-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              value={workflow}
              onChange={(e) => setWorkflow(e.target.value)}
              disabled={saving}
            >
              <option value="all">all</option>
              <option value="standard">standard</option>
              <option value="premium">premium</option>
              <option value="comparison">comparison</option>
            </select>
          </label>

          <label className="text-sm text-gray-700 dark:text-gray-200">
            Platform
            <select
              className="mt-1 w-full rounded-md border border-gray-300 bg-white p-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              disabled={saving}
            >
              <option value="any">any</option>
              <option value="webflow">webflow</option>
              <option value="wordpress">wordpress</option>
              <option value="shopify">shopify</option>
            </select>
          </label>

          <label className="text-sm text-gray-700 dark:text-gray-200">
            Content type
            <input
              className="mt-1 w-full rounded-md border border-gray-300 bg-white p-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              value={contentType}
              onChange={(e) => setContentType(e.target.value)}
              placeholder="any | comparison | review | ..."
              disabled={saving}
            />
          </label>

          <label className="text-sm text-gray-700 dark:text-gray-200">
            Priority
            <input
              type="number"
              className="mt-1 w-full rounded-md border border-gray-300 bg-white p-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              value={priority}
              onChange={(e) => setPriority(Number(e.target.value))}
              disabled={saving}
            />
          </label>

          <div className="text-sm text-gray-700 dark:text-gray-200">
            Scope preview
            <div className="mt-1 rounded-md border border-gray-200 bg-gray-50 p-2 text-xs text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-200">
              {JSON.stringify({ workflow, platform, content_type: contentType }, null, 0)}
            </div>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-1 gap-4">
          <label className="text-sm text-gray-700 dark:text-gray-200">
            System prompt (optional)
            <textarea
              className="mt-1 min-h-[90px] w-full rounded-md border border-gray-300 bg-white p-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="High-level system prompt (optional)"
              disabled={saving}
            />
          </label>

          <label className="text-sm text-gray-700 dark:text-gray-200">
            Instructions (required)
            <textarea
              className="mt-1 min-h-[160px] w-full rounded-md border border-gray-300 bg-white p-2 text-sm dark:border-gray-700 dark:bg-gray-900"
              value={instructions}
              onChange={(e) => setInstructions(e.target.value)}
              placeholder="These instructions will be merged with per-request custom instructions."
              disabled={saving}
            />
          </label>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            className="rounded-md bg-brand-500 px-4 py-2 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50"
            onClick={save}
            disabled={saving || !instructions.trim().length}
          >
            {saving ? 'Saving...' : isEditing ? 'Save changes' : 'Create'}
          </button>
          <button
            className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-200 dark:hover:bg-gray-900"
            onClick={resetForm}
            disabled={saving}
          >
            Reset
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-950">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Existing instruction sets</h2>
          <button
            className="text-sm text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white"
            onClick={load}
            disabled={loading || saving}
          >
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">Loading…</div>
        ) : sets.length === 0 ? (
          <div className="mt-4 text-sm text-gray-600 dark:text-gray-300">No instruction sets yet.</div>
        ) : (
          <div className="mt-4 space-y-3">
            {sets.map((s) => (
              <div
                key={s.instruction_set_id}
                className="rounded-lg border border-gray-200 p-3 dark:border-gray-800"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-sm text-gray-900 dark:text-gray-100">
                    <span className="font-semibold">{s.enabled ? 'Enabled' : 'Disabled'}</span>
                    <span className="mx-2 text-gray-400">•</span>
                    <span className="text-gray-700 dark:text-gray-300">
                      scope: {JSON.stringify(s.scope || DEFAULT_SCOPE)}
                    </span>
                    <span className="mx-2 text-gray-400">•</span>
                    <span className="text-gray-700 dark:text-gray-300">priority: {s.priority}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      className="rounded-md border border-gray-300 px-3 py-1 text-sm hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:hover:bg-gray-900"
                      onClick={() => startEdit(s)}
                      disabled={saving}
                    >
                      Edit
                    </button>
                    <button
                      className="rounded-md border border-red-300 px-3 py-1 text-sm text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-200 dark:hover:bg-red-950"
                      onClick={() => remove(s.instruction_set_id)}
                      disabled={saving}
                    >
                      Delete
                    </button>
                  </div>
                </div>

                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div className="rounded-md bg-gray-50 p-2 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-200">
                    <div className="mb-1 font-semibold">System prompt</div>
                    <div className="whitespace-pre-wrap">{s.system_prompt || '(none)'}</div>
                  </div>
                  <div className="rounded-md bg-gray-50 p-2 text-xs text-gray-700 dark:bg-gray-900 dark:text-gray-200">
                    <div className="mb-1 font-semibold">Instructions</div>
                    <div className="whitespace-pre-wrap">{s.instructions}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}


