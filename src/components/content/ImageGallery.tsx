/**
 * Image Gallery Component
 * 
 * Displays images from content metadata
 */

"use client";

import React from 'react';
import { extractImages, getFeaturedImage, getSectionImages } from '@/lib/content-metadata-utils';
import type { ContentMetadata } from '@/lib/content-metadata-utils';
import { PhotoIcon } from '@heroicons/react/24/outline';

interface ImageGalleryProps {
  contentMetadata: ContentMetadata | null | undefined;
  className?: string;
}

export function ImageGallery({ contentMetadata, className = '' }: ImageGalleryProps) {
  const images = extractImages(contentMetadata);
  const featuredImage = getFeaturedImage(contentMetadata);
  const sectionImages = getSectionImages(contentMetadata);

  if (images.length === 0) {
    return null;
  }

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <PhotoIcon className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Images ({images.length})
        </h3>
      </div>

      <div className="space-y-6">
        {/* Featured Image */}
        {featuredImage && (
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Featured Image
            </div>
            <div className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <img
                src={featuredImage.url}
                alt={featuredImage.alt || 'Featured image'}
                className="w-full h-auto"
              />
              {featuredImage.alt && (
                <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-2">
                  {featuredImage.alt}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Section Images */}
        {sectionImages.length > 0 && (
          <div>
            <div className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Section Images ({sectionImages.length})
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {sectionImages.map((image, index) => (
                <div key={index} className="relative rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
                  <img
                    src={image.url}
                    alt={image.alt || `Section image ${index + 1}`}
                    className="w-full h-32 object-cover"
                  />
                  {image.alt && (
                    <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-xs p-1 truncate">
                      {image.alt}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

