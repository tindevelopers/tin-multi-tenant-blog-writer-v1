"use client";

import { useState, useEffect, useCallback } from "react";
import { 
  PlusIcon, 
  MagnifyingGlassIcon, 
  FunnelIcon,
  PhotoIcon,
  DocumentIcon,
  VideoCameraIcon,
  MusicalNoteIcon,
  CloudArrowUpIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ShareIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon
} from "@heroicons/react/24/outline";
import { createClient } from "@/lib/supabase/client";
import { logger } from "@/utils/logger";

interface MediaAsset {
  asset_id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  file_size: number;
  created_at: string;
  uploaded_by: string | null;
  metadata: {
    public_id?: string;
    width?: number;
    height?: number;
    tags?: string[];
    [key: string]: any;
  };
}

interface MediaStats {
  total: number;
  images: number;
  videos: number;
  storageUsed: string;
  storageBytes: number;
}

export default function MediaPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [mediaFiles, setMediaFiles] = useState<MediaAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [testingCredentials, setTestingCredentials] = useState(false);
  const [checkingRoot, setCheckingRoot] = useState(false);
  const [stats, setStats] = useState<MediaStats>({
    total: 0,
    images: 0,
    videos: 0,
    storageUsed: "0 GB",
    storageBytes: 0,
  });

  // Load media assets
  const loadMediaAssets = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        search: searchTerm,
        type: selectedFilter,
        limit: '100',
      });

      const response = await fetch(`/api/media/list?${params}`);
      if (!response.ok) {
        throw new Error('Failed to load media assets');
      }

      const result = await response.json();
      
      // Debug: Log what we received
      logger.debug('Media assets loaded:', {
        count: result.data?.length || 0,
        files: result.data?.map((f: MediaAsset) => ({
          asset_id: f.asset_id,
          file_name: f.file_name,
          file_type: f.file_type,
          file_url: f.file_url ? f.file_url.substring(0, 50) + '...' : 'MISSING',
          has_file_url: !!f.file_url,
        })),
      });
      
      // Check for missing URLs
      const missingUrls = result.data?.filter((f: MediaAsset) => !f.file_url) || [];
      if (missingUrls.length > 0) {
        logger.warn('Media assets with missing file_url:', {
          count: missingUrls.length,
          asset_ids: missingUrls.map((f: MediaAsset) => f.asset_id),
        });
        console.warn('⚠️ Found', missingUrls.length, 'media assets without file_url');
      }
      
      setMediaFiles(result.data || []);
      setStats(result.stats || stats);
    } catch (error) {
      logger.error('Error loading media assets:', error);
      alert('Failed to load media assets. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm, selectedFilter]);

  useEffect(() => {
    loadMediaAssets();
  }, [loadMediaAssets]);

  // Debug media assets
  const handleDebugMedia = async () => {
    try {
      const response = await fetch('/api/media/debug', {
        method: 'GET',
      });

      const result = await response.json();

      let message = `🔍 Media Assets Debug:\n\n`;
      message += `User: ${result.user?.id}\n`;
      message += `Org ID: ${result.user?.orgId}\n\n`;
      message += `Assets in DB (Service Client): ${result.serviceClient?.count || 0}\n`;
      message += `  - With file_url: ${result.serviceClient?.withFileUrl || 0}\n`;
      message += `  - Without file_url: ${result.serviceClient?.withoutFileUrl || 0}\n`;
      message += `Assets Visible (User Client): ${result.userClient?.count || 0}\n`;
      message += `  - With file_url: ${result.userClient?.withFileUrl || 0}\n`;
      message += `  - Without file_url: ${result.userClient?.withoutFileUrl || 0}\n\n`;

      if (result.rlsIssue) {
        message += `⚠️ RLS ISSUE DETECTED!\n`;
        message += `Service client can see ${result.serviceClient?.count || 0} assets,\n`;
        message += `but user client can only see ${result.userClient?.count || 0} assets.\n\n`;
      }

      if (result.fileUrlIssue) {
        message += `⚠️ FILE_URL ISSUE DETECTED!\n`;
        message += `${result.userClient?.withoutFileUrl || 0} assets are missing file_url.\n\n`;
        if (result.userClient?.missingUrls && result.userClient.missingUrls.length > 0) {
          message += `Missing URLs:\n`;
          result.userClient.missingUrls.slice(0, 3).forEach((asset: any, idx: number) => {
            message += `${idx + 1}. ${asset.file_name} (${asset.file_type})\n`;
            if (asset.metadata?.public_id) {
              message += `   public_id: ${asset.metadata.public_id}\n`;
            }
            if (asset.metadata?.secure_url) {
              message += `   secure_url in metadata: YES\n`;
            }
          });
          message += `\n`;
        }
      }

      if (result.userClient?.error) {
        message += `❌ User Client Error:\n`;
        message += `${result.userClient.error.message}\n`;
        message += `Code: ${result.userClient.error.code}\n\n`;
      }

      if (result.serviceClient?.data && result.serviceClient.data.length > 0) {
        message += `Recent Assets:\n`;
        result.serviceClient.data.slice(0, 5).forEach((asset: any, idx: number) => {
          message += `${idx + 1}. ${asset.file_name} (${asset.file_type})\n`;
          message += `   file_url: ${asset.file_url ? asset.file_url.substring(0, 50) + '...' : 'MISSING'}\n`;
          message += `   created: ${asset.created_at}\n`;
        });
      }

      alert(message);
    } catch (error) {
      logger.error('Error debugging media:', error);
      alert(error instanceof Error ? error.message : 'Failed to debug media assets.');
    }
  };

  // Check Cloudinary root directory access
  const handleCheckRoot = async () => {
    setCheckingRoot(true);
    try {
      const response = await fetch('/api/integrations/cloudinary/check-root', {
        method: 'GET',
      });

      const result = await response.json();

      if (result.success) {
        let message = `✅ Cloudinary Root Directory Access:\n\n`;
        message += `Root Access: ${result.summary.rootAccess ? '✅ Yes' : '❌ No'}\n`;
        message += `Total Resources Found: ${result.summary.totalResourcesFound}\n\n`;
        
        if (result.checks && result.checks.length > 0) {
          message += `Location Checks:\n`;
          result.checks.forEach((check: any) => {
            message += `  • ${check.location}: ${check.success ? '✅' : '❌'}`;
            if (check.resourceCount !== undefined) {
              message += ` (${check.resourceCount} resources)`;
            }
            if (check.folders && check.folders.length > 0) {
              message += `\n    Folders: ${check.folders.join(', ')}`;
            }
            if (check.error) {
              message += ` - ${check.error}`;
            }
            message += `\n`;
          });
        }
        
        alert(message);
      } else {
        let message = `❌ Root Directory Access Failed:\n\n`;
        if (result.checks && result.checks.length > 0) {
          result.checks.forEach((check: any) => {
            message += `  • ${check.location}: ❌ Failed`;
            if (check.error) {
              message += ` - ${check.error}`;
            }
            message += `\n`;
          });
        }
        alert(message);
      }
    } catch (error) {
      logger.error('Error checking Cloudinary root:', error);
      alert(`Failed to check root directory: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setCheckingRoot(false);
    }
  };

  // Test Cloudinary credentials
  const handleTestCredentials = async () => {
    setTestingCredentials(true);
    try {
      const response = await fetch('/api/integrations/cloudinary/test-direct', {
        method: 'GET',
      });

      const result = await response.json();

      if (result.success) {
        const method = result.summary?.recommendedMethod || 'Unknown';
        const passedTests = result.summary?.passedTests || 0;
        const totalTests = result.summary?.totalTests || 0;
        
        let message = `✅ Cloudinary Credentials Test Results:\n\n`;
        message += `Status: Valid ✓\n`;
        message += `Working Method: ${method}\n`;
        message += `Tests Passed: ${passedTests}/${totalTests}\n\n`;
        
        if (result.tests && result.tests.length > 0) {
          message += `Test Details:\n`;
          result.tests.forEach((test: any) => {
            message += `  • ${test.method}: ${test.success ? '✅ Success' : '❌ Failed'}`;
            if (test.resourceCount !== undefined) {
              message += ` (${test.resourceCount} resources found)`;
            }
            if (test.error) {
              message += ` - ${test.error}`;
            }
            message += `\n`;
          });
        }
        
        alert(message);
      } else {
        let message = `❌ Cloudinary Credentials Test Failed:\n\n`;
        message += `All authentication methods failed.\n\n`;
        
        if (result.tests && result.tests.length > 0) {
          message += `Test Details:\n`;
          result.tests.forEach((test: any) => {
            message += `  • ${test.method}: ❌ Failed`;
            if (test.error) {
              message += ` - ${test.error}`;
            }
            message += `\n`;
          });
        }
        
        message += `\nPlease verify your credentials in Settings → Integrations → Cloudinary.`;
        alert(message);
      }
    } catch (error) {
      logger.error('Error testing Cloudinary credentials:', error);
      alert(`Failed to test Cloudinary credentials: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTestingCredentials(false);
    }
  };

  // Sync with Cloudinary
  const handleSyncCloudinary = async () => {
    setSyncing(true);
    try {
      // Sync from root (all images) by default, user can change this if needed
      const response = await fetch('/api/media/sync?root=true', {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Sync failed');
      }

      const result = await response.json();
      
      if (result.error && response.status === 404) {
        alert(`⚠️ ${result.error}\n\nNote: Images uploaded through this system will automatically appear in your media library.`);
      } else {
        alert(`✅ Sync completed!\n\nSynced: ${result.synced || 0}\nUpdated: ${result.updated || 0}\nSkipped: ${result.skipped || 0}\nTotal: ${result.total || 0}`);
      }
      
      // Reload media assets
      await loadMediaAssets();
    } catch (error) {
      logger.error('Error syncing Cloudinary:', error);
      alert(error instanceof Error ? error.message : 'Failed to sync with Cloudinary. Please try again.');
    } finally {
      setSyncing(false);
    }
  };

  // Handle file upload
  const handleFileUpload = async (files: FileList) => {
    const fileArray = Array.from(files);
    let successCount = 0;
    let failCount = 0;
    const errors: string[] = [];

    // Upload files one by one (Cloudinary API accepts one file per request)
    for (const file of fileArray) {
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

        successCount++;
        logger.debug('File uploaded successfully:', file.name);
      } catch (error) {
        failCount++;
        const errorMessage = error instanceof Error ? error.message : 'Upload failed';
        errors.push(`${file.name}: ${errorMessage}`);
        logger.error('Error uploading file:', { fileName: file.name, error: errorMessage });
      }
    }

    // Reload media assets after a short delay to ensure DB is updated
    setTimeout(async () => {
      await loadMediaAssets();
    }, 1000);

    // Show results
    if (successCount > 0 && failCount === 0) {
      alert(`✅ ${successCount} file${successCount > 1 ? 's' : ''} uploaded successfully!`);
    } else if (successCount > 0 && failCount > 0) {
      alert(`⚠️ ${successCount} file${successCount > 1 ? 's' : ''} uploaded, ${failCount} failed.\n\nErrors:\n${errors.join('\n')}`);
    } else {
      alert(`❌ Upload failed for all files.\n\nErrors:\n${errors.join('\n')}`);
    }
  };

  // Mock media data (for fallback/development)
  const mockMediaFiles = [
    {
      id: "1",
      name: "hero-image-blog.jpg",
      type: "image",
      size: "2.4 MB",
      uploaded: "2024-01-15T10:30:00Z",
      uploadedBy: "Sarah Johnson",
      tags: ["hero", "blog", "marketing"],
      dimensions: "1920x1080",
      url: "/images/cards/card-01.jpg",
      alt: "Hero image for blog post"
    },
    {
      id: "2",
      name: "product-screenshot.png",
      type: "image",
      size: "1.8 MB",
      uploaded: "2024-01-14T15:45:00Z",
      uploadedBy: "Mike Chen",
      tags: ["product", "screenshot", "ui"],
      dimensions: "1280x720",
      url: "/images/cards/card-02.jpg",
      alt: "Product screenshot"
    },
    {
      id: "3",
      name: "demo-video.mp4",
      type: "video",
      size: "45.2 MB",
      uploaded: "2024-01-13T09:20:00Z",
      uploadedBy: "Emma Davis",
      tags: ["demo", "video", "tutorial"],
      dimensions: "1920x1080",
      duration: "2:34",
      url: "/images/video-thumb/video-thumb.png"
    },
    {
      id: "4",
      name: "company-logo.svg",
      type: "image",
      size: "156 KB",
      uploaded: "2024-01-12T14:15:00Z",
      uploadedBy: "Alex Rodriguez",
      tags: ["logo", "brand", "vector"],
      dimensions: "500x200",
      url: "/images/logo/logo-01.svg",
      alt: "Company logo"
    },
    {
      id: "5",
      name: "background-music.mp3",
      type: "audio",
      size: "8.7 MB",
      uploaded: "2024-01-11T11:30:00Z",
      uploadedBy: "Sarah Johnson",
      tags: ["music", "background", "audio"],
      duration: "3:45",
      url: "/images/audio.svg"
    },
    {
      id: "6",
      name: "infographic-chart.png",
      type: "image",
      size: "3.1 MB",
      uploaded: "2024-01-10T16:20:00Z",
      uploadedBy: "Mike Chen",
      tags: ["infographic", "chart", "data"],
      dimensions: "1600x900",
      url: "/images/cards/card-03.jpg",
      alt: "Infographic chart"
    }
  ];

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case "image": return <PhotoIcon className="w-5 h-5" />;
      case "video": return <VideoCameraIcon className="w-5 h-5" />;
      case "audio": return <MusicalNoteIcon className="w-5 h-5" />;
      default: return <DocumentIcon className="w-5 h-5" />;
    }
  };

  const getFileTypeColor = (type: string) => {
    switch (type) {
      case "image": return "text-green-600 bg-green-100 dark:bg-green-900 dark:text-green-200";
      case "video": return "text-red-600 bg-red-100 dark:bg-red-900 dark:text-red-200";
      case "audio": return "text-purple-600 bg-purple-100 dark:bg-purple-900 dark:text-purple-200";
      default: return "text-gray-600 bg-gray-100 dark:bg-gray-900 dark:text-gray-200";
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  };

  const getFileType = (fileType: string): string => {
    if (fileType.startsWith('image/')) return 'image';
    if (fileType.startsWith('video/')) return 'video';
    if (fileType.startsWith('audio/')) return 'audio';
    return 'document';
  };

  const filteredMedia = mediaFiles.filter(file => {
    const fileType = getFileType(file.file_type);
    const matchesSearch = file.file_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (file.metadata?.tags && Array.isArray(file.metadata.tags) && 
                          file.metadata.tags.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase())));
    
    const matchesFilter = selectedFilter === "all" || fileType === selectedFilter;
    
    return matchesSearch && matchesFilter;
  });

  const handleSelectMedia = (mediaId: string) => {
    setSelectedMedia(prev => 
      prev.includes(mediaId) 
        ? prev.filter(id => id !== mediaId)
        : [...prev, mediaId]
    );
  };

  const handleSelectAll = () => {
    setSelectedMedia(
      selectedMedia.length === filteredMedia.length 
        ? [] 
        : filteredMedia.map(file => file.asset_id)
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              Media Library
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-2">
              Upload, organize, and manage your media assets for your blog content
            </p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={handleDebugMedia}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              title="Debug media assets visibility"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Debug Media</span>
            </button>
            <button
              onClick={handleCheckRoot}
              disabled={checkingRoot}
              className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              title="Check Cloudinary root directory access"
            >
              {checkingRoot ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Checking...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
                  </svg>
                  <span>Check Root</span>
                </>
              )}
            </button>
            <button
              onClick={handleTestCredentials}
              disabled={testingCredentials}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              title="Test Cloudinary credentials"
            >
              {testingCredentials ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Testing...</span>
                </>
              ) : (
                <>
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Test Credentials</span>
                </>
              )}
            </button>
            <button
              onClick={handleSyncCloudinary}
              disabled={syncing}
              className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
            >
              {syncing ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Syncing...</span>
                </>
              ) : (
                <>
                  <ArrowPathIcon className="w-5 h-5" />
                  <span>Sync with Cloudinary</span>
                </>
              )}
            </button>
            <label className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors cursor-pointer">
              <PlusIcon className="w-5 h-5" />
              Upload Media
              <input
                type="file"
                multiple
                accept="image/*,video/*,audio/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleFileUpload(e.target.files);
                  }
                }}
                className="hidden"
              />
            </label>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Files</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loading ? '...' : stats.total.toLocaleString()}
              </p>
            </div>
            <DocumentIcon className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Images</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loading ? '...' : stats.images.toLocaleString()}
              </p>
            </div>
            <PhotoIcon className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Videos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loading ? '...' : stats.videos.toLocaleString()}
              </p>
            </div>
            <VideoCameraIcon className="w-8 h-8 text-red-600" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Storage Used</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {loading ? '...' : stats.storageUsed}
              </p>
            </div>
            <CloudArrowUpIcon className="w-8 h-8 text-purple-600" />
          </div>
        </div>
      </div>

      {/* Search and Filter Bar */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 mb-6">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search media by name or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <FunnelIcon className="w-5 h-5 text-gray-400" />
              <select
                value={selectedFilter}
                onChange={(e) => setSelectedFilter(e.target.value)}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Types</option>
                <option value="image">Images</option>
                <option value="video">Videos</option>
                <option value="audio">Audio</option>
                <option value="document">Documents</option>
              </select>
            </div>
            
            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-2 rounded-lg ${viewMode === "grid" ? "bg-blue-100 text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-2 rounded-lg ${viewMode === "list" ? "bg-blue-100 text-blue-600" : "text-gray-400 hover:text-gray-600"}`}
              >
                <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Upload Drop Zone */}
      <div
        className={`border-2 border-dashed rounded-xl p-8 mb-6 transition-colors ${
          dragOver 
            ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20" 
            : "border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500"
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFileUpload(e.dataTransfer.files);
          }
        }}
      >
        <div className="text-center">
          <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Drag and drop files here
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            or click to browse files from your computer
          </p>
          <label className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors cursor-pointer">
            Choose Files
            <input
              type="file"
              multiple
              accept="image/*,video/*,audio/*"
              onChange={(e) => {
                if (e.target.files && e.target.files.length > 0) {
                  handleFileUpload(e.target.files);
                }
              }}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Media Grid/List */}
      {!loading && viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          {filteredMedia.map((file) => {
            const fileType = getFileType(file.file_type);
            const dimensions = file.metadata?.width && file.metadata?.height 
              ? `${file.metadata.width}x${file.metadata.height}` 
              : null;
            const tags = file.metadata?.tags || [];
            
            return (
              <div
                key={file.asset_id}
                className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                  selectedMedia.includes(file.asset_id) ? "ring-2 ring-blue-500" : ""
                }`}
                onClick={() => handleSelectMedia(file.asset_id)}
              >
                <div className="aspect-square relative bg-gray-100 dark:bg-gray-700">
                  {fileType === "image" && file.file_url ? (
                    <>
                      <img
                        src={file.file_url}
                        alt={file.file_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          logger.error('Image failed to load:', {
                            file_url: file.file_url,
                            file_name: file.file_name,
                            asset_id: file.asset_id,
                            file_type: file.file_type,
                          });
                          // Show error overlay
                          const errorDiv = document.createElement('div');
                          errorDiv.className = 'absolute inset-0 bg-red-100 dark:bg-red-900 flex items-center justify-center text-red-600 dark:text-red-300 text-xs p-2';
                          errorDiv.textContent = 'Failed to load';
                          e.currentTarget.parentElement?.appendChild(errorDiv);
                          e.currentTarget.style.display = 'none';
                        }}
                        onLoad={() => {
                          logger.debug('Image loaded successfully:', {
                            file_url: file.file_url?.substring(0, 50) + '...',
                            file_name: file.file_name,
                          });
                        }}
                      />
                      {/* Debug info - remove in production */}
                      {process.env.NODE_ENV === 'development' && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs p-1 truncate">
                          {file.file_url?.substring(0, 40)}...
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      {getFileTypeIcon(fileType)}
                    </div>
                  )}
                  {fileType === "image" && !file.file_url && (
                    <div className="w-full h-full flex items-center justify-center text-red-500">
                      <div className="text-center">
                        <span className="text-xs block">No URL</span>
                        <span className="text-xs block text-gray-400">{file.file_type}</span>
                      </div>
                    </div>
                  )}
                  
                  <div className="absolute top-2 left-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getFileTypeColor(fileType)}`}>
                      {getFileTypeIcon(fileType)}
                    </span>
                  </div>
                  
                  <div className="absolute top-2 right-2">
                    <input
                      type="checkbox"
                      checked={selectedMedia.includes(file.asset_id)}
                      onChange={(e) => {
                        e.stopPropagation();
                        handleSelectMedia(file.asset_id);
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </div>
                </div>
                
                <div className="p-3">
                  <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {file.file_name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {formatFileSize(file.file_size)}
                    {dimensions && ` • ${dimensions}`}
                  </p>
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {tags.slice(0, 2).map((tag: string, index: number) => (
                        <span
                          key={index}
                          className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                        >
                          {tag}
                        </span>
                      ))}
                      {tags.length > 2 && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          +{tags.length - 2}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : !loading ? (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedMedia.length === filteredMedia.length && filteredMedia.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    File
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Uploaded
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Tags
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredMedia.map((file) => {
                  const fileType = getFileType(file.file_type);
                  const tags = file.metadata?.tags || [];
                  
                  return (
                    <tr key={file.asset_id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedMedia.includes(file.asset_id)}
                          onChange={() => handleSelectMedia(file.asset_id)}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {fileType === "image" && file.file_url ? (
                              <img
                                src={file.file_url}
                                alt={file.file_name}
                                className="h-10 w-10 rounded-lg object-cover"
                                onError={(e) => {
                                  logger.error('Image failed to load in list view:', {
                                    file_url: file.file_url,
                                    file_name: file.file_name,
                                    asset_id: file.asset_id,
                                  });
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${getFileTypeColor(fileType)}`}>
                                {getFileTypeIcon(fileType)}
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900 dark:text-white">
                              {file.file_name}
                            </div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {file.uploaded_by || 'System'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getFileTypeColor(fileType)}`}>
                          {getFileTypeIcon(fileType)}
                          <span className="ml-1">{fileType}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {formatFileSize(file.file_size)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                        {formatDate(file.created_at)}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {tags.slice(0, 3).map((tag: string, index: number) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                            >
                              {tag}
                            </span>
                          ))}
                          {tags.length > 3 && (
                            <span className="text-xs text-gray-500 dark:text-gray-400">
                              +{tags.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => window.open(file.file_url, '_blank')}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                          >
                            <EyeIcon className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              navigator.clipboard.writeText(file.file_url);
                              alert('Image URL copied to clipboard!');
                            }}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                          >
                            <ShareIcon className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => {
                              const link = document.createElement('a');
                              link.href = file.file_url;
                              link.download = file.file_name;
                              link.click();
                            }}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1"
                          >
                            <DocumentArrowDownIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Bulk Actions */}
      {selectedMedia.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl px-6 py-3 mt-6">
          <div className="flex items-center justify-between">
            <span className="text-sm text-blue-800 dark:text-blue-200">
              {selectedMedia.length} file{selectedMedia.length !== 1 ? 's' : ''} selected
            </span>
            <div className="flex gap-2">
              <button className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium">
                Add Tags
              </button>
              <button className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium">
                Download
              </button>
              <button className="text-sm text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 font-medium">
                Move to Folder
              </button>
              <button className="text-sm text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-200 font-medium">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {filteredMedia.length === 0 && (
        <div className="text-center py-12">
          <PhotoIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No media found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {searchTerm || selectedFilter !== "all" 
              ? "Try adjusting your search or filter criteria."
              : "Get started by uploading your first media file."
            }
          </p>
          {(!searchTerm && selectedFilter === "all") && (
            <div className="mt-6">
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto transition-colors">
                <CloudArrowUpIcon className="w-5 h-5" />
                Upload Media
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

