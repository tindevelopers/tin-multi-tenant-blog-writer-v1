"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  FolderOpen, 
  Plus,
  Eye,
  Pencil,
  Trash,
  Calendar,
  FileText,
  CheckCircle2,
  Clock,
  XCircle
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useBlogPostMutations } from '@/hooks/useBlogPosts';
import Alert from '@/components/ui/alert/Alert';

export default function PostsPage() {
  const router = useRouter();
  const { deletePost } = useBlogPostMutations();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [workflowSession, setWorkflowSession] = useState<any>(null);

  // Load posts from workflow session
  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true);
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          setError('Please log in to view your posts');
          return;
        }

        // Get user's org_id
        const { data: userData } = await supabase
          .from('users')
          .select('org_id')
          .eq('user_id', user.id)
          .single();

        if (!userData?.org_id) {
          setError('Organization not found');
          return;
        }

        // Load workflow session
        const sessionId = localStorage.getItem('workflow_session_id');
        if (sessionId) {
          const { data: session } = await supabase
            .from('workflow_sessions')
            .select('*')
            .eq('session_id', sessionId)
            .single();

          if (session) {
            setWorkflowSession(session);
          }
        }

        // Load blog posts for this organization
        const { data: postsData, error: postsError } = await supabase
          .from('blog_posts')
          .select('*')
          .eq('org_id', userData.org_id)
          .order('created_at', { ascending: false });

        if (postsError) throw postsError;

        setPosts(postsData || []);
      } catch (err: any) {
        console.error('Error loading posts:', err);
        setError(err.message || 'Failed to load posts');
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, []);

  // Handle delete
  const handleDelete = async (postId: string) => {
    if (!confirm('Are you sure you want to delete this post? This action cannot be undone.')) {
      return;
    }

    try {
      const success = await deletePost(postId);
      if (success) {
        setPosts(posts.filter(p => p.post_id !== postId));
      } else {
        setError('Failed to delete post');
      }
    } catch (err: any) {
      console.error('Error deleting post:', err);
      setError(err.message || 'Failed to delete post');
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'published':
        return <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400" />;
      case 'draft':
        return <FileText className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
      case 'scheduled':
        return <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
      default:
        return <XCircle className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'published':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'draft':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
              <FolderOpen className="w-6 h-6 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Your Blog Posts ({posts.length})
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Manage your saved blog posts and drafts
              </p>
            </div>
          </div>
          <Link
            href="/admin/workflow/editor"
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create New Post
          </Link>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6">
          <Alert
            variant="error"
            title="Error"
            message={error}
          />
        </div>
      )}

      {/* Empty State */}
      {posts.length === 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-12 text-center">
          <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
            No blog posts yet
          </h3>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            Start by creating content using the Content Editor to see your posts here.
          </p>
          <Link
            href="/admin/workflow/editor"
            className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Create Your First Post
          </Link>
        </div>
      )}

      {/* Posts Grid */}
      {posts.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {posts.map((post) => (
            <div
              key={post.post_id}
              className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2 line-clamp-2">
                    {post.title}
                  </h3>
                  {post.excerpt && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                      {post.excerpt}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 mb-4">
                <span className={`px-2 py-1 rounded-full text-xs font-medium flex items-center gap-1 ${getStatusColor(post.status)}`}>
                  {getStatusIcon(post.status)}
                  {post.status?.charAt(0).toUpperCase() + post.status?.slice(1)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm text-gray-600 dark:text-gray-400 mb-4">
                <div className="flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {new Date(post.created_at).toLocaleDateString()}
                </div>
                <div>
                  {post.content ? `${Math.ceil(post.content.length / 200)} min read` : '-'}
                </div>
              </div>

              <div className="flex items-center gap-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <Link
                  href={`/admin/drafts/view/${post.post_id}`}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors text-sm"
                >
                  <Eye className="w-4 h-4" />
                  View
                </Link>
                <Link
                  href={`/admin/drafts/edit/${post.post_id}`}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-100 dark:bg-blue-900/20 hover:bg-blue-200 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg transition-colors text-sm"
                >
                  <Pencil className="w-4 h-4" />
                  Edit
                </Link>
                <button
                  onClick={() => handleDelete(post.post_id)}
                  className="px-3 py-2 bg-red-100 dark:bg-red-900/20 hover:bg-red-200 dark:hover:bg-red-900/30 text-red-700 dark:text-red-300 rounded-lg transition-colors"
                >
                  <Trash className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

