"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  FileText, 
  Search, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  ArrowRight,
  Zap,
  Link2,
  Image as ImageIcon,
  Code2,
  TrendingUp,
  ExternalLink,
  Settings
} from "lucide-react";

interface WordPressPost {
  post_id: string;
  title: string;
  slug: string;
  status: string;
  seo_score?: number;
  seo_title?: string;
  seo_description?: string;
  published_at?: string;
  wordpress_id?: string;
}

interface SEOAnalysis {
  score: number;
  yoastCompatible: boolean;
  rankMathCompatible: boolean;
  issues: string[];
  recommendations: string[];
  focusKeyword?: string;
  readabilityScore?: number;
}

export default function WordPressSEOPage() {
  const [posts, setPosts] = useState<WordPressPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [selectedPost, setSelectedPost] = useState<WordPressPost | null>(null);
  const [analysis, setAnalysis] = useState<SEOAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [wordpressConnected, setWordpressConnected] = useState(false);

  useEffect(() => {
    checkWordPressConnection();
    loadPublishedPosts();
  }, []);

  const checkWordPressConnection = async () => {
    // Check if WordPress integration is configured
    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("users")
        .select("org_id")
        .eq("user_id", user.id)
        .single();

      if (!profile?.org_id) return;

      // Check for WordPress integration
      const { data: integrations } = await supabase
        .from("integrations_dev")
        .select("*")
        .eq("org_id", profile.org_id)
        .eq("provider", "wordpress")
        .eq("status", "active");

      setWordpressConnected(!!(integrations && integrations.length > 0));
    } catch (err) {
      console.warn("Failed to check WordPress connection", err);
    }
  };

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
        .select("post_id, title, slug, status, seo_score, seo_title, seo_description, published_at")
        .eq("org_id", profile.org_id)
        .in("status", ["published", "pending_publish", "draft"])
        .order("created_at", { ascending: false })
        .limit(50);

      if (error) throw error;
      setPosts(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const analyzePost = async (post: WordPressPost) => {
    try {
      setAnalyzing(post.post_id);
      setSelectedPost(post);
      
      // Simulate SEO analysis
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const mockAnalysis: SEOAnalysis = {
        score: Math.floor(Math.random() * 30) + 70,
        yoastCompatible: true,
        rankMathCompatible: true,
        readabilityScore: Math.floor(Math.random() * 20) + 60,
        focusKeyword: post.title.split(" ").slice(0, 2).join(" ").toLowerCase(),
        issues: [
          post.seo_title ? "" : "Missing SEO title (Yoast/RankMath)",
          post.seo_description ? "" : "Missing meta description",
          "Focus keyword not in first paragraph",
          "Subheadings don't contain focus keyword",
        ].filter(Boolean),
        recommendations: [
          "Add focus keyword to the SEO title",
          "Use focus keyword in the first 100 words",
          "Add at least one internal link",
          "Optimize image alt attributes",
          "Ensure meta description is 150-160 characters",
          "Add transition words for better readability",
        ],
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-600" />
            WordPress SEO Optimization
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            Optimize your content for Yoast SEO and RankMath compatibility
          </p>
        </div>
        <div className="flex items-center gap-3">
          {wordpressConnected ? (
            <span className="flex items-center gap-2 px-3 py-1.5 bg-green-100 text-green-700 rounded-full text-sm">
              <CheckCircle className="w-4 h-4" />
              WordPress Connected
            </span>
          ) : (
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
              <Settings className="w-4 h-4" />
              Connect WordPress
            </button>
          )}
          <button
            onClick={loadPublishedPosts}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
          <p className="text-red-700 dark:text-red-400">{error}</p>
        </div>
      )}

      {/* Plugin Compatibility */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">Yoast SEO Compatible</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Export optimized meta tags</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <CheckCircle className="w-6 h-6 text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white">RankMath Compatible</h3>
              <p className="text-sm text-gray-600 dark:text-gray-400">Focus keyword analysis</p>
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
              Content ({posts.length})
            </h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
              <p className="mt-2 text-gray-600 dark:text-gray-400">Loading posts...</p>
            </div>
          ) : posts.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="mt-2 text-gray-600 dark:text-gray-400">No posts found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[500px] overflow-y-auto">
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
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          post.status === "published" 
                            ? "bg-green-100 text-green-700" 
                            : "bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300"
                        }`}>
                          {post.status}
                        </span>
                      </div>
                    </div>
                    {analyzing === post.post_id ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                    ) : (
                      <ArrowRight className="w-4 h-4 text-gray-400" />
                    )}
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
                Select a post to analyze
              </p>
            </div>
          ) : analyzing ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-blue-600 mx-auto" />
              <p className="mt-2 text-gray-600 dark:text-gray-400">Analyzing...</p>
            </div>
          ) : analysis ? (
            <div className="p-4 space-y-6 max-h-[500px] overflow-y-auto">
              {/* Scores */}
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full text-xl font-bold ${getScoreColor(analysis.score)}`}>
                    {analysis.score}
                  </div>
                  <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">SEO Score</p>
                </div>
                <div className="text-center p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className={`inline-flex items-center justify-center w-16 h-16 rounded-full text-xl font-bold ${getScoreColor(analysis.readabilityScore || 0)}`}>
                    {analysis.readabilityScore}
                  </div>
                  <p className="mt-2 text-sm font-medium text-gray-700 dark:text-gray-300">Readability</p>
                </div>
              </div>

              {/* Focus Keyword */}
              {analysis.focusKeyword && (
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                  <p className="text-sm text-blue-700 dark:text-blue-300">
                    <span className="font-medium">Focus Keyword:</span> {analysis.focusKeyword}
                  </p>
                </div>
              )}

              {/* Issues */}
              {analysis.issues.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    Issues ({analysis.issues.length})
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

              {/* Export Options */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button className="flex items-center gap-2 px-3 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700">
                  <ExternalLink className="w-4 h-4" />
                  Export to Yoast
                </button>
                <button className="flex items-center gap-2 px-3 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                  <ExternalLink className="w-4 h-4" />
                  Export to RankMath
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* WordPress SEO Tips */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl p-6 text-white">
        <h3 className="text-lg font-semibold mb-2">WordPress SEO Best Practices</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Search className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-medium">Focus Keyword</h4>
              <p className="text-sm text-blue-100">Use in title, URL, and first paragraph</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-medium">Internal Links</h4>
              <p className="text-sm text-blue-100">Link to related content on your site</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="p-2 bg-white/10 rounded-lg">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-medium">Alt Text</h4>
              <p className="text-sm text-blue-100">Describe images for accessibility</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
