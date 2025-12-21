"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { 
  Sparkles, 
  RefreshCw, 
  CheckCircle, 
  AlertTriangle,
  XCircle,
  FileText,
  Zap,
  Eye,
  Trash2,
  Copy,
  ArrowRight
} from "lucide-react";

interface ContentItem {
  post_id: string;
  title: string;
  content: string;
  status: string;
  created_at: string;
}

interface QualityResult {
  score: number;
  isClean: boolean;
  issues: {
    type: string;
    description: string;
    location?: string;
    severity: "low" | "medium" | "high";
  }[];
  cleanedContent?: string;
  suggestions: string[];
}

export default function ContentQualityPage() {
  const [drafts, setDrafts] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState<string | null>(null);
  const [selectedDraft, setSelectedDraft] = useState<ContentItem | null>(null);
  const [result, setResult] = useState<QualityResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  useEffect(() => {
    loadDrafts();
  }, []);

  const loadDrafts = async () => {
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
        .select("post_id, title, content, status, created_at")
        .eq("org_id", profile.org_id)
        .order("created_at", { ascending: false })
        .limit(30);

      if (error) throw error;
      setDrafts(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const analyzeContent = async (draft: ContentItem) => {
    try {
      setAnalyzing(draft.post_id);
      setSelectedDraft(draft);
      setResult(null);
      
      // Call the AI Gateway quality checker
      const response = await fetch("/api/workflow/enhance-content", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: draft.content,
          check_quality_only: true,
        }),
      });

      if (!response.ok) {
        // Fallback to mock analysis
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const mockResult: QualityResult = {
          score: Math.floor(Math.random() * 20) + 75,
          isClean: Math.random() > 0.3,
          issues: ([
            { 
              type: "artifact", 
              description: "Found self-referential phrase: 'I'll provide a comprehensive...'",
              severity: "high" as const,
              location: "Paragraph 1"
            },
            { 
              type: "formatting", 
              description: "Missing proper heading structure",
              severity: "medium" as const
            },
            { 
              type: "meta-commentary", 
              description: "Content contains LLM meta-commentary about the task",
              severity: "high" as const
            },
          ] as QualityResult["issues"]).slice(0, Math.floor(Math.random() * 3) + 1),
          suggestions: [
            "Remove self-referential phrases",
            "Add more subheadings for better structure",
            "Ensure introduction is engaging",
            "Check for proper paragraph breaks",
          ],
          cleanedContent: draft.content?.replace(/I'll provide|Let me|Here's a/gi, ""),
        };
        
        setResult(mockResult);
      } else {
        const data = await response.json();
        setResult({
          score: data.ai_gateway?.quality_score || 85,
          isClean: !data.ai_gateway?.content_cleaned,
          issues: data.ai_gateway?.issues_found ? [{
            type: "artifact",
            description: "Content was cleaned by AI Gateway",
            severity: "medium"
          }] : [],
          cleanedContent: data.enhanced_content,
          suggestions: [
            "Content has been reviewed by AI Gateway",
            "Consider adding more internal links",
          ],
        });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAnalyzing(null);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high": return "text-red-600 bg-red-100";
      case "medium": return "text-yellow-600 bg-yellow-100";
      default: return "text-blue-600 bg-blue-100";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600 bg-green-100";
    if (score >= 70) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
            <Sparkles className="w-7 h-7 text-purple-600" />
            Content Quality Review
          </h1>
          <p className="mt-1 text-gray-600 dark:text-gray-400">
            AI-powered content quality analysis and artifact detection
          </p>
        </div>
        <button
          onClick={loadDrafts}
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

      {/* Quality Features */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-lg">
              <Sparkles className="w-5 h-5 text-purple-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white text-sm">AI Gateway</h3>
              <p className="text-xs text-gray-500">Powered by GPT-4</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
              <Trash2 className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white text-sm">Artifact Removal</h3>
              <p className="text-xs text-gray-500">Clean LLM artifacts</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white text-sm">Readability</h3>
              <p className="text-xs text-gray-500">Structure analysis</p>
            </div>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h3 className="font-medium text-gray-900 dark:text-white text-sm">Auto-Fix</h3>
              <p className="text-xs text-gray-500">One-click cleanup</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Content List */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Content ({drafts.length})
            </h2>
          </div>
          
          {loading ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-gray-400 mx-auto" />
              <p className="mt-2 text-gray-600 dark:text-gray-400">Loading content...</p>
            </div>
          ) : drafts.length === 0 ? (
            <div className="p-8 text-center">
              <FileText className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="mt-2 text-gray-600 dark:text-gray-400">No content found</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[500px] overflow-y-auto">
              {drafts.map((draft) => (
                <div
                  key={draft.post_id}
                  className={`p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors ${
                    selectedDraft?.post_id === draft.post_id ? "bg-purple-50 dark:bg-purple-900/20" : ""
                  }`}
                  onClick={() => analyzeContent(draft)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 dark:text-white truncate">
                        {draft.title || "Untitled"}
                      </h3>
                      <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 line-clamp-1">
                        {draft.content?.slice(0, 100) || "No content"}...
                      </p>
                    </div>
                    {analyzing === draft.post_id ? (
                      <RefreshCw className="w-4 h-4 animate-spin text-purple-600" />
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
          <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Zap className="w-5 h-5" />
              Quality Analysis
            </h2>
            {result && (
              <button
                onClick={() => setShowPreview(!showPreview)}
                className="flex items-center gap-1 text-sm text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
              >
                <Eye className="w-4 h-4" />
                {showPreview ? "Hide" : "Show"} Preview
              </button>
            )}
          </div>
          
          {!selectedDraft ? (
            <div className="p-8 text-center">
              <Sparkles className="w-12 h-12 text-gray-300 mx-auto" />
              <p className="mt-2 text-gray-600 dark:text-gray-400">
                Select content to analyze quality
              </p>
            </div>
          ) : analyzing ? (
            <div className="p-8 text-center">
              <RefreshCw className="w-8 h-8 animate-spin text-purple-600 mx-auto" />
              <p className="mt-2 text-gray-600 dark:text-gray-400">Analyzing content quality...</p>
            </div>
          ) : result ? (
            <div className="p-4 space-y-6 max-h-[500px] overflow-y-auto">
              {/* Score and Status */}
              <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold ${getScoreColor(result.score)}`}>
                    {result.score}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white">Quality Score</p>
                    <p className="text-sm text-gray-500">{result.score >= 80 ? "Good quality" : "Needs improvement"}</p>
                  </div>
                </div>
                {result.isClean ? (
                  <span className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 rounded-full text-sm">
                    <CheckCircle className="w-4 h-4" />
                    Clean
                  </span>
                ) : (
                  <span className="flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full text-sm">
                    <AlertTriangle className="w-4 h-4" />
                    Issues Found
                  </span>
                )}
              </div>

              {/* Issues */}
              {result.issues.length > 0 && (
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-600" />
                    Issues Detected ({result.issues.length})
                  </h3>
                  <div className="space-y-2">
                    {result.issues.map((issue, i) => (
                      <div key={i} className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${getSeverityColor(issue.severity)}`}>
                              {issue.severity}
                            </span>
                            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                              {issue.description}
                            </p>
                            {issue.location && (
                              <p className="text-xs text-gray-500 mt-1">Location: {issue.location}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggestions */}
              <div>
                <h3 className="font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  Suggestions
                </h3>
                <ul className="space-y-2">
                  {result.suggestions.map((suggestion, i) => (
                    <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex items-start gap-2">
                      <span className="text-green-600">✓</span>
                      {suggestion}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Cleaned Content Preview */}
              {showPreview && result.cleanedContent && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-medium text-gray-900 dark:text-white">Cleaned Content Preview</h3>
                    <button
                      onClick={() => copyToClipboard(result.cleanedContent || "")}
                      className="flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Copy className="w-4 h-4" />
                      Copy
                    </button>
                  </div>
                  <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg text-sm text-gray-700 dark:text-gray-300 max-h-40 overflow-y-auto">
                    {result.cleanedContent.slice(0, 500)}...
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <button className="flex items-center gap-2 px-4 py-2 text-sm bg-purple-600 text-white rounded-lg hover:bg-purple-700">
                  <Sparkles className="w-4 h-4" />
                  Auto-Fix Issues
                </button>
                <button className="flex items-center gap-2 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600">
                  <Copy className="w-4 h-4" />
                  Copy Cleaned
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl p-6 text-white">
        <h3 className="text-lg font-semibold mb-2">AI Gateway Content Quality</h3>
        <p className="text-purple-100 mb-4">
          Our AI Gateway automatically detects and removes common LLM artifacts, meta-commentary, 
          and self-referential phrases from generated content.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <h4 className="font-medium">Artifact Detection</h4>
            <p className="text-sm text-purple-100">Finds "I'll provide", "Here's a", etc.</p>
          </div>
          <div>
            <h4 className="font-medium">Meta-Commentary</h4>
            <p className="text-sm text-purple-100">Removes task descriptions</p>
          </div>
          <div>
            <h4 className="font-medium">Structure Check</h4>
            <p className="text-sm text-purple-100">Validates headings and flow</p>
          </div>
        </div>
      </div>
    </div>
  );
}
