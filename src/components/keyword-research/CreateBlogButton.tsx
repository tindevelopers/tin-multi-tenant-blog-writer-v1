"use client";

import React from 'react';
import { FileText, ArrowRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface CreateBlogButtonProps {
  keyword: string;
  searchType?: string;
  niche?: string;
  keywords?: string[];
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
}

export function CreateBlogButton({
  keyword,
  searchType = 'general',
  niche,
  keywords = [],
  className = '',
  variant = 'default',
}: CreateBlogButtonProps) {
  const router = useRouter();

  const handleCreateBlog = () => {
    // Navigate to blog creation page with pre-filled data
    const params = new URLSearchParams({
      keyword: keyword,
      search_type: searchType,
      ...(niche && { niche }),
      ...(keywords.length > 0 && { keywords: keywords.join(',') }),
    });

    router.push(`/admin/drafts/new?${params.toString()}`);
  };

  const baseClasses = "inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition-colors";
  
  const variantClasses = {
    default: "text-white bg-brand-500 hover:bg-brand-600",
    outline: "text-brand-600 dark:text-brand-400 border border-brand-500 dark:border-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20",
    ghost: "text-brand-600 dark:text-brand-400 hover:bg-brand-50 dark:hover:bg-brand-900/20",
  };

  return (
    <button
      onClick={handleCreateBlog}
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      <FileText className="h-4 w-4" />
      <span>Create Blog</span>
      <ArrowRight className="h-4 w-4" />
    </button>
  );
}

