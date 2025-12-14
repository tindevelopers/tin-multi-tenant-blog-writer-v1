'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';
import { PlusCircleIcon, ArrowPathIcon, GlobeAltIcon, TrashIcon, StarIcon } from '@heroicons/react/24/outline';
import { CMSProvider, PublishingTarget, UserRole } from '@/types/publishing';

interface AuthInfo {
  orgId: string;
  userId: string;
  role: UserRole;
}

interface TargetFormState {
  provider: CMSProvider | '';
  siteId: string;
  siteName: string;
  collectionId: string;
  integrationId: string;
  isDefault: boolean;
}

const providerOptions: { label: string; value: CMSProvider; description: string }[] = [
  { label: 'Webflow', value: CMSProvider.WEBFLOW, description: 'Publish to Webflow CMS collections' },
  { label: 'Shopify', value: CMSProvider.SHOPIFY, description: 'Publish to Shopify blogs or pages' },
  { label: 'WordPress', value: CMSProvider.WORDPRESS, description: 'Publish to WordPress sites' },
  { label: 'Custom', value: CMSProvider.CUSTOM, description: 'Custom CMS via webhooks or API' },
];

type PublishingTargetRecord = PublishingTarget & {
  target_id: string;
  integration_id: string;
  provider: CMSProvider;
  site_name?: string;
  is_default?: boolean;
  created_at?: string;
};

