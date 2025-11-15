"use client";

import React from 'react';
import BrandVoiceSettings from '@/components/blog-writer/BrandVoiceSettings';

export default function BrandVoiceSettingsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Brand Voice Settings
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Configure your organization&apos;s brand voice to ensure consistent content generation across all blog posts.
        </p>
      </div>

      <BrandVoiceSettings />
    </div>
  );
}


