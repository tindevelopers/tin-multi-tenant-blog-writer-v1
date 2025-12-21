"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Globe, 
  Search, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  ArrowRight,
  Zap,
  FileText,
  Link2,
  Image as ImageIcon,
  Code2,
  TrendingUp
} from "lucide-react";

interface BlogPost {
  post_id: string;
  title: string;
  slug: string;
  status: string;
  seo_score?: number;
  seo_title?: string;
  seo_description?: string;
  schema_markup?: string;
  published_at?: string;
  webflow_item_id?: string;
}

interface SEOAnalysis {
  score: number;
  issues: string[];
  recommendations: string[];
  metaTags: {
    title: string;
    description: string;
    ogTitle: string;
    ogDescription: string;
  };
  schemaMarkup?: object;
}

export default function WebflowSEOPage() {
  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<BlogPost | null>(null);
  const [analysis, setAnalysis] = useState<SEOAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadPublishedPosts();
  }, []);

  const loadPublishedPosts = async () => {
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
        .select("post_id, title, slug, status, seo_score, seo_title, seo_description, schema_markup, published_at, webflow_item_id")
        .eq("org_id", profile.org_id)
        .in("status", ["published", "pending_publish"])
        .order("published_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setPosts(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const analyzePost = async (post: BlogPost) => {
    try {
      setAnalyzing(post.post_id);
      setSelectedPost(post);
      
      // Simulate SEO analysis (in production, this would call the AI Gateway)
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockAnalysis: SEOAnalysis = {
        score: Math.floor(Math.random() * 30) + 70,
        issues: [
          post.seo_title ? "" : "Missing SEO title",
          post.seo_description ? "" : "Missing meta description",
          post.schema_markup ? "" : "No structured data (Schema.org)",
          "Consider adding more internal links",
        ].filter(Boolean),
        recommendations: [
          "Add a compelling meta description (150-160 characters)",
          "Include target keyword in the first paragraph",
          "Add FAQ schema for better SERP visibility",
          "Optimize images with descriptive alt text",
          "Add internal links to related content",
        ],
        metaTags: {
          title: post.seo_title || `${post.title} | Your Brand`,
          description: post.seo_description || "Add a compelling description to improve click-through rates from search results.",
          ogTitle: post.seo_title || post.title,
          ogDescription: post.seo_description || "",
        },
        schemaMarkup: {
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": post.title,
          "datePublished": post.published_at,
          "author": {
            "@type": "Organization",
            "name": "Your Brand"
          }
        }
      };
      
      setAnalysis(mockAnalysis);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAnalyzing(null);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600 bg-green-100";
    if (score >= 60) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 80) return "Good";
    if (score >= 60) return "Needs Work";
    return "Poor";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Globe className="w-7 h-7 text-blue-600" />
            Webflow SEO Optimization
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Analyze and optimize your Webflow blog posts for better search engine rankings
          </p>
        </div>
        <button
          onClick={loadPublishedPosts}
          className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Posts
        </button>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Posts List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Published Posts ({posts.length})
            </h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
              <p className="mt-2 text-gray-600 dark:text-gray-400">Loading posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="p-8 text-center">
              <Globe className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="mt-2 text-gray-600 dark:text-gray-400">No published posts found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[600px] overflow-y-auto">
              {posts.map((post) => (
                <div
                  key={post.post_id}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${
                    selectedPost?.post_id === post.post_id ? "bg-blue-50 dark:bg-blue-900/20" : ""
                  }`}
                  onClick={() => analyzePost(post)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {post.title}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        /{post.slug}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {post.seo_score && (
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getScoreColor(post.seo_score)}`}>
                          {post.seo_score}%
                        </span>
                      )}
                      {analyzing === post.post_id ? (
                        <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                      ) : (
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Analysis Panel */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5" />
              SEO Analysis
            </h2>
          </div>
          
          {!selectedPost ? (
            <div className="p-8 text-center">
              <Search className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Select a post to analyze its SEO
              </p>
            </div>
          ) : analyzing ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
              <p className="mt-2 text-gray-600 dark:text-gray-400">Analyzing SEO...</p>
            </div>
          ) : analysis ? (
            <div className="p-4 space-y-6 max-h-[600px] overflow-y-auto">
              {/* Score */}
              <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full text-2xl font-bold ${getScoreColor(analysis.score)}`}>
                  {analysis.score}
                </div>
                <p className="mt-2 font-medium text-gray-900 dark:text-white">
                  {getScoreLabel(analysis.score)}
                </p>
              </div>

              {/* Issues */}
              {analysis.issues.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    Issues Found ({analysis.issues.length})
                  </h3>
                  <ul className="space-y-2">
                    {analysis.issues.map((issue, i) => (
                      <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                        <span className="text-yellow-600">•</span>
                        {issue}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Recommendations */}
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  Recommendations
                </h3>
                <ul className="space-y-2">
                  {analysis.recommendations.map((rec, i) => (
                    <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Meta Tags Preview */}
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <Code2 className="w-4 h-4 text-blue-600" />
                  Meta Tags
                </h3>
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-2 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Title:</span>
                    <p className="text-gray-900 dark:text-white">{analysis.metaTags.title}</p>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Description:</span>
                    <p className="text-gray-900 dark:text-white">{analysis.metaTags.description}</p>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  <Zap className="w-4 h-4" />
                  Generate Meta Tags
                </button>
                <button className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                  <Code2 className="w-4 h-4" />
                  Add Schema
                </button>
                <button className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                  <Link2 className="w-4 h-4" />
                  Add Links
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* SEO Tips Card */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl p-6 text-white">
        <h3 className="text-lg font-semibold mb-2">Webflow SEO Best Practices</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-medium">Meta Tags</h4>
              <p className="text-sm text-blue-100">Unique title and description for every page</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Code2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-medium">Schema Markup</h4>
              <p className="text-sm text-blue-100">Article, FAQ, and HowTo schemas</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-medium">Image Optimization</h4>
              <p className="text-sm text-blue-100">Alt text and lazy loading for all images</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
