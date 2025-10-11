"use client";

import { useState } from "react";
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
  DocumentArrowDownIcon
} from "@heroicons/react/24/outline";

export default function MediaPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilter, setSelectedFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedMedia, setSelectedMedia] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);

  // Mock media data
  const mediaFiles = [
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

  const filteredMedia = mediaFiles.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = selectedFilter === "all" || file.type === selectedFilter;
    
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
        : filteredMedia.map(file => file.id)
    );
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    // Handle file drop logic here
    console.log("Files dropped:", e.dataTransfer.files);
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
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors">
            <PlusIcon className="w-5 h-5" />
            Upload Media
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Files</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">1,247</p>
            </div>
            <DocumentIcon className="w-8 h-8 text-blue-600" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Images</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">892</p>
            </div>
            <PhotoIcon className="w-8 h-8 text-green-600" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Videos</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">156</p>
            </div>
            <VideoCameraIcon className="w-8 h-8 text-red-600" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Storage Used</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">2.4 GB</p>
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
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        <div className="text-center">
          <CloudArrowUpIcon className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
            Drag and drop files here
          </h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            or click to browse files from your computer
          </p>
          <button className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors">
            Choose Files
          </button>
        </div>
      </div>

      {/* Media Grid/List */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-6">
          {filteredMedia.map((file) => (
            <div
              key={file.id}
              className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer transition-all hover:shadow-md ${
                selectedMedia.includes(file.id) ? "ring-2 ring-blue-500" : ""
              }`}
              onClick={() => handleSelectMedia(file.id)}
            >
              <div className="aspect-square relative bg-gray-100 dark:bg-gray-700">
                {file.type === "image" ? (
                  <img
                    src={file.url}
                    alt={file.alt}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {getFileTypeIcon(file.type)}
                  </div>
                )}
                
                <div className="absolute top-2 left-2">
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getFileTypeColor(file.type)}`}>
                    {getFileTypeIcon(file.type)}
                  </span>
                </div>
                
                <div className="absolute top-2 right-2">
                  <input
                    type="checkbox"
                    checked={selectedMedia.includes(file.id)}
                    onChange={(e) => {
                      e.stopPropagation();
                      handleSelectMedia(file.id);
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </div>
              </div>
              
              <div className="p-3">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {file.name}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  {file.size}
                  {file.dimensions && ` • ${file.dimensions}`}
                  {file.duration && ` • ${file.duration}`}
                </p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {file.tags.slice(0, 2).map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                    >
                      {tag}
                    </span>
                  ))}
                  {file.tags.length > 2 && (
                    <span className="text-xs text-gray-500 dark:text-gray-400">
                      +{file.tags.length - 2}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
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
                {filteredMedia.map((file) => (
                  <tr key={file.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedMedia.includes(file.id)}
                        onChange={() => handleSelectMedia(file.id)}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <div className="flex-shrink-0 h-10 w-10">
                          {file.type === "image" ? (
                            <img
                              src={file.url}
                              alt={file.alt}
                              className="h-10 w-10 rounded-lg object-cover"
                            />
                          ) : (
                            <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${getFileTypeColor(file.type)}`}>
                              {getFileTypeIcon(file.type)}
                            </div>
                          )}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {file.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {file.uploadedBy}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getFileTypeColor(file.type)}`}>
                        {getFileTypeIcon(file.type)}
                        <span className="ml-1">{file.type}</span>
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {file.size}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {formatDate(file.uploaded)}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap gap-1">
                        {file.tags.slice(0, 3).map((tag, index) => (
                          <span
                            key={index}
                            className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200"
                          >
                            {tag}
                          </span>
                        ))}
                        {file.tags.length > 3 && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            +{file.tags.length - 3}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1">
                          <EyeIcon className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1">
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1">
                          <DocumentArrowDownIcon className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 p-1">
                          <ShareIcon className="w-4 h-4" />
                        </button>
                        <button className="text-gray-400 hover:text-red-600 p-1">
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

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
