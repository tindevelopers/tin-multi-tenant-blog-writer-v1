"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Image as ImageIcon, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  Sparkles,
  Copy,
  Eye,
  FileText,
  Zap,
  Search
} from "lucide-react";

interface ImageData {
  id: string;
  src: string;
  alt: string;
  postTitle: string;
  postId: string;
  hasAlt: boolean;
  suggestedAlt?: string;
}

interface ContentWithImages {
  id: string;
  title: string;
  content: string;
  images: ImageData[];
}

export default function ImageAltTextPage() {
  const [posts, setPosts] = useState<ContentWithImages[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<ContentWithImages | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    loadPostsWithImages();
  }, []);

  const extractImages = (content: string, postId: string, postTitle: string): ImageData[] => {
    const images: ImageData[] = [];
    const imgRegex = /<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/gi;
    const imgRegex2 = /<img[^>]+src="([^"]+)"[^>]*>/gi;
    
    let match;
    let id = 0;
    
    // First pass: images with alt attribute
    while ((match = imgRegex.exec(content)) !== null) {
      images.push({
        id: `${postId}-img-${id++}`,
        src: match[1],
        alt: match[2],
        postTitle,
        postId,
        hasAlt: match[2].length > 0,
      });
    }
    
    // Second pass: images that might not have been captured
    const allImgMatches = content.match(imgRegex2) || [];
    for (const imgTag of allImgMatches) {
      const srcMatch = imgTag.match(/src="([^"]+)"/);
      const altMatch = imgTag.match(/alt="([^"]*)"/);
      
      if (srcMatch) {
        const src = srcMatch[1];
        // Check if already added
        if (!images.find(img => img.src === src)) {
          images.push({
            id: `${postId}-img-${id++}`,
            src,
            alt: altMatch ? altMatch[1] : "",
            postTitle,
            postId,
            hasAlt: altMatch ? altMatch[1].length > 0 : false,
          });
        }
      }
    }
    
    // Also check for markdown images
    const mdImgRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
    while ((match = mdImgRegex.exec(content)) !== null) {
      const src = match[2];
      if (!images.find(img => img.src === src)) {
        images.push({
          id: `${postId}-img-${id++}`,
          src,
          alt: match[1],
          postTitle,
          postId,
          hasAlt: match[1].length > 0,
        });
      }
    }
    
    return images;
  };

  const loadPostsWithImages = async () => {
    try {
      setLoading(true);
      const supabase = createClient();
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("users")
        .select("org_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.org_id) return;

      const { data, error } = await supabase
        .from("blog_posts")
        .select("id, title, content")
        .eq("org_id", profile.org_id)
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;

      const postsWithImages = (data || [])
        .map(post => ({
          id: post.id,
          title: post.title || "Untitled",
          content: post.content || "",
          images: extractImages(post.content || "", post.id, post.title || "Untitled"),
        }))
        .filter(post => post.images.length > 0);

      setPosts(postsWithImages);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const generateAltText = async (image: ImageData) => {
    try {
      setGenerating(image.id);
      
      // Simulate AI generation (in production, this would call the AI Gateway)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // Generate contextual alt text based on the image URL and context
      const filename = image.src.split("/").pop() || "";
      const cleanName = filename
        .replace(/[-_]/g, " ")
        .replace(/\.[^.]+$/, "")
        .replace(/\d+/g, "")
        .trim();
      
      const suggestedAlt = cleanName
        ? `${cleanName} - illustration for ${image.postTitle}`
        : `Illustration supporting the article "${image.postTitle}"`;
      
      // Update the image with suggested alt
      setPosts(posts.map(post => ({
        ...post,
        images: post.images.map(img => 
          img.id === image.id 
            ? { ...img, suggestedAlt } 
            : img
        ),
      })));
      
      if (selectedPost) {
        setSelectedPost({
          ...selectedPost,
          images: selectedPost.images.map(img =>
            img.id === image.id
              ? { ...img, suggestedAlt }
              : img
          ),
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setGenerating(null);
    }
  };

  const generateAllAltText = async () => {
    if (!selectedPost) return;
    
    for (const image of selectedPost.images) {
      if (!image.hasAlt && !image.suggestedAlt) {
        await generateAltText(image);
      }
    }
  };

  const copyAltText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  const getMissingAltCount = (post: ContentWithImages) => {
    return post.images.filter(img => !img.hasAlt).length;
  };

  const getTotalMissingAlt = () => {
    return posts.reduce((count, post) => count + getMissingAltCount(post), 0);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <ImageIcon className="w-7 h-7 text-green-600" />
            Image Alt Text Optimizer
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Scan content for missing alt text and generate AI-powered suggestions
          </p>
        </div>
        <button
          onClick={loadPostsWithImages}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Posts with Images</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{posts.length}</p>
            </div>
            <div className="p-3 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Images</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {posts.reduce((sum, post) => sum + post.images.length, 0)}
              </p>
            </div>
            <div className="p-3 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <ImageIcon className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600 dark:text-gray-400">Missing Alt Text</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{getTotalMissingAlt()}</p>
            </div>
            <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Posts List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Content with Images
            </h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
              <p className="mt-2 text-gray-600 dark:text-gray-400">Scanning content...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="p-8 text-center">
              <ImageIcon className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="mt-2 text-gray-600 dark:text-gray-400">No images found in content</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[500px] overflow-y-auto">
              {posts.map((post) => (
                <div
                  key={post.id}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${
                    selectedPost?.id === post.id ? "bg-green-50 dark:bg-green-900/20" : ""
                  }`}
                  onClick={() => setSelectedPost(post)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {post.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {post.images.length} images
                        </span>
                        {getMissingAltCount(post) > 0 && (
                          <span className="flex items-center gap-1 text-sm text-yellow-600">
                            <AlertTriangle className="w-3 h-3" />
                            {getMissingAltCount(post)} missing alt
                          </span>
                        )}
                      </div>
                    </div>
                    {getMissingAltCount(post) === 0 ? (
                      <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-yellow-600" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Images Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <ImageIcon className="w-5 h-5" />
              Images
            </h2>
            {selectedPost && getMissingAltCount(selectedPost) > 0 && (
              <button
                onClick={generateAllAltText}
                className="flex items-center gap-2 px-3 py-1.5 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700"
              >
                <Sparkles className="w-4 h-4" />
                Generate All
              </button>
            )}
          </div>
          
          {!selectedPost ? (
            <div className="p-8 text-center">
              <Search className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Select a post to view its images
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-4 max-h-[500px] overflow-y-auto">
              {selectedPost.images.map((image) => (
                <div
                  key={image.id}
                  className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg space-y-3"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-20 h-20 bg-gray-200 dark:bg-gray-600 rounded-lg overflow-hidden flex-shrink-0">
                      <img
                        src={image.src}
                        alt={image.alt || "Preview"}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect fill='%23f3f4f6' width='80' height='80'/%3E%3Ctext fill='%239ca3af' font-family='sans-serif' font-size='10' x='50%25' y='50%25' text-anchor='middle' dy='.3em'%3ENo preview%3C/text%3E%3C/svg%3E";
                        }}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate mb-2">
                        {image.src.split("/").pop()}
                      </p>
                      
                      {image.hasAlt ? (
                        <div className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                          <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                              Current alt text:
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              "{image.alt}"
                            </p>
                          </div>
                        </div>
                      ) : image.suggestedAlt ? (
                        <div className="space-y-2">
                          <div className="flex items-start gap-2">
                            <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
                            <div>
                              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Suggested alt text:
                              </p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">
                                "{image.suggestedAlt}"
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => copyAltText(image.suggestedAlt || "", image.id)}
                            className={`flex items-center gap-1 px-2 py-1 text-xs rounded ${
                              copied === image.id
                                ? "bg-green-100 text-green-700"
                                : "bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500"
                            }`}
                          >
                            {copied === image.id ? (
                              <>
                                <CheckCircle className="w-3 h-3" />
                                Copied!
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3" />
                                Copy
                              </>
                            )}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4 text-yellow-600" />
                          <span className="text-sm text-yellow-600">Missing alt text</span>
                          <button
                            onClick={() => generateAltText(image)}
                            disabled={generating === image.id}
                            className="flex items-center gap-1 px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 disabled:opacity-50"
                          >
                            {generating === image.id ? (
                              <RefreshCw className="w-3 h-3 animate-spin" />
                            ) : (
                              <Sparkles className="w-3 h-3" />
                            )}
                            Generate
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Accessibility Info */}
      <div className="bg-gradient-to-r from-green-600 to-teal-600 rounded-xl p-6 text-white">
        <h3 className="text-lg font-semibold mb-2">Why Alt Text Matters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-4">
          <div>
            <h4 className="font-medium mb-2">Accessibility</h4>
            <p className="text-sm text-green-100">
              Screen readers use alt text to describe images to visually impaired users.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">SEO Benefits</h4>
            <p className="text-sm text-green-100">
              Search engines use alt text to understand and index your images.
            </p>
          </div>
          <div>
            <h4 className="font-medium mb-2">Fallback Display</h4>
            <p className="text-sm text-green-100">
              Alt text displays when images fail to load, maintaining context.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
