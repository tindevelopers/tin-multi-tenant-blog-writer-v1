"use client";

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import TextAlign from '@tiptap/extension-text-align';
import { 
  Bold, 
  Italic, 
  Strikethrough,
  Code,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Undo,
  Redo,
  Link as LinkIcon,
  Image as ImageIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify
} from 'lucide-react';
import { useState, useCallback, useEffect } from 'react';
import { logger } from '@/utils/logger';

interface TipTapEditorProps {
  content: string;
  onChange: (content: string) => void;
  placeholder?: string;
  onImageUpload?: (file: File) => Promise<string | null>;
  editable?: boolean;
  className?: string;
}

export default function TipTapEditor({
  content,
  onChange,
  placeholder = 'Start writing your blog post...',
  onImageUpload,
  editable = true,
  className = ''
}: TipTapEditorProps) {
  const [uploadingImage, setUploadingImage] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Image.configure({
        inline: true,
        allowBase64: true,
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-blue-600 hover:text-blue-800 underline',
        },
      }),
      Placeholder.configure({
        placeholder,
      }),
      CharacterCount,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
    ],
    content,
    editable,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-lg dark:prose-invert max-w-none focus:outline-none px-4 py-3',
      },
    },
  });

  // Sync content when it changes externally
  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content, editor]);

  const handleImageUpload = useCallback(async () => {
    if (!editor || !onImageUpload) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setUploadingImage(true);
      try {
        const imageUrl = await onImageUpload(file);
        if (imageUrl) {
          editor.chain().focus().setImage({ src: imageUrl }).run();
        } else {
          alert('Failed to upload image. Please try again.');
        }
      } catch (error) {
        logger.error('Error uploading image:', error);
        alert('Error uploading image. Please try again.');
      } finally {
        setUploadingImage(false);
      }
    };
    input.click();
  }, [editor, onImageUpload]);

  const setLink = useCallback(() => {
    if (!editor) return;

    const previousUrl = editor.getAttributes('link').href;
    const url = window.prompt('URL', previousUrl);

    if (url === null) {
      return;
    }

    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }, [editor]);

  if (!editor) {
    return (
      <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 bg-white dark:bg-gray-800">
        <div className="animate-pulse text-gray-400">Loading editor...</div>
      </div>
    );
  }

  return (
    <div className={`border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 flex flex-col h-full ${className}`}>
      {/* Toolbar - Fixed at top */}
      {editable && (
        <div className="border-b border-gray-300 dark:border-gray-600 p-2 flex flex-wrap items-center gap-1 bg-gray-50 dark:bg-gray-900 flex-shrink-0 sticky top-0 z-10">
          {/* Text Formatting */}
          <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2 mr-2">
            <button
              onClick={() => editor.chain().focus().toggleBold().run()}
              disabled={!editor.can().chain().focus().toggleBold().run()}
              className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                editor.isActive('bold') ? 'bg-gray-200 dark:bg-gray-700' : ''
              }`}
              title="Bold"
            >
              <Bold className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleItalic().run()}
              disabled={!editor.can().chain().focus().toggleItalic().run()}
              className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                editor.isActive('italic') ? 'bg-gray-200 dark:bg-gray-700' : ''
              }`}
              title="Italic"
            >
              <Italic className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleStrike().run()}
              disabled={!editor.can().chain().focus().toggleStrike().run()}
              className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                editor.isActive('strike') ? 'bg-gray-200 dark:bg-gray-700' : ''
              }`}
              title="Strikethrough"
            >
              <Strikethrough className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleCode().run()}
              disabled={!editor.can().chain().focus().toggleCode().run()}
              className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                editor.isActive('code') ? 'bg-gray-200 dark:bg-gray-700' : ''
              }`}
              title="Code"
            >
              <Code className="w-4 h-4" />
            </button>
          </div>

          {/* Headings */}
          <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2 mr-2">
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                editor.isActive('heading', { level: 1 }) ? 'bg-gray-200 dark:bg-gray-700' : ''
              }`}
              title="Heading 1"
            >
              <Heading1 className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                editor.isActive('heading', { level: 2 }) ? 'bg-gray-200 dark:bg-gray-700' : ''
              }`}
              title="Heading 2"
            >
              <Heading2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                editor.isActive('heading', { level: 3 }) ? 'bg-gray-200 dark:bg-gray-700' : ''
              }`}
              title="Heading 3"
            >
              <Heading3 className="w-4 h-4" />
            </button>
          </div>

          {/* Lists */}
          <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2 mr-2">
            <button
              onClick={() => editor.chain().focus().toggleBulletList().run()}
              className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                editor.isActive('bulletList') ? 'bg-gray-200 dark:bg-gray-700' : ''
              }`}
              title="Bullet List"
            >
              <List className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleOrderedList().run()}
              className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                editor.isActive('orderedList') ? 'bg-gray-200 dark:bg-gray-700' : ''
              }`}
              title="Numbered List"
            >
              <ListOrdered className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().toggleBlockquote().run()}
              className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                editor.isActive('blockquote') ? 'bg-gray-200 dark:bg-gray-700' : ''
              }`}
              title="Quote"
            >
              <Quote className="w-4 h-4" />
            </button>
          </div>

          {/* Alignment */}
          <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2 mr-2">
            <button
              onClick={() => editor.chain().focus().setTextAlign('left').run()}
              className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                editor.isActive({ textAlign: 'left' }) ? 'bg-gray-200 dark:bg-gray-700' : ''
              }`}
              title="Align Left"
            >
              <AlignLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('center').run()}
              className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                editor.isActive({ textAlign: 'center' }) ? 'bg-gray-200 dark:bg-gray-700' : ''
              }`}
              title="Align Center"
            >
              <AlignCenter className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('right').run()}
              className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                editor.isActive({ textAlign: 'right' }) ? 'bg-gray-200 dark:bg-gray-700' : ''
              }`}
              title="Align Right"
            >
              <AlignRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().setTextAlign('justify').run()}
              className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                editor.isActive({ textAlign: 'justify' }) ? 'bg-gray-200 dark:bg-gray-700' : ''
              }`}
              title="Justify"
            >
              <AlignJustify className="w-4 h-4" />
            </button>
          </div>

          {/* Media */}
          <div className="flex items-center gap-1 border-r border-gray-300 dark:border-gray-600 pr-2 mr-2">
            <button
              onClick={setLink}
              className={`p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors ${
                editor.isActive('link') ? 'bg-gray-200 dark:bg-gray-700' : ''
              }`}
              title="Add Link"
            >
              <LinkIcon className="w-4 h-4" />
            </button>
            {onImageUpload && (
              <button
                onClick={handleImageUpload}
                disabled={uploadingImage}
                className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                title="Insert Image"
              >
                {uploadingImage ? (
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <ImageIcon className="w-4 h-4" />
                )}
              </button>
            )}
          </div>

          {/* Undo/Redo */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => editor.chain().focus().undo().run()}
              disabled={!editor.can().chain().focus().undo().run()}
              className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Undo"
            >
              <Undo className="w-4 h-4" />
            </button>
            <button
              onClick={() => editor.chain().focus().redo().run()}
              disabled={!editor.can().chain().focus().redo().run()}
              className="p-2 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              title="Redo"
            >
              <Redo className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Editor Content - Scrollable */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="min-h-[400px]">
          <EditorContent editor={editor} />
        </div>
      </div>

      {/* Character Count - Fixed at bottom */}
      {editable && editor.storage.characterCount && (
        <div className="border-t border-gray-300 dark:border-gray-600 px-4 py-2 text-sm text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 flex-shrink-0">
          {editor.storage.characterCount.characters()} characters • {editor.storage.characterCount.words()} words
        </div>
      )}
    </div>
  );
}

