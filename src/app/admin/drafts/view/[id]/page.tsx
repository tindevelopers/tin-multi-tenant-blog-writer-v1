"use client";

import React from "react";
import { useRouter, useParams } from "next/navigation";
import { useBlogPost, useBlogPostMutations } from "@/hooks/useBlogPosts";
import { 
  ArrowLeftIcon,
  DocumentTextIcon,
  PencilIcon,
  ShareIcon,
  TrashIcon,
  EyeIcon
} from "@heroicons/react/24/outline";
import { useState } from "react";
import { Modal } from "@/components/ui/modal/index";

export default function ViewDraftPage() {
  const router = useRouter();
  const params = useParams();
  const draftId = params.id as string;
  const [showPreview, setShowPreview] = useState(false);
  
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
              onClick={() => setShowPreview(true)}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <EyeIcon className="w-4 h-4 mr-2" />
              Preview HTML
            </button>
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

      {/* Draft Content - Rich HTML Preview */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        {/* Website-like header with featured image if available */}
        {(() => {
          // Check for featured image in metadata or content
          const featuredImageUrl = draft.metadata && typeof draft.metadata === 'object' && 'featured_image' in draft.metadata 
            ? String(draft.metadata.featured_image) 
            : null;
          
          // Also check if image is embedded in content
          const contentImageMatch = draft.content?.match(/<figure class="featured-image">.*?<img[^>]+src="([^"]+)"[^>]*>/s);
          const embeddedImageUrl = contentImageMatch ? contentImageMatch[1] : null;
          
          const imageUrl = featuredImageUrl || embeddedImageUrl;
          
          return imageUrl ? (
            <div className="w-full h-64 md:h-96 bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <img 
                src={imageUrl} 
                alt={draft.title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : null;
        })()}
        
        <article className="prose prose-lg dark:prose-invert max-w-none 
          prose-headings:text-gray-900 dark:prose-headings:text-white prose-headings:font-bold
          prose-h1:text-4xl prose-h1:mb-6 prose-h1:mt-8 prose-h1:leading-tight
          prose-h2:text-3xl prose-h2:mb-4 prose-h2:mt-8 prose-h2:leading-tight
          prose-h3:text-2xl prose-h3:mb-3 prose-h3:mt-6 prose-h3:leading-tight
          prose-h4:text-xl prose-h4:mb-2 prose-h4:mt-4
          prose-p:text-gray-700 dark:prose-p:text-gray-300 prose-p:leading-relaxed prose-p:mb-4 prose-p:text-base
          prose-a:text-blue-600 dark:prose-a:text-blue-400 prose-a:no-underline hover:prose-a:underline prose-a:font-medium
          prose-strong:text-gray-900 dark:prose-strong:text-white prose-strong:font-bold
          prose-ul:text-gray-700 dark:prose-ul:text-gray-300 prose-ul:my-4 prose-ul:pl-6
          prose-ol:text-gray-700 dark:prose-ol:text-gray-300 prose-ol:my-4 prose-ol:pl-6
          prose-li:text-gray-700 dark:prose-li:text-gray-300 prose-li:my-2 prose-li:leading-relaxed
          prose-blockquote:border-l-4 prose-blockquote:border-blue-500 prose-blockquote:pl-4 prose-blockquote:italic prose-blockquote:text-gray-600 dark:prose-blockquote:text-gray-400 prose-blockquote:my-6
          prose-code:text-blue-600 dark:prose-code:text-blue-400 prose-code:bg-gray-100 dark:prose-code:bg-gray-800 prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-mono
          prose-pre:bg-gray-100 dark:prose-pre:bg-gray-900 prose-pre:rounded-lg prose-pre:p-4 prose-pre:overflow-x-auto prose-pre:my-6
          prose-img:rounded-lg prose-img:shadow-xl prose-img:my-8 prose-img:w-full prose-img:h-auto prose-img:object-contain
          prose-figure:my-8 prose-figure:mx-auto
          prose-figcaption:text-sm prose-figcaption:text-gray-500 dark:prose-figcaption:text-gray-400 prose-figcaption:text-center prose-figcaption:mt-2
          prose-hr:border-gray-300 dark:prose-hr:border-gray-700 prose-hr:my-8
          prose-table:w-full prose-table:my-6 prose-table:border-collapse
          prose-th:border prose-th:border-gray-300 dark:prose-th:border-gray-700 prose-th:bg-gray-50 dark:prose-th:bg-gray-800 prose-th:px-4 prose-th:py-2 prose-th:text-left prose-th:font-semibold
          prose-td:border prose-td:border-gray-300 dark:prose-td:border-gray-700 prose-td:px-4 prose-td:py-2
          prose-video:w-full prose-video:rounded-lg prose-video:my-8
          prose-iframe:w-full prose-iframe:rounded-lg prose-iframe:my-8
          [&>*]:max-w-none
          p-6 lg:p-12">
          <div 
            className="blog-content"
            dangerouslySetInnerHTML={{ 
              __html: draft.content 
                ? (() => {
                    let html = String(draft.content);
                    
                    // If content is already HTML, clean it up
                    if (html.includes('<') && html.includes('>')) {
                      // Ensure all images have proper styling
                      html = html.replace(/<img([^>]*)>/gi, (match, attrs) => {
                        // Check if class already exists
                        if (!attrs.includes('class=')) {
                          return `<img${attrs} class="w-full h-auto rounded-lg shadow-xl my-8 object-contain" />`;
                        } else if (!attrs.includes('rounded-lg')) {
                          return match.replace(/class="([^"]*)"/, 'class="$1 rounded-lg shadow-xl my-8"');
                        }
                        return match;
                      });
                      
                      // Ensure all links open in new tab
                      html = html.replace(/<a([^>]*)>/gi, (match, attrs) => {
                        if (!attrs.includes('target=')) {
                          return `<a${attrs} target="_blank" rel="noopener noreferrer">`;
                        }
                        return match;
                      });
                      
                      // Ensure videos are responsive
                      html = html.replace(/<video([^>]*)>/gi, (match, attrs) => {
                        if (!attrs.includes('class=')) {
                          return `<video${attrs} class="w-full rounded-lg my-8" controls>`;
                        }
                        return match;
                      });
                      
                      // Ensure iframes are responsive
                      html = html.replace(/<iframe([^>]*)>/gi, (match, attrs) => {
                        if (!attrs.includes('class=')) {
                          return `<iframe${attrs} class="w-full rounded-lg my-8" allowfullscreen>`;
                        }
                        return match;
                      });
                      
                      return html;
                    }
                    
                    // Convert markdown-like formatting to HTML
                    // Split by double line breaks first to preserve paragraphs
                    const paragraphs = html.split(/\n\n+/);
                    
                    html = paragraphs.map(para => {
                      let processed = para.trim();
                      if (!processed) return '';
                      
                      // Convert headers (must be at start of line)
                      processed = processed
                        .replace(/^#### (.*$)/gim, '<h4>$1</h4>')
                        .replace(/^### (.*$)/gim, '<h3>$1</h3>')
                        .replace(/^## (.*$)/gim, '<h2>$1</h2>')
                        .replace(/^# (.*$)/gim, '<h1>$1</h1>');
                      
                      // Convert blockquotes
                      if (processed.startsWith('> ')) {
                        processed = processed.replace(/^> (.*)$/gm, '<blockquote>$1</blockquote>');
                      }
                      
                      // Convert code blocks
                      if (processed.startsWith('```')) {
                        const lines = processed.split('\n');
                        const lang = lines[0].replace('```', '').trim();
                        const code = lines.slice(1, -1).join('\n');
                        return `<pre><code class="language-${lang}">${code}</code></pre>`;
                      }
                      
                      // Convert inline code
                      processed = processed.replace(/`([^`]+)`/g, '<code>$1</code>');
                      
                      // Convert bold and italic (order matters - bold first)
                      processed = processed
                        .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/__(.*?)__/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                        .replace(/_(.*?)_/g, '<em>$1</em>');
                      
                      // Convert links [text](url)
                      processed = processed.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
                      
                      // Convert images ![alt](url)
                      processed = processed.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="$2" alt="$1" class="w-full h-auto rounded-lg shadow-xl my-8 object-contain" />');
                      
                      // Convert horizontal rules
                      processed = processed.replace(/^---$/gm, '<hr />');
                      
                      // Convert lists (handle both ordered and unordered)
                      const listItems = processed.match(/^[\*\-\+] (.+)$/gm);
                      if (listItems && listItems.length > 0) {
                        const items = listItems.map(item => item.replace(/^[\*\-\+] /, ''));
                        processed = processed.replace(/^[\*\-\+] (.+)$/gm, '').trim();
                        processed += '<ul>' + items.map(item => `<li>${item}</li>`).join('') + '</ul>';
                      }
                      
                      const orderedListItems = processed.match(/^\d+\. (.+)$/gm);
                      if (orderedListItems && orderedListItems.length > 0) {
                        const items = orderedListItems.map(item => item.replace(/^\d+\. /, ''));
                        processed = processed.replace(/^\d+\. (.+)$/gm, '').trim();
                        processed += '<ol>' + items.map(item => `<li>${item}</li>`).join('') + '</ol>';
                      }
                      
                      // Wrap in paragraph if it's not already a block element
                      if (processed && !processed.match(/^<(h[1-6]|ul|ol|pre|blockquote|hr|div|figure)/i)) {
                        processed = `<p>${processed}</p>`;
                      }
                      
                      return processed;
                    }).filter(p => p).join('\n');
                    
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

      {/* Webflow HTML Preview Modal */}
      <Modal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        isFullscreen={true}
      >
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Webflow HTML Preview
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Copy this HTML to paste into Webflow&apos;s rich text editor
              </p>
            </div>
            <button
              onClick={() => setShowPreview(false)}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          
          <div className="flex-1 overflow-auto p-6">
            <div className="mb-4 flex items-center gap-3">
              <button
                onClick={() => {
                  const htmlContent = generateWebflowHTML();
                  navigator.clipboard.writeText(htmlContent);
                  alert('HTML copied to clipboard!');
                }}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Copy HTML
              </button>
            </div>
            
            <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4 mb-6">
              <pre className="text-xs text-gray-800 dark:text-gray-200 overflow-x-auto whitespace-pre-wrap break-words">
                {generateWebflowHTML()}
              </pre>
            </div>
            
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Preview
              </h3>
              <div 
                className="prose prose-lg max-w-none"
                dangerouslySetInnerHTML={{ __html: generateWebflowHTML() }}
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );

  function generateWebflowHTML(): string {
    if (!draft?.content) return '';
    
    let html = String(draft.content);
    
    // Extract featured image if exists
    const featuredImageUrl = draft.metadata && typeof draft.metadata === 'object' && 'featured_image' in draft.metadata 
      ? String(draft.metadata.featured_image) 
      : null;
    
    const contentImageMatch = html.match(/<figure class="featured-image">.*?<img[^>]+src="([^"]+)"[^>]*>/s);
    const embeddedImageUrl = contentImageMatch ? contentImageMatch[1] : null;
    
    const imageUrl = featuredImageUrl || embeddedImageUrl;
    
    // If HTML already contains image, use it; otherwise prepend featured image
    if (imageUrl && !html.includes(imageUrl)) {
      const imageHtml = `<figure class="featured-image"><img src="${imageUrl}" alt="${draft.title}" style="width: 100%; height: auto; border-radius: 8px; margin: 2rem 0;" /></figure>`;
      
      if (html.includes('</p>')) {
        html = html.replace('</p>', `</p>${imageHtml}`, 1);
      } else {
        html = imageHtml + html;
      }
    }
    
    // Clean up HTML for Webflow compatibility
    // Remove any inline styles that might conflict
    html = html.replace(/style="[^"]*"/gi, '');
    
    // Ensure proper semantic HTML
    html = html.replace(/<figure class="featured-image">/g, '<figure>');
    
    return html;
  }
}
