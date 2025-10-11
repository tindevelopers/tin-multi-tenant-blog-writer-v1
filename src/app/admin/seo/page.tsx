import type { Metadata } from "next";
import React from "react";

export const metadata: Metadata = {
  title: "SEO Tools | Blog Writer | TailAdmin Template",
  description: "SEO optimization tools for improving your blog post rankings and visibility",
};

export default function SEOToolsPage() {
  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-700 rounded-xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">🔍 SEO Tools</h1>
              <p className="text-teal-100">
                Optimize your content for search engines and improve your blog&apos;s visibility
              </p>
          </div>
          <div className="hidden md:block">
            <div className="bg-white bg-opacity-20 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold">87</div>
              <div className="text-sm text-teal-100">SEO Score</div>
            </div>
          </div>
        </div>
      </div>

      {/* SEO Score Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Content SEO</h3>
            <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-green-600 dark:text-green-300">92</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Keyword Density</span>
              <span className="text-green-600 dark:text-green-400">Optimal</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Readability</span>
              <span className="text-green-600 dark:text-green-400">Good</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Meta Tags</span>
              <span className="text-green-600 dark:text-green-400">Complete</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Technical SEO</h3>
            <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-blue-600 dark:text-blue-300">78</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Page Speed</span>
              <span className="text-yellow-600 dark:text-yellow-400">Needs Work</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Mobile Friendly</span>
              <span className="text-green-600 dark:text-green-400">Good</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Schema Markup</span>
              <span className="text-green-600 dark:text-green-400">Complete</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Link Building</h3>
            <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
              <span className="text-sm font-bold text-purple-600 dark:text-purple-300">85</span>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Internal Links</span>
              <span className="text-green-600 dark:text-green-400">Good</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">External Links</span>
              <span className="text-green-600 dark:text-green-400">Optimal</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600 dark:text-gray-400">Link Quality</span>
              <span className="text-green-600 dark:text-green-400">High</span>
            </div>
          </div>
        </div>
      </div>

      {/* Keyword Research */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            Keyword Research
          </h2>
          <div className="flex gap-3">
            <input
              type="text"
              placeholder="Enter keyword..."
              className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg border-0 text-sm w-64"
            />
            <button className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors text-sm font-medium">
              Analyze
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-4">Keyword Suggestions</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">react tutorial</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Search Volume: 12,000</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Medium</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Difficulty</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">javascript basics</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Search Volume: 8,500</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Easy</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Difficulty</p>
                </div>
              </div>

              <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">web development</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Search Volume: 25,000</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Hard</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Difficulty</p>
                </div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-md font-semibold text-gray-900 dark:text-white mb-4">Content Optimization</h3>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-300 mb-2">Title Optimization</h4>
                <p className="text-xs text-blue-700 dark:text-blue-400 mb-2">Include your primary keyword in the title</p>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-green-700 dark:text-green-400">Optimized</span>
                </div>
              </div>

              <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                <h4 className="text-sm font-semibold text-green-900 dark:text-green-300 mb-2">Meta Description</h4>
                <p className="text-xs text-green-700 dark:text-green-400 mb-2">Keep between 150-160 characters</p>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-xs text-green-700 dark:text-green-400">Optimal Length</span>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <h4 className="text-sm font-semibold text-yellow-900 dark:text-yellow-300 mb-2">Header Structure</h4>
                <p className="text-xs text-yellow-700 dark:text-yellow-400 mb-2">Use H1, H2, H3 tags properly</p>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span className="text-xs text-yellow-700 dark:text-yellow-400">Needs Review</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SEO Tools */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Content Analysis
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Word Count</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">1,247 words</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Reading Time</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">5 minutes</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Keyword Density</span>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">2.1% (Optimal)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Readability Score</span>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">78 (Good)</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Technical SEO
          </h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Page Speed</span>
              <span className="text-sm font-medium text-yellow-600 dark:text-yellow-400">3.2s (Slow)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Mobile Friendly</span>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">Yes</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">SSL Certificate</span>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">Valid</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Schema Markup</span>
              <span className="text-sm font-medium text-green-600 dark:text-green-400">Present</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