export default function PublishingTargetsPage() {
  const router = useRouter();
  const [authInfo, setAuthInfo] = useState<AuthInfo | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [targets, setTargets] = useState<PublishingTargetRecord[]>([]);
  const [loadingTargets, setLoadingTargets] = useState(false);
  const [formState, setFormState] = useState<TargetFormState>({
    provider: '',
    siteId: '',
    siteName: '',
    collectionId: '',
    integrationId: '',
    isDefault: false,
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    const loadAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          setAuthError('Please sign in to manage publishing targets.');
          return;
        }
        const { data: profile, error } = await supabase
          .from('users')
          .select('org_id, role')
          .eq('user_id', user.id)
          .single();
        if (error || !profile?.org_id) {
          setAuthError('Unable to load organization context.');
          return;
        }
        const allowedRoles: UserRole[] = [
          UserRole.ADMIN,
          UserRole.OWNER,
          UserRole.MANAGER,
          UserRole.SYSTEM_ADMIN,
          UserRole.SUPER_ADMIN,
        ];
        if (!allowedRoles.includes(profile.role as UserRole)) {
          setAuthError('Access denied. Please contact an administrator.');
          return;
        }
        setAuthInfo({ orgId: profile.org_id, userId: user.id, role: profile.role as UserRole });
      } catch (err) {
        setAuthError(err instanceof Error ? err.message : 'Failed to verify authentication.');
      }
    };
    loadAuth();
  }, []);

  const fetchTargets = async () => {
    setLoadingTargets(true);
    try {
      const response = await fetch('/api/publishing/targets', {
        headers: { Authorization: `Bearer ${(await createClient().auth.getSession()).data.session?.access_token ?? ''}` },
      });
      if (!response.ok) {
        throw new Error((await response.json().catch(() => ({})))?.error || 'Failed to load targets');
      }
      const data = await response.json();
      setTargets(Array.isArray(data?.data) ? data.data : []);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Failed to load publishing targets.');
    } finally {
      setLoadingTargets(false);
    }
  };

  useEffect(() => {
    if (authInfo) {
      fetchTargets();
    }
  }, [authInfo]);

  const resetForm = () => {
    setFormState({ provider: '', siteId: '', siteName: '', collectionId: '', integrationId: '', isDefault: false });
    setFormError(null);
    setSuccessMessage(null);
  };

  const canSubmit = useMemo(() => {
    return (
      !!formState.provider &&
      !!formState.siteId &&
      !!formState.integrationId &&
      (!formState.collectionId || formState.collectionId.length <= 128) &&
      formState.siteId.length <= 128 &&
      formState.siteName.length <= 256
    );
  }, [formState]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!authInfo) return;
    if (!canSubmit) {
      setFormError('Please fill in all required fields.');
      return;
    }
    setSubmitting(true);
    setFormError(null);
    setSuccessMessage(null);
    try {
      const payload = {
        provider: formState.provider,
        site_id: formState.siteId,
        site_name: formState.siteName || undefined,
        collection_id: formState.collectionId || undefined,
        integration_id: formState.integrationId,
        is_default: formState.isDefault,
      };
      const response = await fetch('/api/publishing/targets', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${(await createClient().auth.getSession()).data.session?.access_token ?? ''}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json?.error || json?.message || 'Failed to save publishing target');
      }
      setSuccessMessage('Publishing target saved.');
      resetForm();
      fetchTargets(authInfo);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Failed to save publishing target.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (targetId: string) => {
    if (!authInfo) return;
    if (!confirm('Delete this publishing target?')) return;
    try {
      const response = await fetch(`/api/publishing/targets/${targetId}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${(await createClient().auth.getSession()).data.session?.access_token ?? ''}`,
        },
      });
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json?.error || 'Failed to delete target');
      }
      fetchTargets(authInfo);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Failed to delete target.');
    }
  };

  const handleSetDefault = async (targetId: string) => {
    if (!authInfo) return;
    try {
      const response = await fetch(`/api/publishing/targets/${targetId}/default`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${(await createClient().auth.getSession()).data.session?.access_token ?? ''}`,
        },
      });
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json?.error || 'Failed to update default target');
      }
      fetchTargets(authInfo);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Failed to set default target.');
    }
  };

  if (authError) {
    return (
      <div className="max-w-5xl mx-auto py-12">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-6">
          <h2 className="text-xl font-semibold text-red-800 dark:text-red-200 mb-2">Access Issue</h2>
          <p className="text-red-700 dark:text-red-300 mb-4">{authError}</p>
          <button
            onClick={() => router.push('/admin')}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
          >
            Back to Admin Dashboard
          </button>
        </div>
      </div>
    );
  }

  if (!authInfo) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <ArrowPathIcon className="w-12 h-12 text-gray-400 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Publishing Targets</h1>
        <p className="text-gray-600 dark:text-gray-300 max-w-3xl">
          Configure multiple publishing targets across Webflow, WordPress, Shopify, and custom CMS providers.
          Each target defines a site and optional collection. Mark one as default to prefill drafts.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Configured Targets</h2>
            <button
              onClick={() => fetchTargets(authInfo)}
              className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-lg border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800"
            >
              <ArrowPathIcon className={`w-4 h-4 ${loadingTargets ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          <div className="space-y-3">
            {targets.length === 0 && (
              <div className="border border-dashed border-gray-300 dark:border-gray-700 rounded-xl p-6 text-center">
                <p className="text-gray-600 dark:text-gray-300">No publishing targets configured yet.</p>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Use the form to add your first target.</p>
              </div>
            )}

            {targets.map((target) => (
              <div key={target.target_id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-5 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300">
                      <GlobeAltIcon className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-sm uppercase tracking-wide text-gray-500 dark:text-gray-400">{target.provider}</p>
                      <p className="text-lg font-medium text-gray-900 dark:text-white">{target.site_name || target.site_id}</p>
                      {target.collection_id && (
                        <p className="text-sm text-gray-500 dark:text-gray-400">Collection: {target.collection_id}</p>
                      )}
                    </div>
                  </div>
                  {target.is_default && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium bg-amber-100 text-amber-800 rounded-full">
                      <StarIcon className="w-4 h-4" /> Default
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between text-sm text-gray-500 dark:text-gray-400">
                  <p>Integration ID: <span className="font-mono text-xs">{target.integration_id}</span></p>
                  {target.created_at && <p>Added {new Date(target.created_at).toLocaleDateString()}</p>}
                </div>

                <div className="flex items-center gap-3 pt-2">
                  {!target.is_default && (
                    <button
                      onClick={() => handleSetDefault(target.target_id)}
                      className="inline-flex items-center gap-1 text-sm font-medium text-amber-600 hover:text-amber-700"
                    >
                      <StarIcon className="w-4 h-4" /> Set as default
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(target.target_id)}
                    className="inline-flex items-center gap-1 text-sm font-medium text-red-600 hover:text-red-700"
                  >
                    <TrashIcon className="w-4 h-4" /> Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-6 shadow-sm h-fit">
          <div className="flex items-center gap-2 mb-4">
            <PlusCircleIcon className="w-6 h-6 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Add Publishing Target</h3>
          </div>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Provider
              </label>
              <select
                value={formState.provider}
                onChange={(e) => setFormState((prev) => ({ ...prev, provider: e.target.value as CMSProvider }))}
                className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                required
              >
                <option value="" disabled>Select provider</option>
                {providerOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
              {formState.provider && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {providerOptions.find((p) => p.value === formState.provider)?.description}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Integration ID
              </label>
              <input
                type="text"
                value={formState.integrationId}
                onChange={(e) => setFormState((prev) => ({ ...prev, integrationId: e.target.value }))}
                className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="integration UUID"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Site ID
              </label>
              <input
                type="text"
                value={formState.siteId}
                onChange={(e) => setFormState((prev) => ({ ...prev, siteId: e.target.value }))}
                className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="webflow site ID"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Site Name
              </label>
              <input
                type="text"
                value={formState.siteName}
                onChange={(e) => setFormState((prev) => ({ ...prev, siteName: e.target.value }))}
                className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="Display name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Collection ID (optional)
              </label>
              <input
                type="text"
                value={formState.collectionId}
                onChange={(e) => setFormState((prev) => ({ ...prev, collectionId: e.target.value }))}
                className="w-full rounded-lg border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="collection ID"
              />
            </div>

            <label className="inline-flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
              <input
                type="checkbox"
                className="rounded border-gray-300 text-amber-600 focus:ring-amber-500"
                checked={formState.isDefault}
                onChange={(e) => setFormState((prev) => ({ ...prev, isDefault: e.target.checked }))}
              />
              Set as default target
            </label>

            {formError && <p className="text-sm text-red-600">{formError}</p>}
            {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}

            <button
              type="submit"
              disabled={submitting || !canSubmit}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              {submitting ? <ArrowPathIcon className="w-4 h-4 animate-spin" /> : <PlusCircleIcon className="w-4 h-4" />}
              Save Target
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="w-full text-sm text-gray-500 hover:text-gray-700"
            >
              Reset form
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
