"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { useBlogPost, useBlogPostMutations } from "@/hooks/useBlogPosts";
import { 
  ArrowLeftIcon,
  DocumentTextIcon,
  PencilIcon,
  ShareIcon,
  TrashIcon
} from "@heroicons/react/24/outline";

export default function ViewDraftPage() {
  const router = useRouter();
  const params = useParams();
  const draftId = params.id as string;
  
  const { post: draft, loading, error } = useBlogPost(draftId);
  const { deletePost } = useBlogPostMutations();

  const handleEdit = () => {
    router.push(`/admin/drafts/edit/${draftId}`);
  };

  const handleShare = () => {
    // TODO: Implement share functionality
    alert('Share functionality coming soon!');
  };

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this draft? This action cannot be undone.')) {
      try {
        const success = await deletePost(draftId);
        if (success) {
          alert('Draft deleted successfully!');
          router.push('/admin/drafts');
        } else {
          alert('Failed to delete draft. Please try again.');
        }
      } catch (err) {
        console.error('Error deleting draft:', err);
        alert('Error deleting draft. Please try again.');
      }
    }
  };

  if (loading) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading draft...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Error
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                {error}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!draft) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="text-center py-12">
          <DocumentTextIcon className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Draft Not Found
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            The draft you&apos;re looking for doesn&apos;t exist or has been deleted.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-4 transition-colors"
        >
          <ArrowLeftIcon className="w-4 h-4" />
          Back to Drafts
        </button>
        
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {draft.title}
            </h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">
              {draft.excerpt || 'No excerpt available'}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={handleEdit}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PencilIcon className="w-4 h-4 mr-2" />
              Edit
            </button>
            <button
              onClick={handleShare}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <ShareIcon className="w-4 h-4 mr-2" />
              Share
            </button>
            <button
              onClick={handleDelete}
              className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
            >
              <TrashIcon className="w-4 h-4 mr-2" />
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* Draft Content */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 lg:p-12">
        <article className="prose prose-lg dark:prose-invert max-w-none 
          prose-headings:text-gray-900 dark:prose-headings:text-white
          prose-p:text-gray-700 dark:prose-p:text-gray-300
          prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline
          prose-strong:text-gray-900 dark:prose-strong:text-white
          prose-ul:text-gray-700 dark:prose-ul:text-gray-300
          prose-ol:text-gray-700 dark:prose-ol:text-gray-300
          prose-li:text-gray-700 dark:prose-li:text-gray-300
          prose-blockquote:border-l-blue-500 prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400
          prose-code:text-blue-600 dark:prose-code:text-blue-400
          prose-pre:bg-gray-100 dark:prose-pre:bg-gray-900
          prose-img:rounded-lg prose-img:shadow-lg prose-img:my-8
          prose-figure:my-8
          prose-hr:border-gray-300 dark:prose-hr:border-gray-700">
          <div 
            dangerouslySetInnerHTML={{ 
              __html: draft.content 
                ? (() => {
                    // If content is already HTML, use it directly
                    if (draft.content.includes('<') && draft.content.includes('>')) {
                      return draft.content;
                    }
                    // Otherwise, convert markdown-like formatting to HTML
                    let html = draft.content
                      // Convert line breaks
                      .replace(/\n\n/g, '</p><p>')
                      .replace(/\n/g, '<br>')
                      // Convert headers
                      .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                      .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                      .replace(/^# (.*$)/gim, '<h1>$1</h1>')
                      // Convert bold
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/__(.*?)__/g, '<strong>$1</strong>')
                      // Convert italic
                      .replace(/\*(.*?)\*/g, '<em>$1</em>')
                      .replace(/_(.*?)_/g, '<em>$1</em>')
                      // Convert links [text](url)
                      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>')
                      // Convert images ![alt](url)
                      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="w-full h-auto rounded-lg shadow-lg my-8" />')
                      // Convert lists
                      .replace(/^\* (.+)$/gim, '<li>$1</li>')
                      .replace(/^- (.+)$/gim, '<li>$1</li>')
                      .replace(/^\d+\. (.+)$/gim, '<li>$1</li>')
                      // Wrap in paragraphs if not already wrapped
                      .split('</p><p>').map((chunk, i) => {
                        if (i === 0 && !chunk.startsWith('<')) {
                          return '<p>' + chunk;
                        }
                        if (!chunk.startsWith('<') && !chunk.includes('<')) {
                          return '<p>' + chunk + '</p>';
                        }
                        return chunk;
                      }).join('</p><p>');
                    
                    // Wrap list items in ul/ol tags
                    html = html.replace(/(<li>.*<\/li>)/s, (match) => {
                      if (match.match(/^\d+\./)) {
                        return '<ol>' + match + '</ol>';
                      }
                      return '<ul>' + match + '</ul>';
                    });
                    
                    // Ensure proper paragraph wrapping
                    if (!html.startsWith('<')) {
                      html = '<p>' + html;
                    }
                    if (!html.endsWith('>')) {
                      html = html + '</p>';
                    }
                    
                    return html;
                  })()
                : '<p class="text-gray-500 italic">No content available</p>'
            }}
          />
        </article>
      </div>

      {/* Metadata */}
      <div className="mt-8 bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
          Draft Information
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Status:</span>
            <span className={`ml-2 px-2 py-1 rounded-full text-xs font-semibold ${
              draft.status === 'draft' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
              draft.status === 'published' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
              draft.status === 'scheduled' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200' :
              'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
            }`}>
              {draft.status?.charAt(0).toUpperCase() + draft.status?.slice(1)}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Author:</span>
            <span className="ml-2 text-gray-900 dark:text-white">
              {draft.created_by || 'Unknown'}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Created:</span>
            <span className="ml-2 text-gray-900 dark:text-white">
              {new Date(draft.created_at).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Last Modified:</span>
            <span className="ml-2 text-gray-900 dark:text-white">
              {new Date(draft.updated_at || draft.created_at).toLocaleDateString()}
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Word Count:</span>
            <span className="ml-2 text-gray-900 dark:text-white">
              {draft.content ? draft.content.length.toLocaleString() : 0} words
            </span>
          </div>
          <div>
            <span className="font-medium text-gray-700 dark:text-gray-300">Read Time:</span>
            <span className="ml-2 text-gray-900 dark:text-white">
              {Math.ceil((draft.content ? draft.content.length : 0) / 200)} min read
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
