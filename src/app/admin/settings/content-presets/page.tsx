"use client";

import React from 'react';
import ContentPresetsManager from '@/components/blog-writer/ContentPresetsManager';

export default function ContentPresetsPage() {
  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
          Content Presets
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mt-2">
          Create and manage content presets with predefined formats, word counts, and quality levels for faster blog generation.
        </p>
      </div>

      <ContentPresetsManager />
    </div>
  );
}



