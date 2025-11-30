"use client";

import { useState, useEffect, useCallback } from 'react';
import { Modal } from '@/components/ui/modal/index';
import { 
  PhotoIcon, 
  CloudArrowUpIcon, 
  SparklesIcon,
  XMarkIcon,
  MagnifyingGlassIcon
} from '@heroicons/react/24/outline';
import { logger } from '@/utils/logger';
import { createClient } from '@/lib/supabase/client';

interface MediaAsset {
  asset_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  created_at: string;
}

interface ImageInsertModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImageSelect: (imageUrl: string, options?: { alignment?: 'left' | 'center' | 'right' | 'full'; size?: 'small' | 'medium' | 'large' | 'full' }) => void;
  excerpt?: string;
}

type TabType = 'upload' | 'library' | 'generate';

/**
 * Media Thumbnail Component
 * Handles image loading states and error handling
 */
function MediaThumbnail({ 
  asset, 
  onSelect 
}: { 
  asset: MediaAsset; 
  onSelect: (url: string) => void;
}) {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const handleClick = () => {
    if (asset.file_url && !imageError) {
      onSelect(asset.file_url);
    }
  };

  return (
    <div
      onClick={handleClick}
      className={`relative group rounded-lg overflow-hidden border transition-all ${
        asset.file_url && !imageError
          ? 'cursor-pointer border-gray-200 dark:border-gray-700 hover:border-blue-500 dark:hover:border-blue-400'
          : 'cursor-not-allowed border-gray-300 dark:border-gray-600 opacity-60'
      } bg-gray-100 dark:bg-gray-700`}
    >
      {asset.file_url && !imageError ? (
        <>
          {imageLoading && (
            <div className="absolute inset-0 flex items-center justify-center bg-gray-200 dark:bg-gray-600 z-10">
              <div className="w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
            </div>
          )}
          <div className="w-full h-32 bg-gray-100 dark:bg-gray-700 flex items-center justify-center overflow-hidden">
            <img
              src={asset.file_url}
              alt={asset.file_name}
              className={`max-w-full max-h-full object-contain ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
              onError={() => {
                setImageError(true);
                setImageLoading(false);
                logger.warn('Image failed to load', { 
                  file_url: asset.file_url?.substring(0, 100),
                  file_name: asset.file_name,
                  asset_id: asset.asset_id 
                });
              }}
              onLoad={() => {
                setImageLoading(false);
              }}
              loading="lazy"
            />
          </div>
          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-opacity flex items-center justify-center">
            <span className="text-white opacity-0 group-hover:opacity-100 text-sm font-medium">
              Select
            </span>
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-2">
            <p className="text-white text-xs truncate">{asset.file_name}</p>
          </div>
        </>
      ) : (
        <div className="w-full h-32 flex items-center justify-center bg-gray-200 dark:bg-gray-600">
          <div className="text-center p-2">
            <PhotoIcon className="w-8 h-8 mx-auto text-gray-400 mb-1" />
            <p className="text-xs text-gray-500 dark:text-gray-400 truncate px-1">{asset.file_name}</p>
            {imageError && (
              <p className="text-xs text-red-500 mt-1">Failed to load</p>
            )}
            {!asset.file_url && (
              <p className="text-xs text-red-500 mt-1">No URL</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ImageInsertModal({
  isOpen,
  onClose,
  onImageSelect,
  excerpt = ''
}: ImageInsertModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('upload');
  const [uploading, setUploading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStatus, setGenerationStatus] = useState<string>('');
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);
  const [loadingMedia, setLoadingMedia] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [generatePrompt, setGeneratePrompt] = useState(excerpt);
  const [imageAlignment, setImageAlignment] = useState<'left' | 'center' | 'right' | 'full'>('center');
  const [imageSize, setImageSize] = useState<'small' | 'medium' | 'large' | 'full'>('large');

  // Load media assets when library tab is active or search term changes
  useEffect(() => {
    if (isOpen && activeTab === 'library') {
      loadMediaAssets();
    }
  }, [isOpen, activeTab, searchTerm]);

  // Set generate prompt from excerpt when modal opens
  useEffect(() => {
    if (isOpen && excerpt) {
      setGeneratePrompt(excerpt);
    }
  }, [isOpen, excerpt]);

  const loadMediaAssets = async () => {
    setLoadingMedia(true);
    try {
      // Use API endpoint for better compatibility and consistency
      const params = new URLSearchParams({
        type: 'image',
        limit: '50',
        search: searchTerm || '',
      });

      const response = await fetch(`/api/media/list?${params}`);
      if (!response.ok) {
        throw new Error('Failed to load media assets');
      }

      const result = await response.json();
      const assets = result.data || [];
      
      // Validate and log image URLs
      logger.debug('Loaded media assets', {
        count: assets.length,
        assets: assets.map((a: MediaAsset) => ({
          asset_id: a.asset_id,
          file_name: a.file_name,
          has_url: !!a.file_url,
          url_preview: a.file_url ? a.file_url.substring(0, 80) : 'MISSING',
          url_valid: a.file_url ? (a.file_url.startsWith('http://') || a.file_url.startsWith('https://') || a.file_url.startsWith('data:')) : false,
        })),
      });
      
      setMediaAssets(assets);
    } catch (error) {
      logger.error('Error loading media assets:', error);
    } finally {
      setLoadingMedia(false);
    }
  };

  const handleFileUpload = useCallback(async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/images/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Upload failed');
      }

      const result = await response.json();
      onImageSelect(result.url, { alignment: imageAlignment, size: imageSize });
      onClose();
    } catch (error) {
      logger.error('Error uploading image:', error);
      alert(error instanceof Error ? error.message : 'Failed to upload image. Please try again.');
    } finally {
      setUploading(false);
    }
  }, [onImageSelect, onClose, imageAlignment, imageSize]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  }, [handleFileUpload]);

  const handleGenerateImage = useCallback(async () => {
    if (!generatePrompt.trim()) {
      alert('Please enter a prompt or excerpt to generate an image.');
      return;
    }

    setGenerating(true);
    try {
      const response = await fetch('/api/images/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: generatePrompt.trim(),
          aspectRatio: '16:9',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Image generation failed');
      }

      const result = await response.json();
      
      // Reset progress when starting new generation
      setGenerationProgress(0);
      setGenerationStatus('');
      
      // Check if async mode (job_id returned)
      if (result.job_id) {
        logger.debug('Async mode detected, polling job status...', { job_id: result.job_id });
        setGenerationStatus('Starting image generation...');
        setGenerationProgress(5);
        
        // Poll job status until completed
        const maxAttempts = 30;
        let attempt = 0;
        let imageUrl: string | null = null;
        
        while (attempt < maxAttempts) {
          attempt++;
          
          // Update progress based on attempt (with some randomness for realism)
          const baseProgress = Math.min(10 + (attempt * 3), 90);
          setGenerationProgress(baseProgress);
          
          // Update status message
          if (attempt < 5) {
            setGenerationStatus('Initializing image generation...');
          } else if (attempt < 15) {
            setGenerationStatus('Generating your image...');
          } else if (attempt < 25) {
            setGenerationStatus('Finalizing image details...');
          } else {
            setGenerationStatus('Almost done...');
          }
          
          await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds between polls
          
          const statusResponse = await fetch(`/api/images/jobs/${result.job_id}`, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
            },
          });
          
          if (!statusResponse.ok) {
            throw new Error(`Failed to check job status: ${statusResponse.status}`);
          }
          
          const statusResult = await statusResponse.json();
          const jobStatus = statusResult.status;
          const progress = statusResult.progress_percentage || 0;
          
          // Use actual progress if available, otherwise use estimated
          if (progress > 0) {
            setGenerationProgress(progress);
          }
          
          logger.debug('Job status poll', { attempt, status: jobStatus, progress });
          
          if (jobStatus === 'completed') {
            setGenerationProgress(100);
            setGenerationStatus('Image generated successfully!');
            // Extract image from completed job
            if (statusResult.result?.images && statusResult.result.images.length > 0) {
              const imageData = statusResult.result.images[0];
              if (imageData.image_url) {
                imageUrl = imageData.image_url;
              } else if (imageData.image_data) {
                // Convert base64 to data URL
                const format = imageData.format || 'png';
                if (imageData.image_data.startsWith('data:image/')) {
                  imageUrl = imageData.image_data;
                } else {
                  imageUrl = `data:image/${format};base64,${imageData.image_data}`;
                }
              }
            }
            
            if (imageUrl) {
              break;
            }
          } else if (jobStatus === 'failed') {
            const errorMsg = statusResult.error_message || statusResult.error || 'Image generation failed';
            throw new Error(errorMsg);
          }
        }
        
        if (!imageUrl) {
          throw new Error('Image generation timed out or did not return an image URL');
        }
        
        onImageSelect(imageUrl, { alignment: imageAlignment, size: imageSize });
        setGenerationProgress(0);
        setGenerationStatus('');
        onClose();
        return;
      }
      
      // Synchronous mode - extract image URL directly
      let imageUrl: string | null = null;
      
      if (result.images && result.images.length > 0) {
        const imageData = result.images[0];
        // Prefer image_url, fallback to image_data (base64)
        if (imageData.image_url) {
          imageUrl = imageData.image_url;
        } else if (imageData.image_data) {
          // Convert base64 to data URL if needed
          if (imageData.image_data.startsWith('data:image/')) {
            imageUrl = imageData.image_data;
          } else {
            // Assume it's base64 without data URL prefix
            const format = imageData.format || 'png';
            imageUrl = `data:image/${format};base64,${imageData.image_data}`;
          }
        }
      } else if (result.image) {
        // Alternative structure: { image: { image_url: "..." } }
        imageUrl = result.image.image_url || result.image.url || result.image.secure_url || null;
      } else {
        // Fallback to top-level fields
        imageUrl = result.image_url || result.url || result.secure_url || null;
      }
      
      if (!imageUrl) {
        logger.error('No image URL found in response:', result);
        throw new Error('No image URL returned from generation. Please check the response structure.');
      }

      onImageSelect(imageUrl, { alignment: imageAlignment, size: imageSize });
      setGenerationProgress(0);
      setGenerationStatus('');
      onClose();
    } catch (error) {
      logger.error('Error generating image:', error);
      alert(error instanceof Error ? error.message : 'Failed to generate image. Please try again.');
    } finally {
      setGenerating(false);
    }
  }, [generatePrompt, onImageSelect, onClose]);

  const handleLibraryImageSelect = useCallback((imageUrl: string) => {
    onImageSelect(imageUrl, { alignment: imageAlignment, size: imageSize });
    onClose();
  }, [onImageSelect, onClose, imageAlignment, imageSize]);

  const filteredMedia = mediaAssets.filter(asset =>
    asset.file_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={true}>
      <div className="w-full max-w-5xl max-h-[85vh] mx-auto flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Insert Image
          </h2>
          {/* Removed duplicate close button - Modal component already provides one */}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab('upload')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'upload'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <CloudArrowUpIcon className="w-5 h-5" />
              <span>Upload from Computer</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('library')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'library'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <PhotoIcon className="w-5 h-5" />
              <span>Media Library</span>
            </div>
          </button>
          <button
            onClick={() => setActiveTab('generate')}
            className={`flex-1 px-6 py-4 text-sm font-medium transition-colors ${
              activeTab === 'generate'
                ? 'text-blue-600 dark:text-blue-400 border-b-2 border-blue-600 dark:border-blue-400'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
            }`}
          >
            <div className="flex items-center justify-center gap-2">
              <SparklesIcon className="w-5 h-5" />
              <span>Generate from Excerpt</span>
            </div>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-12 text-center hover:border-blue-500 dark:hover:border-blue-400 transition-colors">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  disabled={uploading}
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <CloudArrowUpIcon className="w-12 h-12 text-gray-400 dark:text-gray-500 mb-4" />
                  <span className="text-lg font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {uploading ? 'Uploading...' : 'Click to upload or drag and drop'}
                  </span>
                  <span className="text-sm text-gray-500 dark:text-gray-400">
                    PNG, JPG, GIF up to 10MB
                  </span>
                </label>
              </div>
              {uploading && (
                <div className="flex items-center justify-center py-4">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          )}

          {/* Library Tab */}
          {activeTab === 'library' && (
            <div className="space-y-4">
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search media library..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              {/* Image Layout Options for Library */}
              <div className="grid grid-cols-2 gap-4 pb-4 border-b border-gray-200 dark:border-gray-700">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Image Size
                  </label>
                  <select
                    value={imageSize}
                    onChange={(e) => setImageSize(e.target.value as 'small' | 'medium' | 'large' | 'full')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value="small">Small (~300px)</option>
                    <option value="medium">Medium (~600px)</option>
                    <option value="large">Large (~900px)</option>
                    <option value="full">Full Width</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Alignment
                  </label>
                  <select
                    value={imageAlignment}
                    onChange={(e) => setImageAlignment(e.target.value as 'left' | 'center' | 'right' | 'full')}
                    disabled={imageSize === 'full'}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                  >
                    <option value="left">Left</option>
                    <option value="center">Center</option>
                    <option value="right">Right</option>
                    <option value="full">Full Width</option>
                  </select>
                </div>
              </div>

              {loadingMedia ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : filteredMedia.length === 0 ? (
                <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                  {searchTerm ? 'No images found matching your search.' : 'No images in your media library yet.'}
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4">
                  {filteredMedia.map((asset) => (
                    <MediaThumbnail
                      key={asset.asset_id}
                      asset={asset}
                      onSelect={handleLibraryImageSelect}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Generate Tab */}
          {activeTab === 'generate' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Image Prompt (based on excerpt)
                </label>
                <textarea
                  value={generatePrompt}
                  onChange={(e) => setGeneratePrompt(e.target.value)}
                  placeholder="Enter a description of the image you want to generate..."
                  rows={6}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                />
                {excerpt && (
                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    Pre-filled from excerpt: {excerpt.substring(0, 100)}...
                  </p>
                )}
              </div>
              <button
                onClick={handleGenerateImage}
                disabled={generating || !generatePrompt.trim()}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white rounded-lg transition-colors flex items-center justify-center gap-2 font-medium"
              >
                {generating ? (
                  <>
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Generating Image...</span>
                  </>
                ) : (
                  <>
                    <SparklesIcon className="w-5 h-5" />
                    <span>Generate Image</span>
                  </>
                )}
              </button>
              {generating && (
                <div className="space-y-3">
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                    <div
                      className="bg-blue-600 h-2.5 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${generationProgress}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">{generationStatus}</span>
                    <span className="text-gray-500 dark:text-gray-500 font-medium">{generationProgress}%</span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 text-center">
                    This usually takes 10-30 seconds...
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
}

